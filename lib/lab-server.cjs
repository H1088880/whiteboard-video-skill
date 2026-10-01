#!/usr/bin/env node
// 渲染实验室：参数面板 + 真实渲染引擎秒级预览。
// 工作台只管「写稿」，调效果以前要跑完整出片才知道好坏；这一页把节奏/字幕参数做成旋钮，
// 拖动即时看到某一时刻的真实画面（复用 lib/render.html，与正式出片同一条链路）。
// 用法：bash bin/wb lab [端口]  → 打开 http://127.0.0.1:8791
const fs = require('fs');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const SKILL = path.join(__dirname, '..');

function loadCfg() {
  delete require.cache[require.resolve('./paths.cjs')];
  return require('./paths.cjs');
}
let { cfg, projectPaths } = loadCfg();
let { cuesForScene } = require('./captions.cjs');

const PORT = Number(process.argv[2] || 8791);
const LEAD = () => cfg.render.leadSeconds, HOLD = () => cfg.render.holdSeconds;

// ---------- 场景装载（与 render.js 同算法） ----------
function drawing(P, name) {
  const md = path.join(P.scenes, `${name}.excalidraw.md`);
  const txt = fs.readFileSync(md, 'utf8');
  const m = txt.match(/```json\s*([\s\S]*?)```/);
  let doc;
  if (m) doc = JSON.parse(m[1]);
  else {
    const c = txt.match(/```compressed-json\s*([\s\S]*?)```/);
    if (!c) throw new Error(`${name}.excalidraw.md 里没找到 Drawing JSON`);
    const { decompressFromBase64 } = require('lz-string');
    doc = JSON.parse(decompressFromBase64(c[1].replace(/\s+/g, '')));
  }
  doc.files = doc.files || {};
  const emb = txt.match(/## Embedded Files\n([\s\S]*?)\n\n/);
  if (emb) for (const line of emb[1].split('\n')) {
    const mm = line.match(/^(\S+):\s*\[\[([^\]|]+)/); if (!mm) continue;
    const fname = path.basename(mm[2]);
    const cand = [path.join(P.scenes, fname), path.join(P.assets, fname)].find((f) => fs.existsSync(f));
    if (cand) doc.files[mm[1]] = { id: mm[1], mimeType: 'image/png', dataURL: 'data:image/png;base64,' + fs.readFileSync(cand).toString('base64') };
  }
  return doc;
}
function brandPayload() {
  const B = cfg.brand || {};
  const b = { name: B.name || '', accent: B.accent, ink: B.ink, watermark: { enabled: false }, logo: '' };
  if (B.logo) {
    const f = path.join(SKILL, B.logo);
    if (fs.existsSync(f)) { const buf = fs.readFileSync(f); b.logo = 'data:image/png;base64,' + buf.toString('base64'); b.logoAspect = buf.readUInt32BE(16) / buf.readUInt32BE(20); }
  }
  return b;
}
// 片尾卡也做进预览（品牌色调/CTA 胶囊在这里调）
function endCardDoc() {
  const { brandEndCard } = require('./scene-dsl.js');
  const B = cfg.brand || {};
  const secs = (B.endCard && B.endCard.seconds) || 5.5, hold = (B.endCard && B.endCard.holdSeconds == null) ? 1.5 : B.endCard.holdSeconds;
  const doc = brandEndCard(B).toRenderDoc();
  // 卡上是几拍（slogan 拍 + CTA 拍）就平分绘图窗口，工作台预览与成片一致
  const n = Array.isArray(doc.beatOf) && doc.beatOf.length ? Math.max(...doc.beatOf) + 1 : 1;
  const draw = Math.max(1, secs - LEAD() - HOLD() - hold);
  const beats = Array.from({ length: n }, (_, i) => [LEAD() + (draw * i) / n, LEAD() + (draw * (i + 1)) / n]);
  return { doc, beats, total: secs };
}
function sceneBundle(P, name, over) {
  const script = JSON.parse(fs.readFileSync(P.script, 'utf8'));
  if (name === '99-brand') {
    const { doc, beats, total } = endCardDoc();
    return { doc, beatOf: doc.beatOf, beats, total, cues: [], info: { duration: 1, segmentStarts: [0] } };
  }
  const sc = script.find((x) => x.name === name);
  const info = JSON.parse(fs.readFileSync(path.join(P.audio, `${name}.json`), 'utf8'));
  const st = info.segmentStarts, d = info.duration;
  const beats = st.map((t, i) => [t + LEAD(), (i + 1 < st.length ? st[i + 1] : d) + LEAD()]);
  const cues = cfg.captions.enabled && info.wordList ? cuesForScene(info, over) : [];
  // beatOf 来自 script.json（scenes.js 的 beat 划分），不在 drawing 里
  return { doc: drawing(P, name), beatOf: sc.beatOf, beats, total: d + LEAD() + HOLD(), cues, info };
}

// ---------- 浏览器（单例 page，改参数重装场景，只改时间就只 seek） ----------
let browser = null, page = null, curKey = '';
async function ensurePage() {
  if (page) return page;
  browser = await chromium.launch({ args: ['--disable-gpu'] });
  page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'render.html'));
  await page.evaluate(() => document.fonts.ready);
  return page;
}
async function preview({ project, scene, t, over }) {
  const pg = await ensurePage();
  const P = projectPaths(path.join(SKILL, 'episodes', project));
  const { doc, beatOf, beats, total, cues } = sceneBundle(P, scene, over || {});
  const pen = Object.assign({}, cfg.render.pen, (over && over.pen) || {}, { color: (cfg.brand && cfg.brand.pen && cfg.brand.pen.color) || cfg.render.pen.color });
  const key = [project, scene, JSON.stringify(over || {})].join('|');
  if (key !== curKey) {
    await pg.evaluate(({ w, h }) => window.setCanvas(w, h), { w: 1920, h: 1080 });
    await pg.evaluate((o) => window.setPen(o), pen);
    await pg.evaluate(({ els, bo, bt, files, total, cues }) => window.loadScene(els, bo, bt, files, total, cues), { els: doc.elements, bo: beatOf, bt: beats, files: doc.files || {}, total, cues });
    await pg.evaluate(({ brand }) => window.setBrand(brand), { brand: scene === '99-brand' ? null : brandPayload() });
    await pg.evaluate(({ cues, style }) => window.setCaptions(cues, style), { cues, style: cfg.captions });
    await pg.evaluate(() => window.imagesReady());
    curKey = key;
  }
  await pg.evaluate((t) => window.seek(t), t);
  return await pg.screenshot({ type: 'jpeg', quality: 88 });
}
// 时序摘要：该场景每段「旁白窗口 / 绘制区间 / 逐条字幕画完没」
async function timingOf({ project, scene, over }) {
  const pg = await ensurePage();
  const P = projectPaths(path.join(SKILL, 'episodes', project));
  const { doc, beatOf, beats, total, cues } = sceneBundle(P, scene, over || {});
  const pen = Object.assign({}, cfg.render.pen, (over && over.pen) || {});
  await pg.evaluate(({ w, h }) => window.setCanvas(w, h), { w: 1920, h: 1080 });
  await pg.evaluate((o) => window.setPen(o), pen);
  await pg.evaluate(({ els, bo, bt, files, total, cues }) => window.loadScene(els, bo, bt, files, total, cues), { els: doc.elements, bo: beatOf, bt: beats, files: doc.files || {}, total, cues });
  curKey = '';
  const items = await pg.evaluate(() => (typeof items === 'undefined' ? [] : items).map((x) => ({ start: x.start, end: x.end })));
  const lines = [];
  for (let k = 0; k < beats.length; k++) {
    const w = beats[k];
    const list = items.map((it, i) => ({ ...it, bi: beatOf[i] })).filter((x) => x.bi === k);
    if (!list.length) continue;
    const s = Math.min(...list.map((x) => x.start)), e = Math.max(...list.map((x) => x.end));
    const pct = ((e - w[0]) / (w[1] - w[0] || 1)) * 100;
    lines.push(`beat${k} 旁白 ${w[0].toFixed(2)}-${w[1].toFixed(2)} | 绘制 ${s.toFixed(2)}→${e.toFixed(2)} = 画完于 ${pct.toFixed(0)}%`);
    const cs = cues.filter((c) => c.start >= w[0] - 0.05 && c.start < w[1] + 0.05);
    if (cs.length >= 2) for (const c of cs) {
      const late = list.filter((x) => x.end > c.end - 0.05).length;
      lines.push(`   字幕 ${c.start.toFixed(2)}-${c.end.toFixed(2)} 「${c.text}」 ${late ? `⚠ 句末还有 ${late} 笔没画完` : '✓ 已画完'}`);
    }
  }
  return lines.join('\n');
}
// ---------- 写回 config.json（只改指定键，其余原样） ----------
function applyOver(over) {
  const f = path.join(SKILL, 'config.json');
  const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const k of Object.keys((over && over.pen) || {})) { raw.render.pen[k] = over.pen[k]; }
  for (const k of Object.keys((over && over.captions) || {})) { raw.captions[k] = over.captions[k]; }
  fs.writeFileSync(f, JSON.stringify(raw, null, 2) + '\n', 'utf8');
  ({ cfg, projectPaths } = loadCfg());
  delete require.cache[require.resolve('./captions.cjs')];
  ({ cuesForScene } = require('./captions.cjs'));
  curKey = '';
  return true;
}
// ---------- 重渲（后台跑 wb render + mix） ----------
const JOBS = {}; let seq = 0;
function runRender(project) {
  const id = String(++seq);
  JOBS[id] = { status: 'running', log: '' };
  const args = ['bin/wb', 'render', project];
  const p = spawn('bash', args, { cwd: SKILL, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  p.stdout.on('data', (d) => { out += d.toString(); JOBS[id].log = out.slice(-3000); });
  p.stderr.on('data', (d) => { out += d.toString(); JOBS[id].log = out.slice(-3000); });
  p.on('close', (code) => {
    if (code !== 0) { JOBS[id].status = 'error'; JOBS[id].log = out.slice(-3000); return; }
    const m = spawn('bash', ['bin/wb', 'mix', project], { cwd: SKILL, stdio: ['ignore', 'pipe', 'pipe'] });
    m.stdout.on('data', (d) => { out += d.toString(); JOBS[id].log = out.slice(-3000); });
    m.stderr.on('data', (d) => { out += d.toString(); JOBS[id].log = out.slice(-3000); });
    m.on('close', (c2) => { JOBS[id].status = c2 === 0 ? 'done' : 'error'; JOBS[id].log = out.slice(-3000); });
  });
  return id;
}

// ---------- HTTP ----------
const HTML = `<!doctype html><meta charset="utf-8"><title>渲染实验室</title>
<style>
:root{--bg:#12151a;--panel:#1b2028;--line:#2b323d;--ink:#e8ecf2;--dim:#98a2b3;--acc:#2573fd}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.6 system-ui,"Microsoft YaHei"}
header{padding:12px 18px;border-bottom:1px solid var(--line);display:flex;gap:14px;align-items:center;flex-wrap:wrap}
header h1{margin:0;font-size:16px}select,input,button{background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:6px 10px}
button{cursor:pointer}button:hover{border-color:var(--acc)}button.primary{background:var(--acc);border-color:var(--acc);color:#fff}
.wrap{display:flex;height:calc(100vh - 54px)}
aside{width:300px;border-right:1px solid var(--line);padding:14px;overflow:auto}
main{flex:1;padding:14px;overflow:auto;display:flex;flex-direction:column;gap:10px;min-width:0}
.row{margin-bottom:14px}
.row label{display:block;color:var(--dim);font-size:12px;margin-bottom:4px}
.row input[type=range]{width:100%}
.val{float:right;color:var(--ink)}
#shot{width:100%;max-height:56vh;object-fit:contain;border-radius:8px;border:1px solid var(--line);background:#000;flex:0 0 auto}
pre{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:10px;overflow:auto;margin:0;font-size:12px;white-space:pre-wrap}
#timing{max-height:30vh;flex:0 0 auto}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:4px 10px;font-size:12px;cursor:pointer}
.chip:hover{border-color:var(--acc)}
.note{color:var(--dim);font-size:12px}
</style>
<header>
  <h1>渲染实验室</h1>
  <select id="proj"></select>
  <select id="scene"></select>
  <span class="note" id="status">载入中…</span>
  <button id="btnApply">应用到 config.json</button>
  <button id="btnRender" class="primary">应用并重渲整片</button>
</header>
<div class="wrap">
  <aside>
    <div class="row"><label>时间 <span class="val" id="tVal">0.00s</span></label><input type="range" id="tRange" min="0" max="10" step="0.05" value="0"></div>
    <div class="row"><label>笔速 speed（描边像素/秒）</label><input type="range" id="pSpeed" min="300" max="3000" step="50"><span class="val" id="pSpeedV"></span></div>
    <div class="row"><label>按句对齐 cueSync</label><select id="pCueSync"><option value="1">开</option><option value="0">关（退回 beatFill）</option></select></div>
    <div class="row"><label>cueFinish（该句念到多少收笔）<span class="val" id="pFinishV"></span></label><input type="range" id="pFinish" min="0.4" max="1" step="0.05"></div>
    <div class="row"><label>cueMinSeconds（每组最短窗口）<span class="val" id="pMinV"></span></label><input type="range" id="pMin" min="0.2" max="1.5" step="0.05"></div>
    <div class="row"><label>beatFill（无字幕场景）<span class="val" id="pFillV"></span></label><input type="range" id="pFill" min="0.3" max="1" step="0.05"></div>
    <div class="row"><label>字幕后移 delaySeconds<span class="val" id="cDelayV"></span></label><input type="range" id="cDelay" min="0" max="0.6" step="0.02"></div>
    <div class="row"><label>字幕前抢 leadSeconds<span class="val" id="cLeadV"></span></label><input type="range" id="cLead" min="0" max="0.4" step="0.02"></div>
    <div class="row"><label>跳到字幕</label><div class="chips" id="cueChips"></div></div>
    <div class="row"><label>跳到每段末</label><div class="chips" id="beatChips"></div></div>
  </aside>
  <main>
    <img id="shot" alt="预览">
    <pre id="timing"></pre>
  </main>
</div>
<script>
const $ = (id) => document.getElementById(id);
let state = { project:'', scene:'', t:0 };
let cur = null;   // config 当前值

async function api(p, body) {
  const r = await fetch(p, body ? { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) } : undefined);
  return r.json();
}
function over() {
  return {
    pen: { speed: +$('pSpeed').value, cueSync: $('pCueSync').value === '1', cueFinish: +$('pFinish').value, cueMinSeconds: +$('pMin').value, beatFill: +$('pFill').value },
    captions: { delaySeconds: +$('cDelay').value, leadSeconds: +$('cLead').value }
  };
}
function syncLabels() {
  $('pSpeedV').textContent = $('pSpeed').value; $('pFinishV').textContent = $('pFinish').value;
  $('pMinV').textContent = $('pMin').value; $('pFillV').textContent = $('pFill').value;
  $('cDelayV').textContent = $('cDelay').value; $('cLeadV').textContent = $('cLead').value;
  $('tVal').textContent = (+$('tRange').value).toFixed(2) + 's';
}
let busy = false, pending = null;
async function refresh(reload) {
  syncLabels();
  if (busy) { pending = reload; return; }
  busy = true; $('status').textContent = '渲染中…';
  try {
    const t0 = Date.now();
    const r = await fetch('/api/preview', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ project: state.project, scene: state.scene, t: +$('tRange').value, over: over() }) });
    const b = await r.blob();
    $('shot').src = URL.createObjectURL(b);
    if (reload) $('timing').textContent = (await api('/api/timing', { project: state.project, scene: state.scene, over: over() })).text;
    $('status').textContent = '已渲染 ' + ((Date.now()-t0)/1000).toFixed(1) + 's';
  } catch (e) { $('status').textContent = '出错：' + e.message; }
  busy = false;
  if (pending) { pending = false; refresh(true); }
}
async function loadScenes() {
  const m = await api('/api/scenes?project=' + encodeURIComponent(state.project));
  $('scene').innerHTML = m.scenes.map((s) => '<option value="'+s.name+'">'+s.name+'（'+s.dur.toFixed(1)+'s）</option>').join('');
  state.scene = m.scenes[0].name;
  await loadCues();
}
async function loadCues() {
  const m = await api('/api/cues', { project: state.project, scene: state.scene, over: over() });
  $('tRange').max = m.total.toFixed(2); $('tRange').value = Math.min(state.t, m.total).toFixed(2);
  $('cueChips').innerHTML = m.cues.map((c,i) => '<span class="chip" data-t="'+c.end.toFixed(2)+'">'+(i+1)+'. '+c.text+'</span>').join('');
  $('beatChips').innerHTML = m.beats.map((b,i) => '<span class="chip" data-t="'+(b[1]-0.05).toFixed(2)+'">段'+(i+1)+'末</span>').join('');
  [...document.querySelectorAll('.chip')].forEach((el) => el.onclick = () => { $('tRange').value = el.dataset.t; refresh(false); });
}
async function boot() {
  const m = await api('/api/meta');
  cur = m.config;
  $('proj').innerHTML = m.episodes.map((e) => '<option'+(e===m.default?' selected':'')+'>'+e+'</option>').join('');
  state.project = $('proj').value;
  $('pSpeed').value = cur.pen.speed; $('pCueSync').value = cur.pen.cueSync === false ? '0' : '1';
  $('pFinish').value = cur.pen.cueFinish ?? 0.9; $('pMin').value = cur.pen.cueMinSeconds ?? 0.55; $('pFill').value = cur.pen.beatFill ?? 0.75;
  $('cDelay').value = cur.captions.delaySeconds ?? 0; $('cLead').value = cur.captions.leadSeconds ?? 0;
  await loadScenes(); refresh(true);
}
$('proj').onchange = async () => { state.project = $('proj').value; await loadScenes(); refresh(true); };
$('scene').onchange = async () => { state.scene = $('scene').value; await loadCues(); refresh(true); };
$('tRange').oninput = () => { syncLabels(); refresh(false); };
for (const id of ['pSpeed','pFinish','pMin','pFill','cDelay','cLead']) $(id).oninput = () => refresh(true);
$('pCueSync').onchange = () => refresh(true);
$('btnApply').onclick = async () => { await api('/api/apply', { over: over() }); $('status').textContent = '已写入 config.json ✔'; };
$('btnRender').onclick = async () => {
  await api('/api/apply', { over: over() });
  const r = await api('/api/render', { project: state.project });
  $('status').textContent = '重渲中（job ' + r.job + '）…';
  const t = setInterval(async () => {
    const j = await api('/api/job/' + r.job);
    $('timing').textContent = j.log || j.status;
    if (j.status !== 'running') { clearInterval(t); $('status').textContent = j.status === 'done' ? '重渲完成 ✔' : '重渲失败 ✘'; }
  }, 2000);
};
boot();
</script>`;

const server = require('http').createServer(async (req, res) => {
  const u = url.parse(req.url, true);
  const send = (obj, code) => { const b = Buffer.from(JSON.stringify(obj)); res.writeHead(code || 200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': b.length }); res.end(b); };
  try {
    if (u.pathname === '/' || u.pathname === '/index.html') {
      const b = Buffer.from(HTML, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': b.length }); res.end(b); return;
    }
    let body = '';
    if (req.method === 'POST') { for await (const ch of req) body += ch; }
    const q = body ? JSON.parse(body) : {};
    if (u.pathname === '/api/meta') {
      const eps = fs.readdirSync(path.join(SKILL, 'episodes')).filter((d) => !d.startsWith('_') && fs.existsSync(path.join(SKILL, 'episodes', d, 'scenes', 'script.json')));
      return send({ episodes: eps, default: eps[eps.length - 1], config: { pen: cfg.render.pen, captions: cfg.captions } });
    }
    if (u.pathname === '/api/scenes') {
      const P = projectPaths(path.join(SKILL, 'episodes', u.query.project));
      const script = JSON.parse(fs.readFileSync(P.script, 'utf8'));
      const scenes = script.map((sc) => {
        const f = path.join(P.audio, `${sc.name}.json`);
        const dur = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).duration + LEAD() + HOLD() : 5;
        return { name: sc.name, dur };
      });
      if (cfg.brand && cfg.brand.endCard && cfg.brand.endCard.enabled) scenes.push({ name: '99-brand', dur: (cfg.brand.endCard.seconds || 5.5) });
      return send({ scenes });
    }
    if (u.pathname === '/api/cues') {
      const P = projectPaths(path.join(SKILL, 'episodes', q.project));
      const { beats, cues, total } = sceneBundle(P, q.scene, q.over || {});
      return send({ beats, cues, total });
    }
    if (u.pathname === '/api/preview') {
      const buf = await preview(q);
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': buf.length }); res.end(buf); return;
    }
    if (u.pathname === '/api/timing') return send({ text: await timingOf(q) });
    if (u.pathname === '/api/apply') { applyOver(q.over); return send({ ok: true }); }
    if (u.pathname === '/api/render') return send({ job: runRender(q.project) });
    if (u.pathname.startsWith('/api/job/')) return send(JOBS[u.pathname.split('/').pop()] || { status: 'none' });
    send({ error: 'not found' }, 404);
  } catch (e) { send({ error: String(e.message || e) }, 500); }
});
server.listen(PORT, '127.0.0.1', () => console.log(`渲染实验室：http://127.0.0.1:${PORT}`));
