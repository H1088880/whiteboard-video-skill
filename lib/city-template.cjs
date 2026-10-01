// 城市旅游片：数据 → scenes.js 文本
// 数据结构见 batch/cities.json；统一结构：开场定位 → 三个必去 → 吃什么 → 什么时候来
// 主题色按城市轮换（warm/ocean/forest/berry/grape），牛皮纸底永不动
// 画面必须有插画（用户 2026-09-29 明确：不能只有文字）：
//   ① 每城 2 张 AI 贴纸：<城市>-hero（开场主视觉）/<城市>-food（美食）走 hij`<城市>` 的 assets/
//   ② 三个景点 + 季节用 lib/illo.cjs 的程序化白板插画，按地标类型自动选型
// 版式：左栏插画（x150 起，w430）／右栏文字（x640 起），底部 y>=960 是字幕区

const illo = require('./illo.cjs');

function esc(s) {
  // 顺序很重要：先转义反斜杠和单引号，最后把「真实换行」转成 \n 转义（生成的 scenes.js 解析回换行；
  // 2026-09-29 修复：此前 wrap 输出的 \n 标记被二次转义，片子里文字直接显示「\n」且整段出框）
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n');
}
function q(s) { return "'" + esc(s) + "'"; }
// 长文本按字数折行（scene DSL 的 text 支持 \n）；这里用真实换行连接，交给 esc 转义
function wrap(s, n = 16) {
  const t = String(s || '');
  const out = [];
  for (let i = 0; i < t.length; i += n) out.push(t.slice(i, i + n));
  return out.join('\n');
}

function genScenes(city, WB_ROOT, opts = {}) {
  const name = city.name, prov = city.prov;
  // 旁白用的省名：prov 形如「华中 · 河南」，画面 kicker 保留完整，但念白只取「 · 」后半段
  // （否则会读成「河南省搁华中 · 河南」这种别扭口播）
  const provSpoken = String(prov || '').split('·').pop().trim();
  // 省级专题（如「河南省」）名字自带省名，开场别再「河南省搁河南」重复，直接省名打头
  // （name 去掉省名后若只剩「省/市/州/自治区」这类尾缀，说明本就是省级/州级行政区）
  const isProv = /^(省|市|州|特别行政区|自治区)$/.test(name.replace(provSpoken, '').trim());
  // 旁白开场的地理定位短语：普通城市「成都搁四川」，省级专题就单说「河南」不叠加
  const openerLoc = isProv ? provSpoken : `${name}搁${provSpoken}`;
  // 文案多元化（2026-09-29 用户反馈「文案千篇一律」）：每类旁白写 3 套措辞，
  // 按城市名哈希确定性选套——同城永远同套，城与城之间口吻错开；再叠加每城自有字段（hook/why/foodTip）。
  const vIdx = [...(city.name || '')].reduce((a, ch) => a + ch.codePointAt(0), 0) % 3;
  const pick = (arr) => arr[vIdx % arr.length];
  // 方言文案层（2026-09-30 用户定：本地 CosyVoice 克隆不了口音，得把文案本身写成当地方言）。
  // 命中 city.dialect 时，固定措辞（开场/报站/吃什么/收尾）切成该方言版本；字段本身已写在 cities.json 里。
  const isDialect = (city.dialect || '').length > 0;
  const hero = !!opts.hero;        // assets/<name>-hero.png 存在才贴图
  const foodImg = !!opts.foodImg;  // assets/<name>-food.png 存在才贴图
  const theme = city.theme || 'warm';
  const traits = city.traits || [];
  const spots = city.spots || [];      // 景点数不锁 3/5，按各城必去打卡点定（可 3、5、7、10…）
  const foods = (city.foods || []).slice(0, 3);
  const season = city.season || {};
  const L = [];

  L.push(`// 《${name}》· 城市旅游片（批量生成，源数据 batch/cities.json）`);
  L.push(`// 统一结构：开场定位 → 三个必去 → 吃什么 → 什么时候来`);
  L.push(`const path = require('path');`);
  L.push(`const WB_ROOT = process.env.WB_ROOT || ${q(WB_ROOT)};`);
  L.push(`const { Scene, C, CX, build } = require(path.join(WB_ROOT, 'lib/scene-dsl')).use(__dirname, { theme: ${q(theme)} });`);
  L.push(`const illo = require(path.join(WB_ROOT, 'lib/illo.cjs'));`);
  L.push(`const scenes = [];`);
  L.push('');

  // ---------- 01 开场 ----------
  const n1 = isDialect
    ? [
        `${openerLoc}，好多人对它的印象就一个词——${traits[0] || name}。其实远不止这一面嘞。`,
        traits.length ? `这座城的气质，用三个词就能说清：${traits.join('、')}。` : `${name}值得慢慢逛。`,
        `头回来咋玩？给你整几个必去，外加一份吃啥、啥时候来的清单。`,
      ]
    : pick([
    [
      `${name}在${provSpoken}，很多人对它的印象只有一个词：${traits[0] || name}。其实远不止这一面。`,
      traits.length ? `这座城的气质，可以用三个词概括：${traits.join('、')}。` : `${name}值得慢慢走。`,
      `第一次来怎么玩？给你三个必去，外加一份吃什么、什么时候来的清单。`,
    ],
    [
      `说到${name}，你脑子里先蹦出来的是不是${traits[0] || provSpoken}？今天带你看看它另外几面。`,
      traits.length ? `用三个词形容${name}：${traits.join('、')}。每一个都值得专门跑一趟。` : `${name}的妙处，得慢慢逛才看得见。`,
      `这条片子给你捋清楚：三个必去、几样地道的味道，还有最适合来的月份。`,
    ],
    [
      `${name}，${provSpoken}。很多人来过一次就念念不忘，理由就藏在${traits[0] || '大街小巷'}里。`,
      traits.length ? `它身上的三张名片：${traits.join('、')}。缺一张，都不算完整认识${name}。` : `${name}的故事，从街头讲到巷尾。`,
      `三分钟交代明白：去哪儿、吃什么、什么时候来。`,
    ],
  ]);
  L.push(`// ---------- 01 开场 ----------`);
  L.push(`{`);
  L.push(`  const s = new Scene('01-intro', ${n1.map(q).join(" + ' | ' + ")});`);
  L.push(`  s.nextBeat();`);
  L.push(`  s.kicker(150, 120, ${q(prov)});`);
  L.push(`  s.heading(150, 205, ${q(name)}, { size: 120 });`);
  L.push(`  s.subtitle(150, 355, ${q(city.hook || traits.join(' · '))});`);
  L.push(`  s.nextBeat();`);
  L.push(`  let sx = 150;`);
  L.push(`  [${traits.map(q).join(', ')}].forEach((t) => {`);
  L.push(`    const k = s.kicker(sx, 445, t, { size: 40 });`);
  L.push(`    sx += k.w + 30;`);
  L.push(`  });`);
  L.push(`  s.nextBeat();`);
  if (hero) {
    // AI 专属贴纸：城市气质主视觉。宝丽来相纸式：白边相框 + 胶带 + 贴纸
    L.push(`  {`);
    L.push(`    const dim = s.imageSize(${q(name + '-hero')});`);
    L.push(`    const ih = 330, iw = Math.round(ih * dim.w / dim.h), hx = 310 - iw / 2, hy = 560;`);
    L.push(`    s.rect(hx - 14, hy - 14, iw + 28, ih + 28, { round: true, fill: '#ffffff', fillStyle: 'solid', stroke: C.gray });`);
    L.push(`    s.image(310, hy, ${q(name + '-hero')}, { h: ih, align: 'center' });`);
    L.push(`    s.rect(310 - 45, hy - 26, 90, 26, { round: true, fill: C.fYellow, fillStyle: 'solid', stroke: C.gray });`);
    L.push(`  }`);
  } else {
    L.push(`  illo(s, ${q(illo.pickKind((season.note || '') + ' ' + traits.join(' ') + ' ' + (city.hook || '')))}, { x: 150, y: 545, w: 330, h: 250 });`);
  }
  L.push(`  const acc = s.accent();`);
  // 三站小环线：把三个必去串成关系图（孤立道具贴纸会突兀）
  L.push(`  const rcx = 1430, rcy = 620, rx = 170, ry = 130;`);
  L.push(`  const loop = [];`);
  L.push(`  for (let i = 0; i <= 60; i++) {`);
  L.push(`    const th = (i / 60) * Math.PI * 2, f = 1 + 0.05 * Math.sin(3 * th + 1.2);`);
  L.push(`    loop.push([rcx + rx * Math.cos(th) * f, rcy + ry * Math.sin(th) * f]);`);
  L.push(`  }`);
  L.push(`  loop.push(loop[0]);`);
  L.push(`  s.line(loop, { stroke: acc, strokeStyle: 'dashed', strokeWidth: 4 });`);
  L.push(`  [${spots.map((x) => q(x.tag || x.name)).join(', ')}].forEach((t, i) => {`);
  L.push(`    const th = -Math.PI / 2 + i * Math.PI * 2 / ${spots.length};`);
  L.push(`    const dx = rcx + rx * Math.cos(th), dy = rcy + ry * Math.sin(th);`);
  L.push(`    s.ellipse(dx - 13, dy - 13, 26, 26, { stroke: acc, fill: acc, fillStyle: 'solid', roughness: 0.6 });`);
  L.push(`    s.text(dx, dy + 30, t, { size: 26, align: 'center', color: acc });`);
  L.push(`  });`);
  L.push(`  s.takeaway(CX, 820, ${q(city.why || '一座值得慢慢走的城市')}, { solid: true, size: 40 });`);
  L.push(`  scenes.push(s);`);
  L.push(`}`);
  L.push('');

  // ---------- 02~ 各必去打卡点（数量不固定） ----------
  // 站点序号按中文数字转写；报站措辞按「首/中/末」三段轮换，中间站复用「中段」措辞
  const CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
  const cnIdx = (i) => (i < CN_NUM.length ? CN_NUM[i] : String(i + 1));
  const idxName = spots.map((_, i) => `第${cnIdx(i)}站`);
  // 首站 / 中段站 / 末站 三组报站措辞，中间任意多站共用「中段」措辞，再按城市哈希轮换变体
  const spotOpeners = isDialect
    ? [
        [`头一站，直奔${'@'}。`, `先到${'@'}。`, `头一个，去${'@'}。`],
        [`下一站，往${'@'}去。`, `再往下，去${'@'}瞅瞅。`, `接着走，${'@'}搁前头等着。`, `再一站，到${'@'}。`, `下一处，${'@'}。`],
        [`最后一站，${'@'}。`, `收尾这一站，去${'@'}。`, `末了，把时间留给${'@'}。`],
      ]
    : [
    [`第一站，${'@'}。`, `先到${'@'}。`, `头一站，直奔${'@'}。`],
    [`下一站，${'@'}。`, `接下来把脚步交给${'@'}。`, `这一站，换个地方，去${'@'}。`],
    [`最后一站，${'@'}。`, `收尾这一站，去${'@'}。`, `末了，把时间留给${'@'}。`],
  ];
  const scNo = (i) => String(i).padStart(2, '0');   // 场景号：02,03,…,11（景点多也稳定）
  const foodNo = scNo(spots.length + 2), outroNo = scNo(spots.length + 3);
  spots.forEach((sp, i) => {
    const seg = i === 0 ? 0 : (i === spots.length - 1 ? 2 : 1);
    // 报站措辞逐站轮换（用站点序号 i），避免多景点城每站都念同一句
    const opener = spotOpeners[seg][(i + vIdx) % spotOpeners[seg].length].replace('@', sp.name);
    const nn = [ opener, sp.line, sp.tip ];
    const kind = sp.illo || illo.pickKind((sp.name || '') + ' ' + (sp.line || '') + ' ' + (sp.tag || ''));
    L.push(`// ---------- ${scNo(i + 2)} ${sp.name} ----------`);
    L.push(`{`);
    L.push(`  const s = new Scene('${scNo(i + 2)}-spot${i + 1}', ${nn.map(q).join(" + ' | ' + ")});`);
    L.push(`  s.nextBeat();`);
    L.push(`  s.kicker(150, 120, ${q(idxName[i] + ' · ' + (sp.tag || sp.name))});`);
    L.push(`  s.heading(150, 205, ${q(sp.name)}, { size: 92 });`);
    L.push(`  s.nextBeat();`);
    // 左插画 / 右内容：和《江西旅游》同一套版式（画面必须有东西看，不能只有字）
    // 有 <城>-spotN 真实地标贴纸就直接贴（像《江西旅游》那样）；没有才退回程序化图元
    const spotImg = (opts.spots || [])[i];
    if (spotImg) {
      L.push(`  {`);
      L.push(`    const dim = s.imageSize(${q(name + '-spot' + (i + 1))});`);
      L.push(`    const ih = 400, iw = Math.min(Math.round(ih * dim.w / dim.h), 430), sx = 360 - iw / 2, sy = 330;`);
      L.push(`    s.rect(sx - 12, sy - 12, iw + 24, ih + 24, { round: true, fill: '#ffffff', fillStyle: 'solid', stroke: C.gray });`);
      L.push(`    s.image(360, sy, ${q(name + '-spot' + (i + 1))}, { h: ih, align: 'center' });`);
      L.push(`  }`);
    } else {
      L.push(`  illo(s, ${q(kind)}, { x: 150, y: 330, w: 420, h: 400 });`);
    }
    L.push(`  s.callout(640, 350, 740, 250, { title: ${q(sp.kicker || '看点')}, body: ${q(wrap(sp.line, 13))}, bodySize: 38, titleSize: 30 });`);
    if (sp.stat) L.push(`  s.stat(1570, 380, ${q(sp.stat.value)}, ${q(sp.stat.label)}, { numSize: 96 });`);
    L.push(`  s.nextBeat();`);
    L.push(`  s.text(640, 680, ${q('· ' + wrap(sp.tip, 26))}, { size: 38, color: C.gray });`);
    L.push(`  scenes.push(s);`);
    L.push(`}`);
    L.push('');
  });

  // ---------- 吃什么 ----------
  const foodList = foods.map((f) => String(f).split('：')[0]).join('、');
  const nFood = isDialect
    ? [
        `说完了看嘞，再说吃嘞。`,
        `${foodList}，是${name}人自己嘞日常，不是给游客表演嘞。`,
        city.foodNote || `别光盯着网红店，跟着本地人排队那家通常更中。`,
      ]
    : pick([
    [
      `说完看的，说吃的。`,
      `${foodList}，是${name}人自己的日常，不是为游客准备的表演。`,
      city.foodNote || `别只盯着网红店，跟着本地人排队的那家通常更准。`,
    ],
    [
      `看完景，该喂肚子了。`,
      `${foodList}——本地人从小吃到大，游客尝一口也挪不动腿。`,
      city.foodNote || `哪家最地道？看哪家店里坐的都是本地口音。`,
    ],
    [
      `${name}的味道，藏在街头巷尾。`,
      `这三样先记下：${foodList}。是不是正宗，${name}人说了算。`,
      city.foodNote || `记住一条：饭点还在排队的小店，基本不会踩雷。`,
    ],
  ]);
  L.push(`// ---------- ${foodNo} 吃什么 ----------`);
  L.push(`{`);
  L.push(`  const s = new Scene('${foodNo}-food', ${nFood.map(q).join(" + ' | ' + ")});`);
  L.push(`  s.nextBeat();`);
  L.push(`  s.kicker(150, 120, ${q('吃什么')});`);
  L.push(`  s.heading(150, 205, ${q(name + '的味道')}, { size: 88 });`);
  L.push(`  s.nextBeat();`);
  const n0 = Math.min(3, foods.length);
  const cw = foodImg ? 950 : 1180, ch = Math.round(430 / n0) - 20;
  foods.forEach((f, i) => {
    const [fn, fd] = String(f).split('：');
    L.push(`  s.callout(150, ${350 + i * (ch + 30)}, ${cw}, ${ch}, { title: ${q('第' + ['一', '二', '三'][i] + '道 · ' + fn)}, body: ${q(wrap(fd || fn, foodImg ? 18 : 22))}, bodySize: 36, titleSize: 30 });`);
  });
  if (foodImg) {
    L.push(`  {`);
    L.push(`    const dim = s.imageSize(${q(name + '-food')});`);
    // 相框右缘不能越过 1860（水印/安全区）：宽图限制相框宽 ≤620
    L.push(`    const ih = 430, iw0 = Math.round(ih * dim.w / dim.h), iw = Math.min(iw0, 620), fx = 1540 - iw / 2, fy = 350;`);
    L.push(`    s.rect(fx - 14, fy - 14, iw + 28, ih + 28, { round: true, fill: '#ffffff', fillStyle: 'solid', stroke: C.gray });`);
    L.push(`    s.image(1540, fy, ${q(name + '-food')}, { w: iw, align: 'center' });`);
    L.push(`    s.rect(1540 - 45, fy - 26, 90, 26, { round: true, fill: C.fYellow, fillStyle: 'solid', stroke: C.gray });`);
    L.push(`  }`);
  }
  L.push(`  s.nextBeat();`);
  L.push(`  s.takeaway(CX, 830, ${q(city.foodTip || '跟着本地人排队的那家，通常更准')}, { solid: true, size: 38 });`);
  L.push(`  scenes.push(s);`);
  L.push(`}`);
  L.push('');

  // ---------- 收尾：什么时候来 ----------
  const nSeason = isDialect
    ? [
        `啥时候来最得劲？${season.mon || '春秋两季'}，${season.note || '不冷不热，人也少点'}。安排行程嘞时候，优先把时间留给这一段。`,
        `一句话总结：${city.why || name + '值得专门为它安排一趟'}`,
        `好了，这座城就先带你逛到这儿，下一趟自己来走走看，中不中。`,
      ]
    : pick([
    [
      // 这句要够长：旁白窗口越长，留给画面的绘制时间越多（短句 + 大元素 = 画面必然落后）
      `什么时候来最舒服？${season.mon || '春秋两季'}，${season.note || '不冷不热，人也少一些'}。安排行程的时候，优先把时间留给这一段。`,
      `一句话总结：${city.why || name + '值得专门为它安排一趟'}`,
      // 收尾句只走旁白+字幕，画面上不再放 slogan 胶囊（2026-09-29 用户定）
      `好了，这座城就先带你逛到这儿，下一趟自己去走走看。`,
    ],
    [
      `几月去最合适？答案是${season.mon || '春秋两季'}——${season.note || '不冷不热，人也少一些'}。把最好的天气留给它，行程就成功了一半。`,
      `临走送你一句话：${city.why || name + '值得专门为它安排一趟'}。`,
      `片子到这儿就收了，剩下的路，你自己去走一遍。`,
    ],
    [
      `要说什么时候来：${season.mon || '春秋两季'}，${season.note || '不冷不热，人也少一些'}。挑对了时间，处处都是好光景。`,
      `记住这句就够：${city.why || name + '值得专门为它安排一趟'}。`,
      `今天先逛到这儿，剩下的惊喜，留给你亲眼看。`,
    ],
  ]);
  L.push(`// ---------- ${outroNo} 收尾 ----------`);
  L.push(`{`);
  L.push(`  const s = new Scene('${outroNo}-outro', ${nSeason.map(q).join(" + ' | ' + ")});`);
  L.push(`  s.nextBeat();`);
  L.push(`  s.kicker(150, 120, ${q('什么时候来')});`);
  // 数字卡片别太大：numSize 140 时画不完，会在句子念完后才收笔（时序落后）
  L.push(`  s.stat(240, 300, ${q(season.mon || '春秋')}, ${q(season.label || '最舒服的季节')}, { numSize: 104 });`);
  L.push(`  s.subtitle(240, 480, ${q(wrap(season.note || '不冷不热，人也少一些', 12))}, { size: 34 });`);
  // 右侧季节插画：这一个月这座城长什么样（省近百字描述）
  // 右侧季节图：有 <城>-season 真实贴纸就贴，否则程序化图元
  if (opts.seasonImg) {
    L.push(`  {`);
    L.push(`    const dim = s.imageSize(${q(name + '-season')});`);
    L.push(`    const ih = 420, iw = Math.min(Math.round(ih * dim.w / dim.h), 430), sx = 1390 - iw / 2, sy = 300;`);
    L.push(`    s.rect(sx - 12, sy - 12, iw + 24, ih + 24, { round: true, fill: '#ffffff', fillStyle: 'solid', stroke: C.gray });`);
    L.push(`    s.image(1390, sy, ${q(name + '-season')}, { h: ih, align: 'center' });`);
    L.push(`  }`);
  } else {
    L.push(`  illo(s, ${q(illo.pickKind((season.note || '') + ' ' + traits.join(' ') + ' ' + (city.hook || '')))}, { x: 1180, y: 300, w: 420, h: 420 });`);
  }
  L.push(`  s.nextBeat();`);
  // 金句限长：长标题画得慢，会在句子念完后才收笔（实测会触发时序落后）
  L.push(`  s.heading(150, 640, ${q(wrap(city.why || name + '值得专门为它安排一趟', 12))}, { size: 58 });`);
  // 第 3 拍只留白：画面停在金句上，末句走旁白+字幕。
  // 2026-09-29 用户定：正片结尾不要「下一站想去哪儿？」胶囊，slogan 只在片尾品牌卡出现一次
  L.push(`  s.nextBeat();`);
  L.push(`  scenes.push(s);`);
  L.push(`}`);
  L.push('');

  // ---------- 封面 ----------
  L.push(`// ---------- 封面（wb cover / wb build 自动出三版） ----------`);
  L.push(`const cover = (s, ratio) => s.coverLayout({`);
  L.push(`  ratio,`);
  L.push(`  title: ${q(name + '\n' + (city.hook || '一座值得慢慢走的城'))},`);
  if (city.sub) L.push(`  sub: ${q(city.sub)},`);
  if (hero) L.push(`  sticker: ${q(name + '-hero')},`);   // 贴右下角，和《江西旅游》封面同版式
  L.push(`});`);
  L.push(`build(__dirname, scenes, { cover });`);
  return L.join('\n');
}

module.exports = { genScenes };
