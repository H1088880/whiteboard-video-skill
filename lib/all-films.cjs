#!/usr/bin/env node
// 「全部成片」总入口页：把所有交付目录里出过的片子汇总成一个可点开的索引。
//   node lib/all-films.cjs [输出 html 路径]
// 扫描规则：给定根目录下「含 看片.html 的子目录」即一部片子；封面取 封面-16x9/4x3/3x4 里存在的第一个；
// 时长/体积从该目录里的 *-final.mp4 读（ffprobe 拿不到就退回体积）。
// ⚠️ 本机坑：spawnSync 默认 stdio:'pipe' 会 EBUSY，收 stdout 必须写 ['ignore','pipe','ignore']。
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const WS = process.env.WB_WORKSPACE || 'C:/Users/ADMIN/WorkBuddy/2026-09-26-17-10-23';
const OUT = process.argv[2] || path.join(WS, '全部成片.html');

// 分组：[标题, 交付根目录（其下每个子目录 = 一部片子）, 是否扁平（根目录本身就是一部片）]
// flat 组可以用 name 指定这部片子的显示名（否则取目录名去掉「交付」）
const GROUPS = [
  { title: '城市旅游片', root: path.join(WS, '城市旅游片'), flat: false, note: '每城一部，风格逐城不同' },
  { title: '主题短片', root: path.join(WS, '江西旅游交付'), flat: true, name: '江西旅游' },
  { title: '主题短片', root: path.join(WS, '人的一生交付'), flat: true, name: '人的一生 6 个阶段' },
  { title: '主题短片', root: path.join(WS, '不想上班交付'), flat: true, name: '为什么你每天都不想上班' },
  { title: '往期成片', root: path.join(WS, '往期交付'), flat: false, note: '早期那几期，看片页是后补的' },
];

const dur = (mp4) => {
  if (!mp4) return '';
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], { stdio: ['ignore', 'pipe', 'ignore'] });
  const d = r.error ? 0 : parseFloat(String(r.stdout).trim()) || 0;
  return d ? `${d.toFixed(0)}s` : '';
};

const itemOf = (dir, name, note) => {
  const page = path.join(dir, '看片.html');
  if (!fs.existsSync(page)) return null;
  const covers = ['封面-16x9.png', '封面-4x3.png', '封面-3x4.png'].filter((f) => fs.existsSync(path.join(dir, f)));
  const mp4 = fs.readdirSync(dir).filter((f) => f.endsWith('.mp4')).map((f) => path.join(dir, f))[0];
  const bytes = (fs.statSync(page).size || 0) / 1024;
  return {
    name, note: note || '',
    rel: path.relative(path.dirname(OUT), page).replace(/\\/g, '/'),
    cover: covers.length ? path.relative(path.dirname(OUT), path.join(dir, covers[0])).replace(/\\/g, '/') : '',
    meta: [dur(mp4), mp4 ? `${(fs.statSync(mp4).size / 1048576).toFixed(1)}MB` : '', covers.length ? `封面 ${covers.length} 版` : ''].filter(Boolean).join(' · '),
    _pageKB: bytes,
  };
};

const groups = [];
for (const g of GROUPS) {
  if (!fs.existsSync(g.root)) continue;
  const items = [];
  if (g.flat) {
    const it = itemOf(g.root, g.name || path.basename(g.root).replace(/交付$/, ''), g.note);
    if (it) items.push(it);
  } else {
    for (const d of fs.readdirSync(g.root).sort()) {
      const dir = path.join(g.root, d);
      if (!fs.statSync(dir).isDirectory()) continue;
      const it = itemOf(dir, d, g.note);
      if (it) items.push(it);
    }
  }
  if (!items.length) continue;
  const prev = groups.find((x) => x.title === g.title);
  if (prev) prev.items.push(...items); else groups.push({ title: g.title, note: g.note || '', items });
}

const total = groups.reduce((n, g) => n + g.items.length, 0);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const now = new Date().toLocaleString('zh-CN', { hour12: false });

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>全部成片 · 索引</title>
<style>
:root{--bg:#fffdf7;--ink:#1f2328;--dim:#8a8578;--line:#e6e0d0;--acc:#2573fd}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.7 system-ui,"Microsoft YaHei",sans-serif}
.wrap{max-width:1200px;margin:0 auto;padding:34px 20px 70px}
h1{font-size:32px;margin:0 0 8px}
.sub{color:var(--dim);margin:0 0 6px}
h2{font-size:20px;margin:38px 0 6px;padding-bottom:8px;border-bottom:2px solid var(--line)}
h2 span{font-weight:400;color:var(--dim);font-size:14px;margin-left:10px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(272px,1fr));gap:18px;margin-top:16px}
a.card{display:block;text-decoration:none;color:inherit;background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;transition:transform .12s,border-color .12s}
a.card:hover{border-color:var(--acc);transform:translateY(-3px);box-shadow:0 8px 22px rgba(0,0,0,.06)}
a.card .ph{position:relative;background:#f6f2e8}
a.card img{width:100%;display:block;aspect-ratio:16/9;object-fit:cover}
a.card .ph.port img{aspect-ratio:3/4;object-fit:cover}
a.card .play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:54px;height:54px;border-radius:50%;background:rgba(37,115,253,.92);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;padding-left:4px}
a.card .t{padding:11px 14px 3px;font-weight:600;font-size:17px}
a.card .m{padding:0 14px 13px;color:var(--dim);font-size:13px}
.foot{margin-top:44px;color:var(--dim);font-size:13px;border-top:1px solid var(--line);padding-top:14px}
</style>
</head>
<body>
<div class="wrap">
  <h1>全部成片</h1>
  <p class="sub">共 ${total} 部 · 点开封面即进播放页（播放页里已内嵌成片，单文件可离线看）</p>
  <p class="sub">索引生成时间：${esc(now)}</p>
${groups.map((g) => `  <h2>${esc(g.title)}<span>${g.items.length} 部${g.note ? ' · ' + esc(g.note) : ''}</span></h2>
  <div class="grid">
${g.items.map((it) => `    <a class="card" href="${esc(it.rel)}">
      <div class="ph${/3x4/.test(it.cover) ? ' port' : ''}">${it.cover ? `<img src="${esc(it.cover)}" alt="${esc(it.name)}" loading="lazy">` : ''}<div class="play">▶</div></div>
      <div class="t">${esc(it.name)}</div>
      <div class="m">${esc(it.meta)}</div>
    </a>`).join('\n')}
  </div>`).join('\n')}
  <p class="foot">本页只做索引，不改动任何成片文件。片子更新后重跑 <code>node lib/all-films.cjs</code> 即可刷新。</p>
</div>
</body>
</html>
`;

fs.writeFileSync(OUT, html);
console.log(`✓ 全部成片索引 → ${OUT}`);
for (const g of groups) console.log(`  ${g.title}: ${g.items.length} 部（${g.items.map((i) => i.name).join('、')}）`);
