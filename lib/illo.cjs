// 白板插画库：用 DSL 基础图元「画」出景点/食物插画，替代没有的元素贴图。
// 为什么不用生成贴图：城市片要批量到 300+ 城，逐个生图不可行；而 rough.js 手绘图元本身就是
// 白板片的画风，且每笔会跟着旁白逐笔画出来（「讲到哪画到哪」），比贴静态 PNG 更贴片子的逻辑。
// 用法：const illo = require(path.join(WB_ROOT,'lib/illo.cjs'));
//       illo(s, 'pagoda', { x: 150, y: 340, w: 460, h: 380, c: s.accent() });
// 约定：坐标一律归一化到 0..1，调用方只给一个盒子；每幅控制在 12 个图元以内，
// 元素太多会把绘制拖长，触发时序落后（笔还没收，句子已经念完）。
const { C } = require('./scene-dsl');

const P = {
  yellow: '#ffec99', blue: '#a5d8ff', green: '#b2f2bb', red: '#ffc9c9',
  grey: '#e9ecef', white: '#ffffff', orange: '#ffb865', sand: '#ffe0b2',
};

const shapes = {
  mountain(s, B) {
    const { X, Y, w, h, c } = B;
    s.ellipse(X(0.74), Y(0.16), 0.2 * w, 0.2 * w, { stroke: c, fill: P.yellow, fillStyle: 'solid' });
    s.line([[X(0.02), Y(0.82)], [X(0.34), Y(0.24)], [X(0.62), Y(0.82)]], { stroke: C.ink, fill: P.blue, strokeWidth: 3 });
    s.line([[X(0.44), Y(0.86)], [X(0.72), Y(0.38)], [X(1.0), Y(0.86)]], { stroke: C.ink, fill: P.green, strokeWidth: 3 });
    s.line([[X(0.26), Y(0.44)], [X(0.34), Y(0.24)], [X(0.44), Y(0.44)]], { stroke: P.white, strokeWidth: 3, fill: P.white });
    s.line([[X(0.0), Y(0.9)], [X(1.0), Y(0.9)]], { stroke: C.gray, strokeWidth: 3 });
  },
  snow(s, B) {
    const { X, Y, w, h, c } = B;
    s.line([[X(0.0), Y(0.8)], [X(0.28), Y(0.3)], [X(0.56), Y(0.8)]], { stroke: C.ink, fill: P.white, fillStyle: 'solid', strokeWidth: 3 });
    s.line([[X(0.42), Y(0.86)], [X(0.7), Y(0.36)], [X(1.0), Y(0.86)]], { stroke: C.ink, fill: P.blue, strokeWidth: 3 });
    s.line([[X(0.56), Y(0.5)], [X(0.7), Y(0.36)], [X(0.84), Y(0.5)]], { stroke: C.ink, strokeWidth: 2, fill: P.white, fillStyle: 'solid' });
    for (let i = 0; i < 3; i++) {
      const fx = X(0.12 + i * 0.3), fy = Y(0.14 + (i % 2) * 0.08), r = 0.045 * w;
      s.line([[fx - r, fy], [fx + r, fy]], { stroke: c, strokeWidth: 3 });
      s.line([[fx, fy - r], [fx, fy + r]], { stroke: c, strokeWidth: 3 });
    }
  },
  sea(s, B) {
    const { X, Y, w, h, c } = B;
    s.ellipse(X(0.78), Y(0.2), 0.22 * w, 0.22 * w, { stroke: c, fill: P.yellow, fillStyle: 'solid' });
    s.line([[X(0.1), Y(0.42)], [X(0.5), Y(0.42)], [X(0.42), Y(0.6)], [X(0.1), Y(0.6)]], { stroke: C.ink, fill: P.white, fillStyle: 'solid' });
    s.line([[X(0.5), Y(0.42)], [X(0.5), Y(0.62)]], { stroke: C.ink, strokeWidth: 3 });
    for (let i = 0; i < 3; i++) {
      const y0 = 0.66 + i * 0.11;
      const pts = [];
      for (let k = 0; k <= 20; k++) pts.push([X(k / 20), Y(y0) + Math.sin((k / 20) * Math.PI * 3 + i) * 0.022 * h]);
      s.line(pts, { stroke: c, strokeWidth: 3 });
    }
  },
  island(s, B) {
    const { X, Y, w, h, c } = B;
    s.ellipse(X(0.72), Y(0.18), 0.2 * w, 0.2 * w, { stroke: c, fill: P.yellow, fillStyle: 'solid' });
    s.line([[X(0.18), Y(0.68)], [X(0.36), Y(0.6)], [X(0.54), Y(0.68)]], { stroke: C.ink, fill: P.sand, strokeWidth: 3 });
    s.line([[X(0.36), Y(0.6)], [X(0.36), Y(0.3)]], { stroke: C.ink, strokeWidth: 4 });
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + (i - 1.5) * 0.55;
      s.line([[X(0.36), Y(0.3)], [X(0.36) + Math.cos(a) * 0.2 * w, Y(0.3) + Math.sin(a) * 0.16 * h]], { stroke: c, strokeWidth: 4, round: true });
    }
    for (let i = 0; i < 2; i++) {
      const y0 = 0.78 + i * 0.12;
      const pts = [];
      for (let k = 0; k <= 20; k++) pts.push([X(k / 20), Y(y0) + Math.sin((k / 20) * Math.PI * 4 + i) * 0.02 * h]);
      s.line(pts, { stroke: c, strokeWidth: 3 });
    }
  },
  lake(s, B) {
    const { X, Y, w, h, c } = B;
    s.line([[X(0.0), Y(0.5)], [X(0.3), Y(0.34)], [X(0.62), Y(0.5)], [X(0.9), Y(0.4)]], { stroke: C.gray, strokeWidth: 3 });
    s.ellipse(X(0.5), Y(0.72), 0.92 * w, 0.42 * h, { stroke: c, fill: P.blue, strokeWidth: 3 });
    s.line([[X(0.42), Y(0.66)], [X(0.62), Y(0.66)], [X(0.56), Y(0.76)], [X(0.46), Y(0.76)]], { stroke: C.ink, fill: P.white, fillStyle: 'solid' });
    s.line([[X(0.54), Y(0.66)], [X(0.54), Y(0.52)]], { stroke: C.ink, strokeWidth: 3 });
    for (let i = 0; i < 3; i++) s.line([[X(0.1 + i * 0.05), Y(0.62)], [X(0.08 + i * 0.05), Y(0.46)]], { stroke: c, strokeWidth: 3 });
  },
  river(s, B) {
    const { X, Y, w, h, c } = B;
    const left = [], right = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      left.push([X(0.06 * u + 0.16 + 0.18 * Math.sin(u * Math.PI)), Y(u)]);
      right.push([X(0.06 * u + 0.52 + 0.18 * Math.sin(u * Math.PI)), Y(u)]);
    }
    s.line([...left, ...right.reverse()], { stroke: c, fill: P.blue, strokeWidth: 3 });
    s.line([[X(0.02), Y(0.2)], [X(0.12), Y(0.5)]], { stroke: C.gray, strokeWidth: 3 });
    s.line([[X(0.9), Y(0.28)], [X(0.86), Y(0.6)]], { stroke: C.gray, strokeWidth: 3 });
    s.line([[X(0.42), Y(0.5)], [X(0.58), Y(0.5)], [X(0.54), Y(0.62)], [X(0.46), Y(0.62)]], { stroke: C.ink, fill: P.white, fillStyle: 'solid' });
  },
  waterfall(s, B) {
    const { X, Y, w, h, c } = B;
    s.line([[X(0.0), Y(0.16)], [X(0.62), Y(0.16)], [X(0.62), Y(0.56)], [X(1.0), Y(0.56)]], { stroke: C.ink, fill: P.green, strokeWidth: 3 });
    for (let i = 0; i < 4; i++) s.line([[X(0.66 + i * 0.08), Y(0.18)], [X(0.66 + i * 0.08), Y(0.72)]], { stroke: c, strokeWidth: 3 });
    const pool = [];
    for (let k = 0; k <= 16; k++) pool.push([X(k / 16), Y(0.86) + Math.sin(k) * 0.015 * h]);
    s.line(pool, { stroke: c, strokeWidth: 3 });
  },
  city(s, B) {
    const { X, Y, w, h, c } = B;
    const hs = [0.52, 0.78, 0.62, 0.86, 0.44];
    let x0 = 0.04;
    hs.forEach((v, i) => {
      const bw = 0.17;
      s.rect(X(x0), Y(1 - v), bw * w, v * h, { stroke: C.ink, fill: i % 2 ? P.grey : P.blue, strokeWidth: 3 });
      s.rect(X(x0 + bw * 0.3), Y(1 - v + 0.08), bw * 0.4 * w, 0.1 * h, { stroke: C.ink, fill: P.yellow, strokeWidth: 2 });
      s.rect(X(x0 + bw * 0.3), Y(1 - v + 0.26), bw * 0.4 * w, 0.1 * h, { stroke: C.ink, fill: P.yellow, strokeWidth: 2 });
      x0 += bw + 0.02;
    });
    s.line([[X(0.02), Y(1.0)], [X(0.98), Y(1.0)]], { stroke: C.gray, strokeWidth: 3 });
  },
  modern(s, B) {
    const { X, Y, w, h, c } = B;
    s.rect(X(0.1), Y(0.28), 0.34 * w, 0.68 * h, { stroke: C.ink, fill: P.blue, strokeWidth: 3 });
    s.line([[X(0.5), Y(0.96)], [X(0.5), Y(0.12)], [X(0.86), Y(0.42)]], { stroke: c, strokeWidth: 4 });
    s.line([[X(0.5), Y(0.12)], [X(0.5), Y(0.4)]], { stroke: c, strokeWidth: 3 });
    s.ellipse(X(0.88), Y(0.2), 0.16 * w, 0.16 * w, { stroke: c, fill: P.yellow, fillStyle: 'solid' });
    s.line([[X(0.02), Y(0.96)], [X(0.98), Y(0.96)]], { stroke: C.gray, strokeWidth: 3 });
  },
  pagoda(s, B) {
    const { X, Y, w, h, c } = B;
    s.line([[X(0.5), Y(0.06)], [X(0.5), Y(0.16)]], { stroke: C.ink, strokeWidth: 4 });
    const tiers = [0.26, 0.5, 0.74];
    tiers.forEach((v, i) => {
      const bw = 0.42 - i * 0.07;
      const cy = v;
      s.line([[X(0.5 - bw), Y(cy)], [X(0.5 - bw * 0.62), Y(cy - 0.12)], [X(0.5 + bw * 0.62), Y(cy - 0.12)], [X(0.5 + bw), Y(cy)]],
        { stroke: C.ink, fill: i % 2 ? P.red : P.yellow, strokeWidth: 3 });
      s.rect(X(0.5 - bw * 0.5), Y(cy), bw * w, 0.13 * h, { stroke: C.ink, fill: P.white, fillStyle: 'solid', strokeWidth: 3 });
    });
    s.rect(X(0.26), Y(0.87), 0.48 * w, 0.13 * h, { stroke: C.ink, fill: P.grey, fillStyle: 'solid', strokeWidth: 3 });
    s.rect(X(0.44), Y(0.9), 0.12 * w, 0.1 * h, { stroke: C.ink, fill: c, fillStyle: 'solid' });
  },
  temple(s, B) {
    const { X, Y, w, h, c } = B;
    s.line([[X(0.06), Y(0.42)], [X(0.22), Y(0.2)], [X(0.78), Y(0.2)], [X(0.94), Y(0.42)]], { stroke: C.ink, fill: P.red, strokeWidth: 3 });
    s.line([[X(0.16), Y(0.3)], [X(0.84), Y(0.3)]], { stroke: C.ink, strokeWidth: 2 });
    s.rect(X(0.2), Y(0.42), 0.6 * w, 0.34 * h, { stroke: C.ink, fill: P.yellow, strokeWidth: 3 });
    [0.3, 0.5, 0.7].forEach((u) => s.line([[X(u), Y(0.44)], [X(u), Y(0.76)]], { stroke: C.ink, strokeWidth: 3 }));
    s.rect(X(0.42), Y(0.52), 0.16 * w, 0.24 * h, { stroke: C.ink, fill: c, fillStyle: 'solid' });
    s.line([[X(0.14), Y(0.76)], [X(0.86), Y(0.76)], [X(0.94), Y(0.88)], [X(0.06), Y(0.88)]], { stroke: C.ink, fill: P.grey, strokeWidth: 3 });
  },
  wall(s, B) {
    const { X, Y, w, h, c } = B;
    const ridge = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16;
      ridge.push([X(u), Y(0.62 - 0.16 * Math.sin(u * Math.PI * 1.2))]);
    }
    s.line(ridge, { stroke: C.gray, strokeWidth: 3 });
    for (let i = 1; i < 16; i++) {
      const u = i / 16;
      const yv = 0.62 - 0.16 * Math.sin(u * Math.PI * 1.2);
      s.line([[X(u), Y(yv)], [X(u), Y(yv - 0.07)]], { stroke: C.ink, strokeWidth: 3 });
    }
    const tower = [X(0.46), Y(0.42)];
    s.rect(tower[0] - 0.1 * w, tower[1], 0.2 * w, 0.2 * h, { stroke: C.ink, fill: P.red, fillStyle: 'solid', strokeWidth: 3 });
    s.line([[X(0.3), Y(0.42)], [X(0.46), Y(0.3)], [X(0.62), Y(0.42)]], { stroke: C.ink, fill: P.yellow, strokeWidth: 3 });
    s.rect(tower[0] - 0.04 * w, tower[1] + 0.07 * h, 0.08 * w, 0.09 * h, { stroke: C.ink, fill: c, fillStyle: 'solid' });
  },
  garden(s, B) {
    const { X, Y, w, h, c } = B;
    s.ellipse(X(0.62), Y(0.52), 0.44 * w, 0.6 * h, { stroke: C.ink, fill: P.white, fillStyle: 'solid', strokeWidth: 4 });
    s.rect(X(0.06), Y(0.28), 0.34 * w, 0.62 * h, { stroke: C.ink, fill: P.grey, strokeWidth: 3 });
    s.line([[X(0.42), Y(0.9)], [X(0.42), Y(0.62)]], { stroke: C.ink, strokeWidth: 4 });
    s.ellipse(X(0.42), Y(0.5), 0.3 * w, 0.26 * h, { stroke: c, fill: P.green, fillStyle: 'solid' });
  },
  courtyard(s, B) {
    const { X, Y, w, h, c } = B;
    s.line([[X(0.08), Y(0.44)], [X(0.44), Y(0.2)], [X(0.8), Y(0.44)]], { stroke: C.ink, fill: P.grey, strokeWidth: 3 });
    s.rect(X(0.16), Y(0.44), 0.56 * w, 0.4 * h, { stroke: C.ink, fill: P.yellow, strokeWidth: 3 });
    s.rect(X(0.38), Y(0.56), 0.16 * w, 0.28 * h, { stroke: C.ink, fill: c, fillStyle: 'solid' });
    s.rect(X(0.2), Y(0.56), 0.1 * w, 0.12 * h, { stroke: C.ink, fill: P.white, fillStyle: 'solid' });
    s.rect(X(0.62), Y(0.56), 0.1 * w, 0.12 * h, { stroke: C.ink, fill: P.white, fillStyle: 'solid' });
    s.line([[X(0.88), Y(0.84)], [X(0.88), Y(0.5)]], { stroke: C.ink, strokeWidth: 4 });
    s.ellipse(X(0.88), Y(0.4), 0.26 * w, 0.24 * h, { stroke: c, fill: P.green, fillStyle: 'solid' });
  },
  oldtown(s, B) {
    const { X, Y, w, h, c } = B;
    for (let i = 0; i < 3; i++) {
      const x0 = 0.02 + i * 0.33;
      s.line([[X(x0), Y(0.56)], [X(x0 + 0.16), Y(0.4)], [X(x0 + 0.32), Y(0.56)]], { stroke: C.ink, fill: i % 2 ? P.grey : P.red, strokeWidth: 3 });
      s.rect(X(x0 + 0.04), Y(0.56), 0.24 * w, 0.32 * h, { stroke: C.ink, fill: P.yellow, strokeWidth: 3 });
    }
    s.line([[X(0.02), Y(0.88)], [X(0.98), Y(0.88)]], { stroke: C.gray, strokeWidth: 3 });
    s.ellipse(X(0.2), Y(0.36), 0.1 * w, 0.08 * h, { stroke: c, fill: P.red, fillStyle: 'solid' });
    s.ellipse(X(0.8), Y(0.36), 0.1 * w, 0.08 * h, { stroke: c, fill: P.red, fillStyle: 'solid' });
  },
  bridge(s, B) {
    const { X, Y, w, h, c } = B;
    s.line([[X(0.04), Y(0.6)], [X(0.5), Y(0.16)], [X(0.96), Y(0.6)]], { stroke: C.ink, strokeWidth: 4, round: true });
    s.line([[X(0.06), Y(0.62)], [X(0.94), Y(0.62)]], { stroke: C.ink, strokeWidth: 4 });
    for (let i = 0; i < 5; i++) s.line([[X(0.14 + i * 0.18), Y(0.62)], [X(0.14 + i * 0.18), Y(0.5)]], { stroke: C.ink, strokeWidth: 3 });
    s.line([[X(0.06), Y(0.5)], [X(0.94), Y(0.5)]], { stroke: C.ink, strokeWidth: 3 });
    for (let i = 0; i < 3; i++) {
      const y0 = 0.76 + i * 0.1;
      const pts = [];
      for (let k = 0; k <= 16; k++) pts.push([X(k / 16), Y(y0) + Math.sin((k / 16) * Math.PI * 3 + i) * 0.02 * h]);
      s.line(pts, { stroke: c, strokeWidth: 3 });
    }
  },
  cave(s, B) {
    const { X, Y, w, h, c } = B;
    s.line([[X(0.0), Y(0.2)], [X(0.32), Y(0.06)], [X(0.7), Y(0.12)], [X(1.0), Y(0.3)]], { stroke: C.ink, fill: P.grey, strokeWidth: 3 });
    s.line([[X(0.28), Y(0.86)], [X(0.34), Y(0.42)], [X(0.66), Y(0.42)], [X(0.72), Y(0.86)]], { stroke: C.ink, fill: P.white, fillStyle: 'solid', strokeWidth: 3 });
    s.ellipse(X(0.5), Y(0.56), 0.12 * w, 0.12 * w, { stroke: C.ink, fill: P.yellow, fillStyle: 'solid' });
    s.line([[X(0.42), Y(0.68)], [X(0.5), Y(0.56)], [X(0.58), Y(0.68)]], { stroke: C.ink, strokeWidth: 3, fill: P.yellow });
  },
  forest(s, B) {
    const { X, Y, w, h, c } = B;
    const specs = [[0.2, 0.5], [0.5, 0.66], [0.8, 0.52]];
    specs.forEach(([u, v], i) => {
      s.rect(X(u - 0.03), Y(v - 0.3), 0.06 * w, 0.5 * h, { stroke: C.ink, fill: P.grey, fillStyle: 'solid' });
      s.line([[X(u - 0.16), Y(v - 0.26)], [X(u), Y(v - 0.56)], [X(u + 0.16), Y(v - 0.26)]], { stroke: C.ink, fill: i === 1 ? P.green : P.blue, strokeWidth: 3 });
    });
    s.line([[X(0.02), Y(0.9)], [X(0.98), Y(0.9)]], { stroke: C.gray, strokeWidth: 3 });
  },
  grassland(s, B) {
    const { X, Y, w, h, c } = B;
    s.line([[X(0.0), Y(0.52)], [X(1.0), Y(0.52)]], { stroke: C.gray, strokeWidth: 3 });
    const arc = [];
    for (let i = 0; i <= 16; i++) arc.push([X(0.28 + 0.24 * Math.cos(Math.PI - (i / 16) * Math.PI)), Y(0.6 - 0.22 * Math.sin((i / 16) * Math.PI))]);
    arc.push([X(0.52), Y(0.6)], [X(0.04), Y(0.6)]);
    s.line(arc, { stroke: C.ink, fill: P.white, fillStyle: 'solid', strokeWidth: 3 });
    s.rect(X(0.22), Y(0.5), 0.1 * w, 0.1 * h, { stroke: C.ink, fill: c, fillStyle: 'solid' });
    s.ellipse(X(0.78), Y(0.76), 0.16 * w, 0.1 * h, { stroke: C.ink, fill: P.white, fillStyle: 'solid' });
    s.line([[X(0.72), Y(0.8)], [X(0.72), Y(0.9)]], { stroke: C.ink, strokeWidth: 2 });
    s.line([[X(0.84), Y(0.8)], [X(0.84), Y(0.9)]], { stroke: C.ink, strokeWidth: 2 });
    s.line([[X(0.02), Y(0.9)], [X(0.98), Y(0.9)]], { stroke: C.gray, strokeWidth: 3 });
  },
  desert(s, B) {
    const { X, Y, w, h, c } = B;
    s.ellipse(X(0.8), Y(0.2), 0.2 * w, 0.2 * w, { stroke: c, fill: P.yellow, fillStyle: 'solid' });
    s.line([[X(0.02), Y(0.9)], [X(0.34), Y(0.6)], [X(0.68), Y(0.86)]], { stroke: C.ink, fill: P.sand, strokeWidth: 3 });
    s.line([[X(0.4), Y(0.92)], [X(0.72), Y(0.62)], [X(1.0), Y(0.9)]], { stroke: C.ink, fill: P.orange, strokeWidth: 3 });
    s.line([[X(0.5), Y(0.86)], [X(0.56), Y(0.7)], [X(0.62), Y(0.86)]], { stroke: C.ink, strokeWidth: 3 });
    s.line([[X(0.62), Y(0.78)], [X(0.7), Y(0.7)]], { stroke: C.ink, strokeWidth: 3 });
    s.line([[X(0.02), Y(0.92)], [X(0.98), Y(0.92)]], { stroke: C.gray, strokeWidth: 3 });
  },
  museum(s, B) {
    const { X, Y, w, h, c } = B;
    s.line([[X(0.06), Y(0.34)], [X(0.5), Y(0.14)], [X(0.94), Y(0.34)]], { stroke: C.ink, fill: P.blue, strokeWidth: 3 });
    s.rect(X(0.14), Y(0.34), 0.72 * w, 0.44 * h, { stroke: C.ink, fill: P.grey, strokeWidth: 3 });
    [0.26, 0.4, 0.54, 0.68].forEach((u) => s.line([[X(u), Y(0.36)], [X(u), Y(0.76)]], { stroke: C.ink, strokeWidth: 3 }));
    s.line([[X(0.08), Y(0.78)], [X(0.92), Y(0.78)], [X(0.98), Y(0.9)], [X(0.02), Y(0.9)]], { stroke: C.ink, fill: P.yellow, strokeWidth: 3 });
    s.rect(X(0.44), Y(0.5), 0.12 * w, 0.2 * h, { stroke: C.ink, fill: c, fillStyle: 'solid' });
  },
  boat(s, B) {
    const { X, Y, w, h, c } = B;
    s.line([[X(0.14), Y(0.6)], [X(0.86), Y(0.6)], [X(0.72), Y(0.86)], [X(0.28), Y(0.86)]], { stroke: C.ink, fill: P.yellow, strokeWidth: 3 });
    s.line([[X(0.5), Y(0.6)], [X(0.5), Y(0.18)]], { stroke: C.ink, strokeWidth: 4 });
    s.line([[X(0.5), Y(0.2)], [X(0.82), Y(0.52)], [X(0.5), Y(0.54)]], { stroke: C.ink, fill: P.red, strokeWidth: 3 });
    for (let i = 0; i < 2; i++) {
      const pts = [];
      for (let k = 0; k <= 16; k++) pts.push([X(k / 16), Y(0.94) + i * 0.05 + Math.sin((k / 16) * Math.PI * 3) * 0.02 * h]);
      s.line(pts, { stroke: c, strokeWidth: 3 });
    }
  },
  noodles(s, B) {
    const { X, Y, w, h, c } = B;
    s.line([[X(0.12), Y(0.5)], [X(0.24), Y(0.78)], [X(0.62), Y(0.78)], [X(0.74), Y(0.5)]], { stroke: C.ink, fill: P.white, fillStyle: 'solid', strokeWidth: 3 });
    s.ellipse(X(0.43), Y(0.5), 0.64 * w, 0.16 * h, { stroke: C.ink, fill: P.yellow, fillStyle: 'solid', strokeWidth: 3 });
    for (let i = 0; i < 3; i++) {
      const pts = [];
      for (let k = 0; k <= 14; k++) pts.push([X(0.2 + k * 0.03), Y(0.44 - i * 0.03) + Math.sin(k) * 0.02 * h]);
      s.line(pts, { stroke: c, strokeWidth: 3 });
    }
    s.line([[X(0.86), Y(0.24)], [X(0.6), Y(0.5)]], { stroke: C.gray, strokeWidth: 3 });
    s.line([[X(0.94), Y(0.28)], [X(0.66), Y(0.52)]], { stroke: C.gray, strokeWidth: 3 });
    for (let i = 0; i < 2; i++) {
      const pts = [];
      for (let k = 0; k <= 10; k++) pts.push([X(0.26 + i * 0.3 + Math.sin(k) * 0.03), Y(0.36 - k * 0.02)]);
      s.line(pts, { stroke: C.gray, strokeWidth: 2 });
    }
  },
  hotpot(s, B) {
    const { X, Y, w, h, c } = B;
    s.ellipse(X(0.46), Y(0.44), 0.66 * w, 0.24 * h, { stroke: C.ink, fill: P.red, fillStyle: 'solid', strokeWidth: 4 });
    s.line([[X(0.13), Y(0.44)], [X(0.1), Y(0.66)], [X(0.46), Y(0.76)], [X(0.82), Y(0.66)], [X(0.79), Y(0.44)]], { stroke: C.ink, fill: P.grey, strokeWidth: 3 });
    for (let i = 0; i < 3; i++) s.ellipse(X(0.28 + i * 0.18), Y(0.4), 0.08 * w, 0.06 * h, { stroke: C.ink, fill: P.white, fillStyle: 'solid' });
    for (let i = 0; i < 3; i++) {
      const pts = [];
      for (let k = 0; k <= 8; k++) pts.push([X(0.3 + i * 0.16 + Math.sin(k) * 0.02), Y(0.82 + k * 0.014)]);
      s.line(pts, { stroke: c, strokeWidth: 3 });
    }
  },
  seafood(s, B) {
    const { X, Y, w, h, c } = B;
    s.ellipse(X(0.46), Y(0.62), 0.9 * w, 0.34 * h, { stroke: C.ink, fill: P.white, fillStyle: 'solid', strokeWidth: 3 });
    s.ellipse(X(0.44), Y(0.5), 0.44 * w, 0.24 * h, { stroke: C.ink, fill: P.blue, fillStyle: 'solid' });
    s.line([[X(0.62), Y(0.5)], [X(0.82), Y(0.38)], [X(0.82), Y(0.62)]], { stroke: C.ink, fill: P.blue, strokeWidth: 3 });
    s.line([[X(0.2), Y(0.78)], [X(0.12), Y(0.9)], [X(0.34), Y(0.86)]], { stroke: C.ink, fill: P.red, strokeWidth: 3 });
    s.ellipse(X(0.44), Y(0.48), 0.05 * w, 0.05 * w, { stroke: C.ink, fill: C.ink, fillStyle: 'solid' });
    s.line([[X(0.78), Y(0.78)], [X(0.7), Y(0.9)], [X(0.92), Y(0.86)]], { stroke: C.ink, fill: P.red, strokeWidth: 3 });
  },
  dumpling(s, B) {
    const { X, Y, w, h, c } = B;
    s.ellipse(X(0.46), Y(0.7), 0.9 * w, 0.28 * h, { stroke: C.ink, fill: P.white, fillStyle: 'solid', strokeWidth: 3 });
    [[0.24, 0.62], [0.46, 0.56], [0.68, 0.62]].forEach(([u, v]) => {
      s.line([[X(u - 0.14), Y(v)], [X(u - 0.1), Y(v - 0.16)], [X(u + 0.1), Y(v - 0.16)], [X(u + 0.14), Y(v)]],
        { stroke: C.ink, fill: P.yellow, strokeWidth: 3, round: true });
    });
    for (let i = 0; i < 2; i++) {
      const pts = [];
      for (let k = 0; k <= 10; k++) pts.push([X(0.3 + i * 0.32 + Math.sin(k) * 0.03), Y(0.36 - k * 0.024)]);
      s.line(pts, { stroke: C.gray, strokeWidth: 2 });
    }
  },
  teapot(s, B) {
    const { X, Y, w, h, c } = B;
    s.ellipse(X(0.44), Y(0.58), 0.5 * w, 0.36 * h, { stroke: C.ink, fill: P.green, fillStyle: 'solid', strokeWidth: 4 });
    s.line([[X(0.7), Y(0.5)], [X(0.9), Y(0.4)]], { stroke: C.ink, strokeWidth: 4, round: true });
    s.line([[X(0.18), Y(0.5)], [X(0.16), Y(0.62)], [X(0.24), Y(0.68)]], { stroke: C.ink, strokeWidth: 4, round: true });
    s.line([[X(0.36), Y(0.42)], [X(0.52), Y(0.42)]], { stroke: C.ink, strokeWidth: 4 });
    s.rect(X(0.4), Y(0.36), 0.08 * w, 0.06 * h, { stroke: C.ink, fill: c, fillStyle: 'solid', round: true });
    const pts = [];
    for (let k = 0; k <= 12; k++) pts.push([X(0.72 + Math.sin(k) * 0.05), Y(0.34 - k * 0.02)]);
    s.line(pts, { stroke: C.gray, strokeWidth: 2 });
    s.line([[X(0.14), Y(0.86)], [X(0.3), Y(0.86)], [X(0.26), Y(0.94)], [X(0.18), Y(0.94)]], { stroke: C.ink, fill: P.white, fillStyle: 'solid', strokeWidth: 3 });
  },
  skewer(s, B) {
    const { X, Y, w, h, c } = B;
    for (let i = 0; i < 3; i++) {
      const x0 = 0.16 + i * 0.26;
      s.line([[X(x0), Y(0.86)], [X(x0 + 0.06), Y(0.2)]], { stroke: C.gray, strokeWidth: 3 });
      for (let k = 0; k < 3; k++) s.rect(X(x0 + 0.004 * k), Y(0.32 + k * 0.16), 0.1 * w, 0.12 * h, { stroke: C.ink, fill: P.red, fillStyle: 'solid', round: true });
    }
    s.line([[X(0.06), Y(0.9)], [X(0.94), Y(0.9)]], { stroke: C.gray, strokeWidth: 3 });
    for (let i = 0; i < 2; i++) {
      const pts = [];
      for (let k = 0; k <= 10; k++) pts.push([X(0.3 + i * 0.34 + Math.sin(k) * 0.03), Y(0.16 - k * 0.014)]);
      s.line(pts, { stroke: c, strokeWidth: 2 });
    }
  },
  market(s, B) {
    const { X, Y, w, h, c } = B;
    s.line([[X(0.04), Y(0.34)], [X(0.5), Y(0.42)], [X(0.96), Y(0.34)]], { stroke: C.ink, strokeWidth: 4, round: true });
    s.line([[X(0.04), Y(0.34)], [X(0.16), Y(0.2)], [X(0.28), Y(0.34)], [X(0.4), Y(0.2)], [X(0.52), Y(0.34)], [X(0.64), Y(0.2)], [X(0.76), Y(0.34)], [X(0.88), Y(0.2)], [X(0.96), Y(0.34)]],
      { stroke: C.ink, fill: P.red, strokeWidth: 3 });
    s.rect(X(0.16), Y(0.62), 0.68 * w, 0.28 * h, { stroke: C.ink, fill: P.yellow, strokeWidth: 3 });
    s.ellipse(X(0.3), Y(0.6), 0.2 * w, 0.12 * h, { stroke: C.ink, fill: P.green, fillStyle: 'solid' });
    s.ellipse(X(0.62), Y(0.6), 0.2 * w, 0.12 * h, { stroke: C.ink, fill: P.orange, fillStyle: 'solid' });
    s.line([[X(0.16), Y(0.9)], [X(0.84), Y(0.9)]], { stroke: C.gray, strokeWidth: 3 });
  },
  // 熊猫：白身黑耳黑眼斑 + 竹子（大熊猫基地等）。11 个图元，控制绘制时长
  panda(s, B) {
    const { X, Y, w, h, c } = B;
    // 竹子（右侧）：竿 + 枝 + 叶
    s.line([[X(0.8), Y(0.9)], [X(0.8), Y(0.26)]], { stroke: P.green, strokeWidth: 5 });
    s.line([[X(0.72), Y(0.52)], [X(0.8), Y(0.47)]], { stroke: P.green, strokeWidth: 3 });
    s.line([[X(0.8), Y(0.36)], [X(0.87), Y(0.3)], [X(0.92), Y(0.38)]], { stroke: C.ink, fill: P.green, strokeWidth: 3 });
    // 身体 + 头（白底黑描边）
    s.ellipse(X(0.16), Y(0.52), 0.5 * w, 0.4 * h, { stroke: C.ink, fill: P.white, fillStyle: 'solid', strokeWidth: 3 });
    s.ellipse(X(0.18), Y(0.14), 0.44 * w, 0.36 * h, { stroke: C.ink, fill: P.white, fillStyle: 'solid', strokeWidth: 3 });
    // 耳朵（黑圆）
    s.ellipse(X(0.14), Y(0.06), 0.13 * w, 0.13 * w, { stroke: C.ink, fill: C.ink, fillStyle: 'solid' });
    s.ellipse(X(0.52), Y(0.06), 0.13 * w, 0.13 * w, { stroke: C.ink, fill: C.ink, fillStyle: 'solid' });
    // 黑眼斑 + 鼻子
    s.ellipse(X(0.27), Y(0.25), 0.1 * w, 0.13 * h, { stroke: C.ink, fill: C.ink, fillStyle: 'solid' });
    s.ellipse(X(0.44), Y(0.25), 0.1 * w, 0.13 * h, { stroke: C.ink, fill: C.ink, fillStyle: 'solid' });
    s.ellipse(X(0.36), Y(0.39), 0.06 * w, 0.05 * h, { stroke: C.ink, fill: C.ink, fillStyle: 'solid' });
    // 地面
    s.line([[X(0.04), Y(0.94)], [X(0.96), Y(0.94)]], { stroke: C.gray, strokeWidth: 3 });
  },
  lantern(s, B) {
    const { X, Y, w, h, c } = B;
    s.line([[X(0.06), Y(0.24)], [X(0.94), Y(0.3)]], { stroke: C.ink, strokeWidth: 3 });
    [0.22, 0.5, 0.78].forEach((u, i) => {
      s.line([[X(u), Y(0.26 + i * 0.01)], [X(u), Y(0.4)]], { stroke: C.ink, strokeWidth: 2 });
      s.ellipse(X(u), Y(0.56), 0.22 * w, 0.28 * h, { stroke: C.ink, fill: P.red, fillStyle: 'solid' });
      s.line([[X(u - 0.04), Y(0.72)], [X(u + 0.04), Y(0.72)]], { stroke: P.yellow, strokeWidth: 3 });
    });
    s.line([[X(0.02), Y(0.92)], [X(0.98), Y(0.92)]], { stroke: C.gray, strokeWidth: 3 });
  },
};

// 从一段中文里挑插画类型：景点名/看点文本 → 图元组合。城市数据没写 illo 字段时走这里。
const RULES = [
  [/熊猫|国宝/, 'panda'],
  [/故宫|皇宫|宫殿|行宫|宫/, 'temple'],
  [/长城|城墙|关城|要塞|敌楼/, 'wall'],
  [/石窟|石刻|崖|溶洞|佛窟/, 'cave'],
  [/园林|公园|园|亭|廊|水榭|苗圃/, 'garden'],
  [/胡同|四合院|大院|府|故居|老宅|客栈/, 'courtyard'],
  [/古镇|古城|老街|巷|弄|旧城|平遥|坊/, 'oldtown'],
  [/寺|庙|坛|观|庵|教堂|清真寺/, 'temple'],
  [/塔|楼阁|阁|钟楼|鼓楼/, 'pagoda'],
  [/博物|遗址|陵|俑|纪念馆|展馆/, 'museum'],
  [/瀑布|泉|潭|溪流/, 'waterfall'],
  [/江|河|溪|渡|峡谷/, 'river'],
  [/湖|池|潭|海子/, 'lake'],
  [/瀑布|溪/, 'waterfall'],
  [/海|湾|滩|滨|灯塔|轮渡/, 'sea'],
  [/岛|屿|椰|环岛/, 'island'],
  [/雪|冰川|冰|雾凇/, 'snow'],
  [/草原|牧场|牧|蒙古|那达慕/, 'grassland'],
  [/沙漠|沙丘|戈壁|丹霞|雅丹/, 'desert'],
  [/林|竹|森林|原始|红松|丛/, 'forest'],
  [/桥/, 'bridge'],
  [/夜市|灯会|花灯|灯|夜景|不夜/, 'lantern'],
  [/山|峰|岭|岳|崮|岗| crest/i, 'mountain'],
];
function pickKind(text) {
  const t = String(text || '');
  for (const [re, k] of RULES) if (re.test(t)) return k;
  return 'city';
}

// kind → 归一化盒子；o = { x, y, w, h, c }，c 缺省用主题主色
module.exports = function illo(s, kind, o = {}) {
  const x = o.x, y = o.y, w = o.w || 400, h = o.h || 320;
  const B = {
    x, y, w, h,
    c: o.c || (s && s.accent ? s.accent() : '#1971c2'),
    X: (u) => x + u * w,
    Y: (v) => y + v * h,
  };
  const fn = shapes[kind] || shapes.mountain;
  fn(s, B);
  return s;
};
module.exports.kinds = Object.keys(shapes);
module.exports.pickKind = pickKind;
module.exports.palette = P;
