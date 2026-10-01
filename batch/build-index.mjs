// 生成「总→分」总索引页：Tier A 省级专题 + Tier B 地级市（按省分组）
// 用法: node build-index.mjs [输出目录]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OUT = process.argv[2] || 'C:/Users/ADMIN/WorkBuddy/2026-09-26-17-10-23/城市旅游片';
const plan = JSON.parse(fs.readFileSync(path.join(__dirname, 'master-plan.json'), 'utf8'));

// 目录里是否已有看片页
const has = n => fs.existsSync(path.join(OUT, n, '看片.html'));
const cover = n => fs.existsSync(path.join(OUT, n, '封面-16x9.png'))
  ? `./${encodeURIComponent(n)}/封面-16x9.png` : '';

const A = plan.filter(x => x.level === 'province');
const B = plan.filter(x => x.level === 'city');
const A_done = A.filter(x => has(x.name) || has(x.name + '省'));
const B_done = B.filter(x => has(x.name));
const total = plan.length, done = A_done.length + B_done.length;
const pct = (done / total * 100).toFixed(1);

const card = (x, key) => {
  const ok = has(key) || (x.level === 'province' && has(x.name + '省'));
  const dir = has(key) ? key : (has(x.name + '省') ? x.name + '省' : '');
  const c = cover(dir);
  const meta = ok ? `${x.region} · ${x.dialect}` : `${x.region} · 待出片`;
  const inner = c
    ? `<img loading="lazy" src="${c}" alt="${x.name}">` : '';
  return ok
    ? `<a class="card" href="./${encodeURIComponent(dir)}/看片.html">${inner}<div class="t">${x.name}</div><div class="m">${meta}</div></a>`
    : `<div class="card off">${inner}<div class="t">${x.name}</div><div class="m">${meta}</div></div>`;
};

// 地级市按省分组
const groups = {};
for (const c of B) (groups[c.prov] = groups[c.prov] || []).push(c);

const RegionOrder = ['华北','东北','华东','华中','华南','西南','西北','港澳台'];
const provOrder = [];
for (const r of RegionOrder) for (const p of A) if (p.region === r) provOrder.push(p);

let html = `<!doctype html><meta charset="utf-8"><title>中国旅游片 · 总索引（总→分）</title>
<style>
:root{--bg:#fffdf7;--ink:#1f2328;--dim:#8a8578;--line:#e6e0d0;--acc:#2573fd;--ok:#c0392b}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.7 system-ui,"Microsoft YaHei"}
.wrap{max-width:1180px;margin:0 auto;padding:32px 20px 60px}
h1{font-size:30px;margin:0 0 6px}
.sub{color:var(--dim);margin:0 0 18px}
.bar{height:10px;background:#efe9db;border-radius:6px;overflow:hidden;margin:0 0 8px}
.bar i{display:block;height:100%;background:var(--acc)}
.barnum{color:var(--dim);font-size:13px;margin:0 0 30px}
h2{font-size:21px;margin:34px 0 4px;padding-top:6px;border-top:1px solid var(--line)}
h2 .n{color:var(--dim);font-size:14px;font-weight:400}
.hint{color:var(--dim);font-size:13px;margin:0 0 16px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}
.card{display:block;text-decoration:none;color:inherit;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}
a.card:hover{border-color:var(--acc);transform:translateY(-2px)}
.card img{width:100%;display:block;background:#f6f2e8}
.card .t{padding:8px 12px;font-weight:600;font-size:15px}
.card .m{padding:0 12px 10px;color:var(--dim);font-size:12px}
.card.off{opacity:.42;background:#faf7ef;min-height:104px;display:flex;flex-direction:column;justify-content:flex-end}
.prov{margin:0 0 22px}
.prov h3{font-size:15px;margin:0 0 8px;color:var(--ink)}
.prov h3 span{color:var(--dim);font-weight:400;font-size:13px}
.chips{display:flex;flex-wrap:wrap;gap:7px}
.chips a,.chips i{font-style:normal;text-decoration:none;font-size:13px;padding:4px 11px;border-radius:999px;border:1px solid var(--line);background:#fff;color:var(--ink)}
.chips a{background:#fff;border-color:#cfd8ea}
.chips a:hover{background:var(--acc);color:#fff;border-color:var(--acc)}
.chips i{color:var(--dim);background:#faf7ef}
.foot{margin-top:40px;color:var(--dim);font-size:13px}
</style>
<div class="wrap">
  <h1>中国旅游片 · 总索引</h1>
  <p class="sub">总→分两层：先做完 34 个省级专题 + 340 个地级行政区与港澳台，再下沉到各县、景区。</p>
  <div class="bar"><i style="width:${pct}%"></i></div>
  <p class="barnum">已完成 ${done} / ${total} 部（${pct}%）　·　省级专题 ${A_done.length}/${A.length}　·　地级与城市 ${B_done.length}/${B.length}</p>
`;

// Tier A
html += `  <h2>Tier A · 省级行政区专题<span class="n">　${A_done.length}/${A.length}</span></h2>
  <p class="hint">一个省一部总片，往下所有地级市共用这一部的方言与主题色。</p>
  <div class="grid">\n`;
for (const p of provOrder) {
  const key = (p.name === '河南') ? '河南省' : p.name;
  html += '    ' + card(p, key) + '\n';
}
html += '  </div>\n';

// Tier B
html += `  <h2>Tier B · 地级行政区与港澳台城市<span class="n">　${B_done.length}/${B.length}</span></h2>
  <p class="hint">按省分组，一省扫完再进下一省。灰色胶囊＝待出片。</p>\n`;
for (const p of provOrder) {
  const list = groups[p.name];
  if (!list || !list.length) continue;
  const d = list.filter(x => has(x.name)).length;
  html += `  <div class="prov"><h3>${p.name} <span>${d}/${list.length} · ${p.dialect}</span></h3><div class="chips">\n`;
  for (const c of list) {
    html += has(c.name)
      ? `    <a href="./${encodeURIComponent(c.name)}/看片.html">${c.name}</a>\n`
      : `    <i>${c.name}</i>\n`;
  }
  html += '  </div></div>\n';
}

html += `  <p class="foot">每跑完一批自动重生成这个页面。数据来源：batch/master-plan.json。</p>
</div>`;

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), html, 'utf8');
console.log(`索引已生成: ${path.join(OUT, 'index.html')}`);
console.log(`总进度 ${done}/${total} (${pct}%)  省级 ${A_done.length}/${A.length}  地级 ${B_done.length}/${B.length}`);
