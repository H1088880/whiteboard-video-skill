#!/usr/bin/env node
// 城市旅游片总索引：node lib/city-index.cjs [交付目录]
// 扫描交付目录下各城市目录里的 看片.html + 封面-16x9.png，生成 index.html
const fs = require('fs');
const path = require('path');
const DELIV = process.argv[2] || 'C:/Users/ADMIN/WorkBuddy/2026-09-26-17-10-23/城市旅游片';
const QUEUE = path.join(__dirname, '..', 'batch', 'queue.txt');

const cities = [];
if (fs.existsSync(DELIV)) {
  for (const d of fs.readdirSync(DELIV).sort()) {
    const dir = path.join(DELIV, d);
    if (!fs.statSync(dir).isDirectory()) continue;
    const page = path.join(dir, '看片.html');
    if (!fs.existsSync(page)) continue;
    const covers = fs.readdirSync(dir).filter((f) => /^封面-16x9\.png$/.test(f));
    cities.push({ name: d, page: `./${d}/看片.html`, cover: covers.length ? `./${d}/${covers[0]}` : '', mb: (fs.statSync(page).size / 1024 / 1024).toFixed(1) });
  }
}

let total = 0, done = new Set(cities.map((c) => c.name));
if (fs.existsSync(QUEUE)) {
  total = fs.readFileSync(QUEUE, 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).length;
}

const html = `<!doctype html><meta charset="utf-8"><title>中国城市旅游片 · 总索引</title>
<style>
:root{--bg:#fffdf7;--ink:#1f2328;--dim:#8a8578;--line:#e6e0d0;--acc:#2573fd}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.7 system-ui,"Microsoft YaHei"}
.wrap{max-width:1180px;margin:0 auto;padding:32px 20px 60px}
h1{font-size:30px;margin:0 0 6px}
.sub{color:var(--dim);margin:0 0 24px}
.bar{height:10px;background:#efe9db;border-radius:6px;overflow:hidden;margin:8px 0 28px}
.bar i{display:block;height:100%;background:var(--acc)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px}
a.card{display:block;text-decoration:none;color:inherit;background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden}
a.card:hover{border-color:var(--acc);transform:translateY(-2px)}
a.card img{width:100%;display:block;background:#f6f2e8}
a.card .t{padding:10px 14px;font-weight:600}
a.card .m{padding:0 14px 12px;color:var(--dim);font-size:13px}
.pending{margin-top:32px;color:var(--dim);font-size:14px}
</style>
<div class="wrap">
  <h1>中国城市旅游片</h1>
  <p class="sub">每城一部 · 已完成 ${cities.length} / ${total || '—'} 部，点开即看（播放页内嵌成片）</p>
  <div class="bar"><i style="width:${total ? ((cities.length / total) * 100).toFixed(1) : 0}%"></i></div>
  <div class="grid">
${cities.map((c) => `    <a class="card" href="${c.page}">${c.cover ? `<img src="${c.cover}" alt="${c.name}">` : ''}<div class="t">${c.name}</div><div class="m">看片页 ${c.mb}MB</div></a>`).join('\n')}
  </div>
  <p class="pending">其余城市在队列里排队出片，跑完会自动补进这个索引。</p>
</div>`;

fs.writeFileSync(path.join(DELIV, 'index.html'), html, 'utf8');
console.log(`索引：${path.join(DELIV, 'index.html')}（${cities.length}/${total || '?'}）`);
