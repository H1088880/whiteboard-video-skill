#!/usr/bin/env node
// 贴纸体检：扫描所有期，① 还有没有用程序化图元 illo(s,...) 的景点画面；② scenes.js 引用的贴纸在 assets/ 里是否齐全
const fs = require('fs');
const path = require('path');
const { PROJECTS_DIR } = require('./paths.cjs');

const dirs = fs.readdirSync(PROJECTS_DIR).filter((d) => fs.existsSync(path.join(PROJECTS_DIR, d, 'scenes.js')));
const illoEps = [], missing = [];
let ok = 0;
for (const d of dirs) {
  const p = path.join(PROJECTS_DIR, d);
  const src = fs.readFileSync(path.join(p, 'scenes.js'), 'utf8');
  if (/illo\(s,/.test(src)) illoEps.push(d);
  const names = new Set();
  for (const m of src.matchAll(/imageSize\(\s*'([^']+)'/g)) names.add(m[1]);
  for (const m of src.matchAll(/s\.image\(\s*\d+\s*,\s*[\w.]+\s*,\s*'([^']+)'/g)) names.add(m[1]);
  for (const m of src.matchAll(/sticker:\s*'([^']+)'/g)) names.add(m[1]);
  const miss = [...names].filter((n) => !fs.existsSync(path.join(p, 'assets', n + '.png')));
  if (miss.length) missing.push(`${d} → ${miss.join(', ')}`);
  if (names.size && !miss.length) ok++;
}
console.log(`扫描 ${dirs.length} 期`);
console.log(`\n① 仍用程序化图元 illo(s, ...) 的期（${illoEps.length}）：\n${illoEps.length ? '  ' + illoEps.join('\n  ') : '  （无，全部走真实地标贴纸）'}`);
console.log(`\n② 引用了贴纸但 assets/ 里缺失的期（${missing.length}）：\n${missing.length ? '  ' + missing.join('\n  ') : '  （无）'}`);
console.log(`\n③ 贴纸齐全的期：${ok}`);
