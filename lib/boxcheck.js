// 几何校验（精确版）：只查「装文字的容器」——callout/stat/takeaway（矩形 宽>=150 高>=80），
// 文字起点在容器纵向范围内才算其子元素，查右溢/下溢。封面版式是定稿，跳过。
const fs = require('fs'), path = require('path');
const { PROJECTS_DIR } = require(path.join(__dirname, 'paths.cjs'));
const cities = process.argv[2]
  ? process.argv[2].split(',')
  : '三亚 上海 丽江 北京 南京 厦门 哈尔滨 天津 广州 成都 杭州 桂林 武汉 洛阳 深圳 苏州 西安 重庆 长沙 青岛'.split(' ');
let bad = 0, literalN = 0, checked = 0;
for (const c of cities) {
  const dir = path.join(PROJECTS_DIR, '旅游-' + c, 'scenes');
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.excalidraw.md'))) {
    if (f.startsWith('00-cover')) continue;
    const txt = fs.readFileSync(path.join(dir, f), 'utf8');
    const doc = JSON.parse(txt.match(/```json\s*([\s\S]*?)```/)[1]);
    const els = doc.elements;
    for (const e of els) if (e.type === 'text' && e.text.includes('\\n')) {
      console.log('字面\\n 残留 ' + c + '/' + f + ': ' + e.text.slice(0, 30)); literalN++;
    }
    for (let i = 0; i < els.length; i++) {
      const box = els[i];
      if (box.type !== 'rectangle' || box.width < 150 || box.height < 80) continue;
      for (const e of els) {
        if (e.type !== 'text') continue;
        // 子元素：文字纵向起点落在容器内
        if (e.y < box.y - 2 || e.y >= box.y + box.height) continue;
        checked++;
        const ox = Math.round(e.x + e.width - (box.x + box.width));
        const oy = Math.round(e.y + e.height - (box.y + box.height));
        if (ox > 8 || oy > 8) {
          bad++;
          console.log('溢出 ' + c + '/' + f + ' 容器[' + [box.x, box.y, box.width, box.height].map(Math.round) + '] 文字「' + e.text.replace(/\n/g, '⏎').slice(0, 26) + '」 右越' + ox + ' 下越' + oy);
        }
      }
    }
  }
}
console.log('\n检查 ' + checked + ' 处容器内文字；溢出 ' + bad + ' 处；字面 \\n 残留 ' + literalN + ' 处');
