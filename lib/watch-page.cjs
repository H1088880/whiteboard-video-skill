// 看片页：把成片包装成一个可直接打开的「看片.html」——播放器 + 三版封面 + 每个场景的抽帧。
// 出片后的标准交付物（用户约定：交付看片.html，不直接给 final.mp4）。
// 用法：node lib/watch-page.mjs <期目录> [输出目录，默认 outputs/]
//   wb 看片 <期> [输出目录]
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { projectPaths } = require('./paths.cjs');

// ⚠️ 本机坑：spawnSync 默认 stdio:'pipe' 会报 EBUSY，必须 ignore/inherit（stdout 要收才用 ['ignore','pipe','ignore']）
const run = (exe, args, opts) => spawnSync(exe, args, { stdio: 'ignore', ...opts });
const runRetry = (exe, args, tries = 4) => {
  for (let i = 0; i < tries; i++) {
    const r = run(exe, args);
    if (!r.error) return true;
    if (i === tries - 1) throw r.error;
  }
};

const P = projectPaths(process.argv[2] || '.');
const outDir = process.argv[3] ? path.resolve(process.argv[3]) : P.outputs;
const title = P.name.replace(/^\d{4}-\d{2}-\d{2}\s*/, ''); // 「2026-09-29 江西旅游」→「江西旅游」

if (!fs.existsSync(P.final)) throw new Error(`成片不存在：${P.final}，先 wb render/mix`);
fs.mkdirSync(outDir, { recursive: true });

// 成片与封面拷进出片页目录（成片用「<题名>-final.mp4」好认）
const mp4 = path.join(outDir, `${title}-final.mp4`);
fs.copyFileSync(P.final, mp4);
const mb = (fs.statSync(mp4).size / 1024 / 1024).toFixed(1);
// 总时长以成片为准（ffprobe），不按旁白累加
let total = 0;
{
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', P.final], { stdio: ['ignore', 'pipe', 'ignore'] });
  if (!r.error) total = parseFloat(r.stdout.toString().trim()) || 0;
}

const script = JSON.parse(fs.readFileSync(P.script));
const rows = [];
let acc = 0;
for (const sc of script) {
  const info = JSON.parse(fs.readFileSync(path.join(P.audio, `${sc.name}.json`), 'utf8'));
  const clipLen = info.duration + 0.3 + 0.7; // 每段 = LEAD + 旁白 + HOLD
  const label = (info.segments ? info.segments[0] : sc.segments[0] || sc.name).replace(/[，。？！].*$/, '');
  const shot = path.join(outDir, `帧-${sc.name}.png`);
  try {
    runRetry('ffmpeg', ['-v', 'error', '-ss', Math.max(0.5, acc + clipLen - 0.35).toFixed(2), '-i', P.final, '-frames:v', '1', shot, '-y']);
    rows.push({ file: path.basename(shot), label });
  } catch (e) { console.warn('抽帧失败', sc.name, String(e.message || e).slice(0, 80)); }
  acc += clipLen;
}
const covers = ['封面-16x9.png', '封面-4x3.png', '封面-3x4.png'].filter((f) => fs.existsSync(path.join(P.project, f)));
for (const f of covers) fs.copyFileSync(path.join(P.project, f), path.join(outDir, f));

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>《${esc(title)}》成片 · ${Math.round(total)}s</title>
<style>
  :root { --ink:#1e1e1e; --gray:#6b6b6b; --line:#e6e2d8; --paper:#fffdf7; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--paper); color:var(--ink);
         font-family: "PingFang SC","Microsoft YaHei","Noto Sans CJK SC",system-ui,sans-serif; }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 32px 24px 64px; }
  h1 { font-size: 26px; margin: 0 0 6px; letter-spacing: .5px; }
  .meta { color: var(--gray); font-size: 14px; margin-bottom: 20px; }
  .player { background:#111; border-radius:14px; overflow:hidden; box-shadow:0 6px 24px rgba(0,0,0,.14); }
  video { display:block; width:100%; height:auto; background:#111; }
  h2 { font-size: 17px; margin: 34px 0 12px; padding-bottom:8px; border-bottom:1px solid var(--line); }
  .covers { display:flex; flex-wrap:wrap; gap:14px; }
  .covers img { height: 200px; border-radius:10px; border:1px solid var(--line); display:block; }
  .frames { display:grid; grid-template-columns: repeat(auto-fill, minmax(220px,1fr)); gap:14px; }
  .frames figure { margin:0; }
  .frames img { width:100%; border-radius:10px; border:1px solid var(--line); display:block; }
  .frames figcaption { font-size:12.5px; color:var(--gray); margin-top:6px; }
  .hint { margin-top:14px; font-size:13px; color:var(--gray); }
  .hint code { background:#f2efe6; padding:2px 6px; border-radius:4px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>《${esc(title)}》· 白板讲解成片</h1>
  <div class="meta">1920×1080 · ${Math.round(total)} 秒 · H.264 + AAC · ${mb} MB</div>

  <div class="player">
    <video controls preload="auto" playsinline src="data:video/mp4;base64,${fs.readFileSync(mp4).toString('base64')}"></video>
  </div>
  <div class="hint">成片已内嵌在本页里（另存了同目录的 <code>${esc(title)}-final.mp4</code> 备用）。</div>
${covers.length ? `
  <h2>封面（三版）</h2>
  <div class="covers">
${covers.map((f) => `    <img src="${encodeURIComponent(f)}" alt="${esc(f)}">`).join('\n')}
  </div>` : ''}

  <h2>分镜抽帧</h2>
  <div class="frames">
${rows.map((r) => `    <figure><img src="${encodeURIComponent(r.file)}" alt="${esc(r.label)}"><figcaption>${esc(r.label)}</figcaption></figure>`).join('\n')}
  </div>
</div>
</body>
</html>
`;
const page = path.join(outDir, '看片.html');
fs.writeFileSync(page, html);
console.log(`看片页：${page}`);
console.log(`  成片 ${mb} MB · ${Math.round(total)}s · 分镜 ${rows.length} 帧 · 封面 ${covers.length} 版`);
