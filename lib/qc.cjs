#!/usr/bin/env node
// 出片质量门禁：成片 / 三版封面 / 看片页 / 时序落后 / 元素越界
// 用法: node lib/qc.cjs <期目录>
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { projectPaths } = require('./paths.cjs');

const P = projectPaths(process.argv[2]);
const COVERS = ['封面-16x9.png', '封面-4x3.png', '封面-3x4.png'];
const results = [];
const add = (name, ok, detail) => { results.push({ name, ok, detail }); };

// 1. 成片
const finalOk = fs.existsSync(P.final);
const mb = finalOk ? (fs.statSync(P.final).size / 1024 / 1024).toFixed(1) : 0;
add('成片 final.mp4', finalOk, finalOk ? `${mb}MB` : '缺失');
let dur = 0;
if (finalOk) {
  // ⚠️ 本机坑：stdio 默认 pipe 会 EBUSY，必须 ignore/pipe 混合
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', P.final], { stdio: ['ignore', 'pipe', 'ignore'] });
  dur = parseFloat(String(r.stdout || '').trim()) || 0;
  add('成片时长', dur > 20 && dur < 300, `${dur.toFixed(1)}s`);
}

// 2. 三版封面
const missCovers = COVERS.filter((f) => !fs.existsSync(path.join(P.project, f)));
add('封面三版', missCovers.length === 0, missCovers.length ? `缺 ${missCovers.join('、')}` : COVERS.join(' / '));

// 3. 看片页
// 看片页可能在 outputs/（wb build 自动）或批量交付目录 城市旅游片/<城>/
const watchCands = [path.join(P.outputs, '看片.html'), path.join('C:/Users/ADMIN/WorkBuddy/2026-09-26-17-10-23/城市旅游片', path.basename(P.project).replace(/^旅游-/, ''), '看片.html')];
const watch = watchCands.find((f) => fs.existsSync(f));
add('看片页 看片.html', !!watch, watch ? `${(fs.statSync(watch).size / 1024 / 1024).toFixed(1)}MB` : '缺失');

// 4. 时序：句子念完还没画完的条数
let late = -1;
try {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'timing.cjs'), P.project], { stdio: ['ignore', 'pipe', 'ignore'], cwd: path.join(__dirname, '..') });
  const txt = String(r.stdout || '');
  late = (txt.match(/⚠/g) || []).length;
  add('时序（句子画完才落音）', late === 0, late === 0 ? '0 条落后' : `${late} 条落后`);
} catch (e) { add('时序', false, String(e.message).slice(0, 60)); }

// 5. 元素越界（画布 1920x1080，字幕安全区 y>=960）
const SAFE = { x0: 30, x1: 1890, y1: 950 };
const bad = [];
let nEl = 0;
if (fs.existsSync(P.scenes)) {
  // 封面（00-cover-*）是独立画布、边框刻意贴边，不参与视频画面越界判定
  for (const f of fs.readdirSync(P.scenes).filter((x) => x.endsWith('.excalidraw.md') && !x.includes('cover'))) {
    const md = fs.readFileSync(path.join(P.scenes, f), 'utf8');
    const m = md.match(/```compressed-json\s*([\s\S]*?)```/) || md.match(/```json\s*([\s\S]*?)```/);
    if (!m) continue;
    let doc;
    try {
      const body = m[1].trim();
      doc = m[0].includes('compressed-json')
        ? JSON.parse(require('lz-string').decompressFromBase64(body.replace(/\s+/g, '')))
        : JSON.parse(body);
    } catch { continue; }
    for (const e of doc.elements || []) {
      nEl++;
      const x1 = e.x + (e.width || 0), y1 = e.y + (e.height || 0);
      if (e.x < SAFE.x0 || x1 > SAFE.x1 || y1 > SAFE.y1) bad.push(`${f}:${e.type || 'el'}@(${Math.round(e.x)},${Math.round(e.y)})-(${Math.round(x1)},${Math.round(y1)})`);
    }
  }
}
add('元素越界', bad.length === 0, bad.length ? `${bad.length} 个越界：${bad.slice(0, 3).join('；')}` : `检查 ${nEl} 个元素`);

// 输出
console.log(`\n=== 出片质检 ${P.name} ===`);
let fail = 0;
for (const r of results) {
  if (!r.ok) fail++;
  console.log(`  ${r.ok ? '✓' : '✗'} ${r.name.padEnd(22, ' ')} ${r.detail}`);
}
console.log(fail ? `\n✗ ${fail} 项未通过（先看上面 ✗ 的项）` : '\n✓ 全部通过，可交付');
process.exit(fail ? 1 : 0);
