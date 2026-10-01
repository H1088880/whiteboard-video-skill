// 场景 DSL：定义场景 → 输出 Excalidraw 文件（.excalidraw + Obsidian 插件用的 .excalidraw.md）和 script.json（渲染器用）
// 项目里的 scenes.js 只需 require 这个文件，定义场景，最后 build(__dirname, scenes)。
const fs = require('fs');
const path = require('path');
require('./safe-rm.cjs'); // 同上
const { projectPaths, cfg } = require('./paths.cjs');

let OUT = null;

// Excalidraw 调色板
const C = {
  ink: '#1e1e1e', gray: '#868e96', red: '#e03131', green: '#2f9e44', blue: '#1971c2',
  orange: '#f08c00', purple: '#6741d9',
  fRed: '#ffc9c9', fGreen: '#b2f2bb', fBlue: '#a5d8ff', fYellow: '#ffec99', fPurple: '#d0bfff', fGray: '#e9ecef',
  fGrey: '#e9ecef', // 工作台导出用的是英式拼写 fGrey，这里必须给别名，否则 fill 变 transparent（卡片丢底色）
  brand: (cfg.brand && cfg.brand.accent) || '#2f9e44', // 品牌色（config.json brand.accent），标题/点睛用它保持全系列一致
};

// ---- 每期主题色（内容层色调系统，不碰封面）----
// 一个 theme 颜色贯穿：标题 heading、眉标 kicker、卡片 callout、高亮 highlight、大数字 stat。
// 手绘抖动/线条全部保留，只换色调，对应 SimonTalk「每期一个主色、整体色调统一」。
// use(__dirname, { theme: 'warm' }) 启用；不传 = 默认（品牌蓝 + 黄高亮），与旧版逐像素一致。
const THEMES = {
  brand:  { accent: (cfg.brand && cfg.brand.accent) || '#2f9e44', fill: '#a5d8ff', highlight: '#ffec99', soft: '#eef4ff' },
  warm:   { accent: '#f08c00', fill: '#ffe8cc', highlight: '#ffd8a8', soft: '#fff4e6' },
  ocean:  { accent: '#1971c2', fill: '#a5d8ff', highlight: '#a5d8ff', soft: '#e7f5ff' },
  forest: { accent: '#2f9e44', fill: '#b2f2bb', highlight: '#b2f2bb', soft: '#ebfbee' },
  berry:  { accent: '#e8590c', fill: '#ffc9c9', highlight: '#ffc9c9', soft: '#fff0f0' },
  grape:  { accent: '#6741d9', fill: '#d0bfff', highlight: '#d0bfff', soft: '#f3f0ff' },
};
const PAPER_BASE = '#fffdf7';
let THEME = { ...THEMES.brand, paper: PAPER_BASE, pen: null, active: false };
function lighten(hex, amt = 0.82) {
  const m = hex.replace('#', '');
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  const f = (v) => Math.round(v + (255 - v) * (1 - amt));
  return '#' + [f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
}
function mix(a, b, t) {
  const ch = (s, i) => parseInt(s.slice(i, i + 2), 16);
  const pa = a.replace('#', ''), pb = b.replace('#', '');
  return '#' + [0, 2, 4].map((i) => Math.round(ch(pa, i) + (ch(pb, i) - ch(pa, i)) * t).toString(16).padStart(2, '0')).join('');
}
// 纸底恒为原牛皮纸色：色调只体现在「内容元素」上（标题/卡片/高亮/大数字/线条），不染背景——
// 白板就是白板，整片染底会丢掉手绘白板的辨识度（SimonTalk 的「每期一个主色」是内容色，不是换个底色）。
// 笔身（铅笔图标）跟主题，它属于内容不是底。
function finishTheme(explicit) {
  THEME.paper = PAPER_BASE;
  THEME.pen = explicit ? THEME.accent : null;
  THEME.active = explicit;
  return THEME;
}
// 把主题名/#hex 解析成一套调色板（纸底恒为原色）。use() 与 new Scene(...,{theme}) 共用
function paletteFor(t) {
  if (!t) return { ...THEMES.brand, paper: PAPER_BASE };
  if (typeof t === 'string' && THEMES[t]) return { ...THEMES[t], paper: PAPER_BASE };
  if (typeof t === 'string' && /^#?[0-9a-fA-F]{6}$/.test(t)) {
    const hex = t.startsWith('#') ? t : '#' + t;
    // 派生强度按预设校准（ocean: accent#1971c2→fill#a5d8ff ≈ 混白 68%）：fill 混白 68%、highlight 60%、soft 85%
    // （此前误用 0.82=保留 82% 原色，hex 主题的卡片底≈accent 原色，accent 字压上去糊成一片）
    return { accent: hex, fill: lighten(hex, 0.32), highlight: lighten(hex, 0.4), soft: lighten(hex, 0.15), paper: PAPER_BASE };
  }
  return { ...THEMES.brand, paper: PAPER_BASE };
}
function setTheme(t) {
  THEME = paletteFor(t);
  const explicit = !t ? false : (typeof t === 'string' && THEMES[t] ? t !== 'brand' : true);
  finishTheme(explicit);
  return THEME;
}
module.exports.getTheme = () => THEME;

let seedCounter = 1000;
const nextSeed = () => (seedCounter = (seedCounter * 9301 + 49297) % 233280) + 1;
let idCounter = 0;
const nextId = () => 'el' + (++idCounter).toString(36).padStart(6, '0');

const isCJK = (ch) => /[　-鿿＀-￯]/.test(ch);
function measure(text, fs) {
  const lines = text.split('\n');
  let w = 0;
  for (const l of lines) {
    let lw = 0;
    for (const ch of l) lw += isCJK(ch) ? fs : fs * 0.55;
    w = Math.max(w, lw);
  }
  return { width: Math.round(w), height: Math.round(fs * 1.25 * lines.length) };
}

function base(type, x, y, w, h, o = {}) {
  return {
    id: nextId(), type, x, y, width: w, height: h, angle: 0,
    strokeColor: o.stroke || C.ink, backgroundColor: o.fill || 'transparent',
    fillStyle: o.fillStyle || 'hachure', strokeWidth: o.strokeWidth || 2,
    strokeStyle: o.strokeStyle || 'solid', roughness: o.roughness ?? 1, opacity: o.opacity ?? 100,
    groupIds: [], frameId: null, roundness: o.round ? { type: 3 } : null,
    seed: nextSeed(), version: 1, versionNonce: nextSeed(), isDeleted: false,
    boundElements: null, updated: Date.now(), link: null, locked: false,
  };
}

class Scene {
  // opts.theme：本场景自己的主题色（按主题/场景换色调）；不给就用 use() 的全局主题
  constructor(name, narration, opts = {}) {
    this.name = name;
    this.th = opts.theme ? paletteFor(opts.theme) : null;
    this.segments = narration.split('|').map((s) => s.trim()).filter(Boolean);
    this.elements = [];
    this.files = {};
    this.assetsDir = null;
    this.beatOf = []; // element index -> beat index
    this.beat = -1;
  }
  nextBeat() { this.beat++; return this; }
  // 本场景生效的主题色（按场景 theme > 全局 theme > 品牌色）；手写 line/ellipse 想跟主题时用
  accent() { return (this.th || THEME).accent; }
  push(el) {
    if (this.beat < 0) throw new Error('call nextBeat() first');
    this.elements.push(el); this.beatOf.push(this.beat); return el;
  }
  rect(x, y, w, h, o = {}) { return this.push(base('rectangle', x, y, w, h, o)); }
  ellipse(x, y, w, h, o = {}) { return this.push(base('ellipse', x, y, w, h, o)); }
  diamond(x, y, w, h, o = {}) { return this.push(base('diamond', x, y, w, h, o)); }
  text(x, y, str, o = {}) {
    const fs = o.size || 36;
    const m = measure(str, fs);
    let tx = x;
    if (o.align === 'center') tx = x - m.width / 2;
    if (o.align === 'right') tx = x - m.width;
    const el = base('text', tx, y, m.width, m.height, { stroke: o.color || C.ink, roughness: 0 });
    Object.assign(el, {
      text: str, originalText: str, fontSize: fs, fontFamily: o.font || 5,
      textAlign: o.align || 'left', verticalAlign: 'top', containerId: null, autoResize: true, lineHeight: 1.25,
    });
    return this.push(el);
  }
  line(points, o = {}) {
    const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    const el = base(o.arrow ? 'arrow' : 'line', x, y, Math.max(...xs) - x, Math.max(...ys) - y, o);
    if (o.round) el.roundness = { type: 2 };
    Object.assign(el, {
      points: points.map((p) => [p[0] - x, p[1] - y]), lastCommittedPoint: null,
      startBinding: null, endBinding: null, startArrowhead: o.startHead || null,
      endArrowhead: o.arrow ? 'arrow' : null, elbowed: false,
    });
    return this.push(el);
  }
  arrow(points, o = {}) { return this.line(points, { ...o, arrow: true }); }
  // 贴纸图片：name 对应 <project>/assets/<name>.png（gen-image.mjs 产物）。给 w 或 h 之一按原图比例算另一个。
  image(x, y, name, o = {}) {
    const file = path.join(projectPaths(module.exports.projectDir).assets, `${name}.png`);
    if (!fs.existsSync(file)) throw new Error(`缺少贴纸 assets/${name}.png，先跑 wb image`);
    return this.imageFile(x, y, file, o);
  }
  // 贴纸原图尺寸（排版前算宽高比用）
  imageSize(name) {
    const buf = fs.readFileSync(path.join(projectPaths(module.exports.projectDir).assets, `${name}.png`));
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  // 任意 png 文件（品牌 logo 等）；name 用文件名
  imageFile(x, y, file, o = {}) {
    const name = path.basename(file, '.png');
    const buf = fs.readFileSync(file);
    const iw = buf.readUInt32BE(16), ih = buf.readUInt32BE(20);
    let w = o.w, h = o.h;
    if (w && !h) h = Math.round(w * ih / iw);
    if (h && !w) w = Math.round(h * iw / ih);
    if (!w) { w = iw; h = ih; }
    if (o.align === 'center') x = x - w / 2;
    const fileId = 'img_' + name.replace(/[^a-z0-9]/gi, '_');
    const el = base('image', x, y, w, h, { roughness: 0 });
    Object.assign(el, { fileId, status: 'saved', scale: [1, 1], crop: null });
    this.files[fileId] = { mimeType: 'image/png', id: fileId, dataURL: 'data:image/png;base64,' + buf.toString('base64'), created: Date.now(), name: `${name}.png` };
    return this.push(el);
  }

  // ---- 复合图形 ----
  robot(x, y, s = 1, o = {}) {
    const col = o.color || C.ink;
    this.line([[x + 100 * s, y - 30 * s], [x + 100 * s, y]], { stroke: col });
    this.ellipse(x + 88 * s, y - 54 * s, 24 * s, 24 * s, { stroke: col, fill: o.fill || C.fYellow, fillStyle: 'solid' });
    this.rect(x, y, 200 * s, 150 * s, { stroke: col, round: true, fill: o.fill || C.fBlue });
    this.ellipse(x + 45 * s, y + 45 * s, 36 * s, 36 * s, { stroke: col, fill: '#fff', fillStyle: 'solid' });
    this.ellipse(x + 119 * s, y + 45 * s, 36 * s, 36 * s, { stroke: col, fill: '#fff', fillStyle: 'solid' });
    this.ellipse(x + 57 * s, y + 57 * s, 12 * s, 12 * s, { stroke: col, fill: col, fillStyle: 'solid' });
    this.ellipse(x + 131 * s, y + 57 * s, 12 * s, 12 * s, { stroke: col, fill: col, fillStyle: 'solid' });
    this.line([[x + 60 * s, y + 110 * s], [x + 85 * s, y + 122 * s], [x + 115 * s, y + 122 * s], [x + 140 * s, y + 110 * s]], { stroke: col, round: true });
    if (!o.headOnly) this.rect(x + 30 * s, y + 160 * s, 140 * s, 90 * s, { stroke: col, round: true, fill: C.fGray });
  }
  laptop(x, y, s = 1, o = {}) {
    this.rect(x, y, 260 * s, 160 * s, { round: true, fill: o.screen || C.fGray, ...o });
    this.rect(x - 20 * s, y + 160 * s, 300 * s, 22 * s, { round: true, fill: C.fGray, fillStyle: 'solid' });
  }
  phone(x, y, s = 1, o = {}) {
    // 竖屏智能手机：圆角轮廓 + 听筒 + home 键，(x,y)=左上角，约 110s×200s
    this.rect(x, y, 110 * s, 200 * s, { round: true, ...o, fill: o.fill || C.fGray });
    this.line([[x + 40 * s, y + 18 * s], [x + 70 * s, y + 18 * s]], { stroke: o.stroke || C.gray });
    this.ellipse(x + 48 * s, y + 172 * s, 14 * s, 12 * s, { stroke: o.stroke || C.gray });
  }
  cloud(cx, cy, w, o = {}) {
    // 椭圆 + 7 个鼓包的闭合曲线
    const h = w * 0.55;
    const pts = [];
    const N = 140;
    for (let i = 0; i <= N; i++) {
      const th = (i / N) * Math.PI * 2;
      const f = 1 + 0.13 * Math.abs(Math.sin(3.5 * th));
      pts.push([cx + (w / 2) * Math.cos(th) * f, cy + (h / 2) * Math.sin(th) * f]);
    }
    return this.line(pts, { fill: o.fill || '#fff', fillStyle: 'solid', ...o });
  }
  person(x, y, s = 1, o = {}) {
    this.ellipse(x, y, 60 * s, 60 * s, { fill: o.fill || C.fYellow, fillStyle: 'solid', ...o });
    this.line([[x + 30 * s, y + 60 * s], [x + 30 * s, y + 140 * s]], o);
    this.line([[x - 20 * s, y + 90 * s], [x + 30 * s, y + 75 * s], [x + 80 * s, y + 90 * s]], o);
    this.line([[x + 0 * s, y + 200 * s], [x + 30 * s, y + 140 * s], [x + 60 * s, y + 200 * s]], o);
  }
  checkbox(x, y, label, o = {}) {
    this.rect(x, y, 40, 40, { round: true, fill: o.fill || C.fGreen, fillStyle: 'solid' });
    this.line([[x + 8, y + 20], [x + 17, y + 31], [x + 34, y + 8]], { stroke: C.green, strokeWidth: 3 });
    this.text(x + 60, y - 6, label, { size: o.size || 40 });
  }
  moon(cx, cy, r) {
    const pts = [];
    for (let k = 0; k <= 24; k++) { const a = Math.PI * 0.35 + (k / 24) * Math.PI * 1.35; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    for (let k = 24; k >= 0; k--) { const a = Math.PI * 0.35 + (k / 24) * Math.PI * 1.35; pts.push([cx + 0.45 * r + Math.cos(a) * r * 0.8, cy - 0.1 * r + Math.sin(a) * r * 0.8]); }
    pts.push(pts[0]);
    return this.line(pts, { fill: C.fYellow, fillStyle: 'solid', stroke: C.orange });
  }
  squiggle(x1, x2, y, o = {}) {
    const pts = [];
    for (let px = x1; px <= x2; px += 12) pts.push([px, y + Math.sin((px - x1) / 12) * 5]);
    return this.line(pts, { stroke: o.color || C.red, strokeWidth: 3 });
  }

  // 渲染器直接用的文档（不落盘）：片尾品牌卡等虚拟场景用
  toRenderDoc() {
    if (this.beat + 1 !== this.segments.length) throw new Error(`${this.name}: ${this.beat + 1} beats but ${this.segments.length} narration segments`);
    return { elements: this.elements, files: this.files, beatOf: this.beatOf, segments: this.segments };
  }

  // 马克笔高亮：无描边实底、抖动大，放在文字前面 push 就垫在字下；默认跟随主题色（不传 theme 时仍是黄）
  highlight(x, y, w, h, o = {}) {
    const col = o.color || (this.th || THEME).highlight;
    return this.rect(x, y, w, h, { fill: col, stroke: col, fillStyle: 'solid', roughness: o.roughness ?? 2.2, strokeWidth: 3, opacity: o.opacity ?? 90 });
  }
  // 场景大标题：默认用主题色（不传 theme 时=品牌蓝），和旧版 `text(...,{color:C.brand})` 一致
  heading(x, y, text, o = {}) {
    const size = o.size || 90;
    return this.text(x, y, text, { size, color: o.color || (this.th || THEME).accent, bold: o.bold !== false, align: o.align || 'left', font: o.font });
  }
  // 眉标 kicker：小圆角标签，栏目感/分段感（SimonTalk 每期顶部的小栏目名）。默认主题色实底 + 白字
  kicker(x, y, text, o = {}) {
    const size = o.size || 30;
    const h = size + 26, padX = 22;
    const w = measure(text, size).width + padX * 2;
    const xx = o.align === 'center' ? x - w / 2 : x;
    this.rect(xx, y, w, h, { fill: o.fill || (this.th || THEME).accent, fillStyle: 'solid', round: h / 2 });
    this.text(xx + padX, y + 13, text, { size, color: o.ink || '#ffffff' });
    return { w, h };
  }
  // 统一卡片 callout：主题色实底圆角卡 + 可选标题(主题色)+正文(墨色)。替代每期手写的 rect+label+text 三行，风格统一
  callout(x, y, w, h, o = {}) {
    const ts = o.titleSize || 34, bs = o.bodySize || 54, pad = o.pad || 32;
    this.rect(x, y, w, h, { fill: o.fill || (this.th || THEME).fill, fillStyle: 'solid', round: o.round || 24 });
    let by = y + (o.titlePad || 34);
    if (o.title) this.text(x + pad, by, o.title, { size: ts, color: o.accent || (this.th || THEME).accent, bold: true });
    const bodyY = o.title ? by + ts + 12 : y + h / 2 - bs * 0.6;
    if (o.body) this.text(x + pad, bodyY, o.body, { size: bs, color: o.bodyColor || C.ink, bold: true });
    return this;
  }
  // 大数字视觉锤 stat：主题色卡片里放大数字 + 下方小标签（SimonTalk 的「3000块 / 100%」式重点）。cx 为中点
  stat(cx, y, num, label, o = {}) {
    const ns = o.numSize || 140, ls = o.labelSize || 36;
    const nw = measure(String(num), ns).width, lw = label ? measure(label, ls).width : 0;
    const w = Math.max(nw, lw) + 70, h = ns + (label ? ls + 30 : 18);
    const x = cx - w / 2;
    this.rect(x, y, w, h, { fill: o.fill || (this.th || THEME).fill, fillStyle: 'solid', round: 22 });
    this.text(cx, y + (label ? 16 : h / 2 - ns * 0.5), num, { size: ns, align: 'center', color: o.accent || (this.th || THEME).accent, bold: true });
    if (label)     this.text(cx, y + 16 + ns + 6, label, { size: ls, align: 'center', color: o.labelColor || C.gray });
    return this;
  }
  // 底部结论条 takeaway：一句话总结/转场强调（替代每期手写的 fYellow/fGreen 圆角条与椭圆）
  // solid:true = 主题色实底白字（强结论）；默认 = 主题浅底墨字。cx 居中，宽度按字数自适应
  takeaway(cx, y, text, o = {}) {
    const size = o.size || 42;
    const w = Math.max(o.w || 0, measure(text, size).width + (o.padX || 90));
    const h = o.h || Math.max(96, size * 2.0);
    const solid = !!o.solid;
    this.rect(cx - w / 2, y, w, h, {
      fill: solid ? (o.accent || (this.th || THEME).accent) : (o.fill || (this.th || THEME).fill),
      fillStyle: 'solid', round: o.round ?? h / 2,
    });
    this.text(cx, y + Math.max(8, (h - size * 1.25) / 2), text,
      { size, align: 'center', color: solid ? '#ffffff' : (o.color || C.ink), bold: !solid });
    return this;
  }
  // 两栏对比竖线 compare：主题色虚线 + 可选居中标签（≠ / VS），替代每期手写的灰色 dashed line
  compare(cx, y1, y2, o = {}) {
    this.line([[cx, y1], [cx, y2]], { strokeStyle: 'dashed', stroke: o.stroke || (this.th || THEME).accent, strokeWidth: o.strokeWidth || 3 });
    if (o.label) {
      const size = o.size || 56, my = (y1 + y2) / 2, h = size + 26;
      const w = measure(o.label, size).width + 44;
      this.rect(cx - w / 2, my - h / 2, w, h, { fill: o.fill || PAPER_BASE, fillStyle: 'solid', round: h / 2 });
      this.text(cx, my - size * 0.62, o.label, { size, align: 'center', color: o.color || (this.th || THEME).accent, bold: true });
    }
    return this;
  }
  // 标题下的灰色副标（每期每段都写的一行小字），统一字号/颜色
  subtitle(x, y, text, o = {}) {
    return this.text(x, y, text, { size: o.size || 40, color: o.color || C.gray, align: o.align || 'left' });
  }
  // 品牌标：星号 + 手写名 + 品牌色下划线（同水印/片尾母题）。x 为左边，size 字号；返回宽度
  brandMark(x, y, size = 56, o = {}) {
    const b = cfg.brand || {}; const name = o.name || b.name || 'Your Brand'; const accent = o.accent || b.accent || C.green;
    const w = measure(name, size).width;
    const r = size * 0.32, sx = x - r * 0.9, sy = y + r * 0.6;
    const star = [[sx, sy - r], [sx + r * 0.28, sy - r * 0.28], [sx + r, sy], [sx + r * 0.28, sy + r * 0.28], [sx, sy + r], [sx - r * 0.28, sy + r * 0.28], [sx - r, sy], [sx - r * 0.28, sy - r * 0.28], [sx, sy - r]];
    this.line(star, { stroke: accent, fill: accent, fillStyle: 'solid', roughness: 0.8 });
    this.text(x, y, name, { size, color: o.color || b.ink || C.ink });
    this.line([[x, y + size * 1.3], [x + w * 0.55, y + size * 1.3 + size * 0.1], [x + w, y + size * 1.2]], { stroke: accent, strokeWidth: Math.max(4, size * 0.13), roughness: 1.3, round: true });
    return w;
  }
  // 封面版式。opts: { ratio:'16:9'|'3:4', title:'两行\n用换行', accent: 高亮第几行(0 起，默认最后一行), sticker:'贴纸名', tag:'左上标签', sub:'副标', color: 高亮字色 }
  coverLayout(o = {}) {
    const ratio = o.ratio || '4:3';
    const [cw, ch] = coverSize(ratio);
    const portrait = ch > cw;
    const cv = cfg.cover || {};
    const lines = String(o.title || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const accentIdx = o.accent == null ? lines.length - 1 : o.accent;
    const accentColor = o.color || C.brand, hl = o.highlight || C.fYellow;
    const maxLen = Math.max(...lines.map((l) => [...l].reduce((n, ch) => n + (isCJK(ch) ? 1 : 0.55), 0)));
    // SimonTalk 式「数字视觉锤」：boost 把 boostIdx 行放大（默认 1 = 与旧版渲染逐像素同逻辑）
    const boost = o.boost || 1;
    const boostIdx = o.boostIdx == null ? accentIdx : o.boostIdx;
    const tagFill = o.tagFill || cv.tagFill || C.fYellow;
    const tagInk = o.tagInk || cv.tagInk || C.ink;
    const rowSizes = (capS, availW) => {
      const base = Math.min(capS, Math.floor(availW / Math.max(4, maxLen)));
      return lines.map((l, i) => {
        if (i !== boostIdx || boost <= 1) return base;
        const len = [...l].reduce((n, ch) => n + (isCJK(ch) ? 1 : 0.55), 0);
        return Math.min(Math.round(base * boost), Math.floor(availW / Math.max(4, len)), Math.round(capS * boost));
      });
    };
    const rowOffsets = (rs, lhR) => { const off = []; let a = 0; for (const s of rs) { off.push(a); a += s * lhR; } return off; };
    if (cv.frame !== false) this.rect(28, 28, cw - 56, ch - 56, { stroke: cv.frameColor || C.ink, strokeWidth: 7, roughness: 1.6, round: true });
    const tag = o.tag === undefined ? cv.seriesTag : o.tag;
    if (portrait) {
      // 竖版：标签 → 标题居中 → 贴纸 → 品牌标
      let y = 110;
      if (tag) { const tw = measure(tag, 40).width + 60; this.rect(cw / 2 - tw / 2, y, tw, 74, { round: true, fill: tagFill, fillStyle: 'solid' }); this.text(cw / 2, y + 16, tag, { size: 40, align: 'center', color: tagInk }); y += 130; }
      const rs = rowSizes(170, cw - 120), offs = rowOffsets(rs, 1.22);
      lines.forEach((l, i) => {
        const w = measure(l, rs[i]).width;
        if (i === accentIdx) this.highlight(cw / 2 - w / 2 - 18, y + offs[i] + rs[i] * 0.42, w + 36, rs[i] * 0.62, { color: hl });
        this.text(cw / 2, y + offs[i], l, { size: rs[i], align: 'center', color: i === accentIdx ? accentColor : C.ink });
      });
      y += offs[offs.length - 1] + rs[rs.length - 1] * 1.22 + 20;
      if (o.sub) { this.text(cw / 2, y, o.sub, { size: 44, align: 'center', color: C.gray }); y += 90; }
      const brandY = ch - 150;
      if (o.sticker) {
        // 宽图（如 logos-vs）按高度放会横向溢出，宽度同时限在画布内
        const d = this.imageSize(o.sticker), maxW = cw - 180;
        const room = brandY - 40 - y;
        const hCap = Math.min(640, room), h = Math.min(hCap, Math.round(maxW * d.h / d.w));
        this.image(cw / 2, y + 10 + (hCap - h) / 2, o.sticker, { h, align: 'center' });
      }
      const bw = measure(cfg.brand.name || 'Your Brand', 52).width;
      this.brandMark(cw / 2 - bw / 2, brandY, 52);
    } else if (cw / ch < 1.6) {
      // 4:3 等偏方横版：标题通栏大字 → 副标 → 贴纸右下（尽量大，只避开会撞到的标题行）→ 品牌标左下
      let y = 96;
      if (tag) { const tw = measure(tag, 40).width + 60; this.rect(110, y, tw, 74, { round: true, fill: tagFill, fillStyle: 'solid' }); this.text(110 + tw / 2, y + 16, tag, { size: 40, align: 'center', color: tagInk }); y += 130; }
      const rs = rowSizes(Math.round(ch * 0.15), cw - 220), offs = rowOffsets(rs, 1.2);
      const rows = [];
      lines.forEach((l, i) => {
        const w = measure(l, rs[i]).width;
        if (i === accentIdx) this.highlight(110 - 18, y + offs[i] + rs[i] * 0.42, w + 36, rs[i] * 0.62, { color: hl });
        this.text(110, y + offs[i], l, { size: rs[i], color: i === accentIdx ? accentColor : C.ink });
        rows.push({ right: 110 + w + 36, bottom: y + offs[i] + rs[i] * 1.05 });
      });
      y += offs[offs.length - 1] + rs[rs.length - 1] * 1.2 + 10;
      if (o.sub) { const w = measure(o.sub, 44).width; this.text(114, y, o.sub, { size: 44, color: C.gray }); rows.push({ right: 114 + w, bottom: y + 50 }); y += 80; }
      if (o.sticker) {
        const asp = (() => { const d = this.imageSize(o.sticker); return d.w / d.h; })();
        const bottom = ch - 70, right = cw - 100;
        let h = Math.round(ch * 0.55);
        for (; h > ch * 0.25; h -= 10) {
          const top = bottom - h, left = right - h * asp;
          if (!rows.some((r) => r.right > left && r.bottom > top)) break;
        }
        this.image(right - (h * asp) / 2, bottom - h, o.sticker, { h, align: 'center' });
      }
      this.brandMark(120, ch - 150, 56);
    } else {
      // 16:9 宽横版：左侧标题，右侧贴纸列（宽 36%），左下品牌标
      const stickerCol = o.sticker ? Math.round(cw * 0.36) : 0;
      const leftW = cw - stickerCol - 220;
      let y = 96;
      if (tag) { const tw = measure(tag, 40).width + 60; this.rect(110, y, tw, 74, { round: true, fill: tagFill, fillStyle: 'solid' }); this.text(110 + tw / 2, y + 16, tag, { size: 40, align: 'center', color: tagInk }); y += 120; }
      const rs = rowSizes(Math.round(ch * 0.185), leftW), offs = rowOffsets(rs, 1.2);
      const blockH = offs[offs.length - 1] + rs[rs.length - 1] * 1.2 + (o.sub ? 90 : 0);
      y = Math.max(y, (ch - 160 - y - blockH) / 2 + y - 20);
      let accentRight = 0, maxTitleRight = 0;
      lines.forEach((l, i) => {
        const w = measure(l, rs[i]).width;
        maxTitleRight = Math.max(maxTitleRight, 110 + w);
        if (i === accentIdx) { this.highlight(110 - 18, y + offs[i] + rs[i] * 0.42, w + 36, rs[i] * 0.62, { color: hl }); accentRight = 110 + w + 36; }
        this.text(110, y + offs[i], l, { size: rs[i], color: i === accentIdx ? accentColor : C.ink });
      });
      if (o.sub) this.text(114, y + offs[offs.length - 1] + rs[rs.length - 1] * 1.2 + 10, o.sub, { size: 48, color: C.gray });
      if (o.sticker) {
        // 贴纸坐右下角贴底；水平位置 = 中点略偏左（右侧留更大呼吸空隙），左护栏防挤标题、右护栏防贴边框
        const d = this.imageSize(o.sticker);
        const maxW = stickerCol - 40;
        const h = Math.min(Math.round(ch * 0.80), Math.round(maxW * d.h / d.w));
        const sw = h * d.w / d.h;
        const frameR = cw - 32;
        const cx = Math.min(Math.max((accentRight + frameR) / 2 - 55, maxTitleRight + 70 + sw / 2), frameR - sw / 2 - 40);
        this.image(cx, ch - 50 - h, o.sticker, { h, align: 'center' });
      }
      this.brandMark(120, ch - 150, 56);
    }
    return this;
  }

  save(outDir) {
    OUT = outDir; fs.mkdirSync(OUT, { recursive: true });
    const safe = (cfg.captions && cfg.captions.safeTop) || 960;
    const label = (el) => `${el.type}${el.text ? `「${el.text}」` : ''}`;
    if (!this.isCover) for (const el of this.elements) if (el.y + el.height > safe) console.warn(`  ⚠ ${this.name}: ${label(el)} 底边 ${Math.round(el.y + el.height)} 超过字幕安全线 ${safe}`);
    // 品牌水印占位（config.json brand.watermark）：角上 300×130 别放元素
    const wm = cfg.brand && cfg.brand.watermark;
    if (!this.isCover && wm && wm.enabled !== false && cfg.brand.name) {
      const pos = wm.position || 'top-right', zw = 320, zh = 130;
      const zx = pos.endsWith('left') ? 0 : W - zw, zy = pos.startsWith('bottom') ? safe - zh : 0;
      for (const el of this.elements) if (el.x < zx + zw && el.x + el.width > zx && el.y < zy + zh && el.y + el.height > zy) console.warn(`  ⚠ ${this.name}: ${label(el)} 压到${pos}水印区（x ${zx}~${zx + zw}, y ${zy}~${zy + zh}）`);
    }
    if (this.beat + 1 !== this.segments.length) {
      throw new Error(`${this.name}: ${this.beat + 1} beats but ${this.segments.length} narration segments`);
    }
    const doc = {
      type: 'excalidraw', version: 2, source: 'grok-bot-video', elements: this.elements,
      appState: { viewBackgroundColor: '#ffffff', gridSize: null }, files: this.files,
    };
    // 只出 Obsidian 插件格式：图片不内嵌 base64，走 Embedded Files 引用同目录 png
    const embedded = Object.values(this.files).map((f) => `${f.id}: [[${f.name}]]`).join('\n');
    const mdDoc = { ...doc, files: {} };
    // Obsidian Excalidraw 插件新格式：.excalidraw.md
    const textEls = this.elements.filter((e) => e.type === 'text').map((e) => `${e.text} ^${e.id}`).join('\n\n');
    const md = `---\n\nexcalidraw-plugin: parsed\ntags: [excalidraw]\n\n---\n==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠== You can decompress Drawing data with the command palette: 'Decompress current Excalidraw file'. For more info check in plugin settings under 'Saving'\n\n\n# Excalidraw Data\n\n## Text Elements\n${textEls}\n\n${embedded ? `## Embedded Files\n${embedded}\n\n` : ''}%%\n## Drawing\n\`\`\`json\n${JSON.stringify(mdDoc)}\n\`\`\`\n%%`;
    fs.writeFileSync(path.join(OUT, `${this.name}.excalidraw.md`), md);
    return { name: this.name, segments: this.segments, beatOf: this.beatOf };
  }
}

const W = 1920, H = 1080, CX = W / 2, CY = H / 2;

// 把所有场景写到 <期目录>/scenes/，生成 script.json 和 旁白稿.md
function build(projectDir, sceneList, extra = {}) {
  const P = projectPaths(projectDir);
  const meta = sceneList.map((s) => s.save(P.scenes));
  fs.writeFileSync(P.script, JSON.stringify(meta, null, 1));
  // 封面：extra.cover = (s, ratio) => { s.coverLayout({...ratio, ...}) }，每个画幅一张，存 scenes/00-cover-<ratio>.excalidraw.md + cover.json
  const covers = [];
  if (extra.cover) {
    for (const ratio of (cfg.cover && cfg.cover.ratios) || ['4:3', '3:4', '16:9']) {
      const tag = ratio.replace(':', 'x');
      const s = new Scene(`00-cover-${tag}`, '封面'); s.isCover = true; s.nextBeat();
      extra.cover(s, ratio);
      const [w, h] = coverSize(ratio);
      const m = s.save(P.scenes); covers.push({ ...m, ratio, width: w, height: h });
      for (const f of Object.values(s.files)) fs.copyFileSync(path.join(P.assets, f.name), path.join(P.scenes, f.name));
    }
    fs.writeFileSync(path.join(P.scenes, 'cover.json'), JSON.stringify(covers, null, 1));
  } else if (fs.existsSync(path.join(P.scenes, 'cover.json'))) fs.rmSync(path.join(P.scenes, 'cover.json'));
  // 主题导出给渲染器（render.js 读 paper/pen 染纸底；不传 theme 时不写，保持旧行为）
  const tj = path.join(P.scenes, 'theme.json');
  if (THEME.active) fs.writeFileSync(tj, JSON.stringify(THEME));
  else if (fs.existsSync(tj)) fs.rmSync(tj);
  // 贴纸 png 复制到 scenes/ 旁边，供 .excalidraw.md 的 Embedded Files 引用
  for (const s of sceneList) for (const f of Object.values(s.files)) fs.copyFileSync(path.join(P.assets, f.name), path.join(P.scenes, f.name));
  writeNote(P, meta);
  console.log(meta.map((s) => `${s.name}: ${s.segments.length} beats, ${s.beatOf.length} elements`).concat(covers.map((c) => `${c.name}: 封面 ${c.width}×${c.height}, ${c.beatOf.length} elements`)).join('\n'));
  return meta;
}

// 旁白稿.md：每期自动生成，含旁白分段、场景链接、时长（配音后才有）、成片
function writeNote(P, meta) {
  const L = [`# ${P.name} · 旁白稿`, '', `> 自动生成（\`wb scenes\` / \`wb build\` 会覆盖），别手改；改旁白去 \`scenes.js\`。`, ''];
  if (fs.existsSync(P.final)) L.push(`成片：[final.mp4](file://${encodeURI(P.final)})（在后台目录，视频不放进期目录）`, '');
  let total = 0;
  for (const s of meta) {
    const a = path.join(P.audio, `${s.name}.json`);
    let dur = '';
    if (fs.existsSync(a)) { const d = JSON.parse(fs.readFileSync(a)).duration; total += d; dur = `（${d.toFixed(0)}s）`; }
    L.push(`## ${s.name}${dur}  [[${s.name}.excalidraw]]`, '');
    s.segments.forEach((seg, i) => L.push(`${i + 1}. ${seg}`));
    L.push('');
  }
  if (total) L.splice(4, 0, `全片旁白约 ${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, '0')}`, '');
  fs.writeFileSync(P.note, L.join('\n'));
}

// 封面画幅
const COVER_SIZES = { '4:3': [1440, 1080], '3:4': [1080, 1440], '16:9': [1920, 1080], '1:1': [1080, 1080] };
const coverSize = (ratio) => COVER_SIZES[ratio] || COVER_SIZES['4:3'];

// 片尾品牌卡：名字（或 logo）+ 品牌色划线 + slogan + CTA，一个 beat，逐笔画出。由 render.js 在成片末尾追加。
function brandEndCard(brand) {
  // 两拍：第 1 拍 logo/名字 + 划线 + slogan（旁白念 slogan）；第 2 拍 CTA 胶囊（旁白念 CTA）。
  // 段数必须等于 beat 数（toRenderDoc 会断言），所以有 CTA 就写两段。
  // 2026-09-29 用户定：片尾是固定模板，「点赞 · 关注 · 评论区聊聊」也要配音念出来
  const ctaText = (brand.endCard && brand.endCard.enabled !== false && brand.endCard.cta) || '';
  const s = new Scene('99-brand', ctaText ? `品牌卡 | ${ctaText}` : '品牌卡');
  s.nextBeat();
  const accent = brand.accent || C.green, ink = brand.ink || C.ink;
  let nameW, top = 300, bottom;
  const logo = brand.logo && expandHome(brand.logo);
  if (logo && fs.existsSync(logo)) {
    const el = s.imageFile(CX, 230, logo, { h: 280, align: 'center' });
    nameW = el.width; top = el.y; bottom = el.y + el.height;
  } else {
    const size = 150;
    const t = s.text(CX, top, brand.name, { size, align: 'center', color: ink });
    nameW = t.width; bottom = t.y + size * 1.1;
  }
  // 左上角星号（呼应头像）
  const r = 26, sx = CX - nameW / 2 - 40, sy = top + 10;
  const star = [[sx, sy - r], [sx + r * 0.28, sy - r * 0.28], [sx + r, sy], [sx + r * 0.28, sy + r * 0.28], [sx, sy + r], [sx - r * 0.28, sy + r * 0.28], [sx - r, sy], [sx - r * 0.28, sy - r * 0.28], [sx, sy - r]];
  s.line(star, { stroke: accent, fill: accent, fillStyle: 'solid', roughness: 0.8 });
  // 品牌色划线
  s.line([[CX - nameW / 2 - 10, bottom + 22], [CX + nameW * 0.05, bottom + 34], [CX + nameW / 2 + 10, bottom + 12]], { stroke: accent, strokeWidth: 12, roughness: 1.3, round: true });
  // slogan：品牌色加粗（2026-09-29 用户反馈灰色太弱不醒目）；brand.sloganColor 可覆盖
  if (brand.slogan) s.text(CX, bottom + 88, brand.slogan, { size: brand.sloganSize || 50, align: 'center', color: brand.sloganColor || accent, bold: true });
  if (brand.endCard && brand.endCard.cta) {
    s.nextBeat(); // CTA 单独一拍：旁白念「点赞 · 关注 · 评论区聊聊」时画出来
    const y = bottom + 220;
    // CTA 胶囊默认从品牌色派生（浅底+同色描边+同色字），和 logo/划线/slogan 同调；
    // brand.endCard.ctaFill / ctaColor / ctaStroke 可逐期覆盖
    const ctaFill = brand.endCard.ctaFill || lighten(accent, 0.2); // 混白 80% → 浅品牌色底（lighten amt=保留原色比例）
    const ctaStroke = brand.endCard.ctaStroke || accent;
    const ctaInk = brand.endCard.ctaColor || accent;
    s.rect(CX - 300, y, 600, 96, { round: true, fill: ctaFill, fillStyle: 'solid', stroke: ctaStroke });
    s.text(CX, y + 24, brand.endCard.cta, { size: 38, align: 'center', color: ctaInk, bold: true });
  }
  return s;
}
const expandHome = (p) => { const e = p.replace(/^~/, process.env.HOME); return path.isAbsolute(e) ? e : path.join(__dirname, '..', e); };

module.exports = { Scene, C, W, H, CX, CY, build, writeNote, brandEndCard, projectDir: null };
// 项目 scenes.js 里 require 后先调用 use(__dirname, { theme })；image() 才知道贴纸在哪，theme 决定内容层色调
module.exports.use = (dir, opts = {}) => { module.exports.projectDir = dir; setTheme(opts && opts.theme ? opts.theme : (cfg.theme || null)); return module.exports; };
