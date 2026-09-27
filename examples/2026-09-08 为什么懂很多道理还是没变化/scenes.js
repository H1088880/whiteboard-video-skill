const { Scene, C, CX, build } = require(require('path').join(__dirname, '../../lib/scene-dsl')).use(__dirname);
const scenes = [];
function heading(s, t) { s.text(120, 65, t, { size: 80, color: C.brand }); }
function card(s, x, y, w, h, t, color = C.ink, fill = C.fYellow, size = 48) {
  s.rect(x, y, w, h, { round: true, fill, fillStyle: 'solid' });
  s.text(x + w / 2, y + 35, t, { size, align: 'center', color });
}
// 三个同心圈：舒适区 / 拉伸区 / 困难区
function zones(s, cx, cy, r, { labels = true, size = 40 } = {}) {
  s.ellipse(cx - r, cy - r * 0.62, r * 2, r * 1.24, { stroke: C.red, strokeWidth: 3, strokeStyle: 'dashed' });
  s.ellipse(cx - r * 0.66, cy - r * 0.41, r * 1.32, r * 0.82, { stroke: C.brand, strokeWidth: 4, fill: C.fGreen, fillStyle: 'hachure' });
  s.ellipse(cx - r * 0.32, cy - r * 0.2, r * 0.64, r * 0.4, { stroke: C.blue, strokeWidth: 3, fill: C.fBlue, fillStyle: 'solid' });
  if (labels) {
    s.text(cx, cy - size / 2, '舒适区', { size, align: 'center', color: C.blue });
    s.text(cx, cy - r * 0.41 + 14, '拉伸区', { size, align: 'center', color: C.brand });
    s.text(cx, cy - r * 0.62 + 14, '困难区', { size, align: 'center', color: C.red });
  }
}

{
  const s = new Scene('01-know', `道理你都懂：早睡、运动、少刷手机、多读书。书看了不少，课也听了几门，点头点得很真诚。|可一年过去，作息还是那样，体重还是那样，手机还是刷到半夜。懂了很多，生活几乎没变。问题出在哪？`);
  s.nextBeat();
  heading(s, '道理都懂，日子没变');
  s.image(400, 300, 'reader', { h: 400, align: 'center' });
  s.checkbox(820, 300, '早睡', { size: 46 });
  s.checkbox(820, 400, '运动', { size: 46 });
  s.checkbox(1320, 300, '少刷手机', { size: 46 });
  s.checkbox(1320, 400, '多读书', { size: 46 });
  s.text(400, 740, '书看了，课听了', { size: 40, align: 'center', color: C.gray });
  s.nextBeat();
  s.arrow([[1120, 520], [1120, 620]], { stroke: C.gray, strokeWidth: 3 });
  s.text(1120, 560, '一年后', { size: 36, align: 'left', color: C.gray });
  card(s, 800, 640, 900, 170, '作息、体重、手机，还是那样', C.red, C.fRed, 54);
  s.text(1250, 860, '懂了很多 ≠ 变了', { size: 52, align: 'center', color: C.ink });
  scenes.push(s);
}
{
  const s = new Scene('02-zones', `教育学里有个模型，把你能做的事分成三圈。最里面是舒适区，闭着眼都会做。中间是拉伸区，跳一跳够得着，做起来有点吃力。最外面是困难区，怎么跳都够不着，只剩慌。|这个模型来自教育学者森宁格，国内《认知觉醒》这本书也讲得很透：成长只发生在中间那一圈。`);
  s.nextBeat();
  heading(s, '你能做的事，分三圈');
  zones(s, 640, 560, 520, { size: 44 });
  s.text(1270, 330, '闭着眼都会', { size: 40, color: C.blue });
  s.text(1270, 470, '跳一跳够得着，有点吃力', { size: 40, color: C.brand });
  s.text(1270, 610, '怎么跳都够不着，只剩慌', { size: 40, color: C.red });
  s.nextBeat();
  s.arrow([[1270, 780], [980, 690]], { stroke: C.brand, strokeWidth: 4 });
  card(s, 1180, 770, 620, 150, '成长只在这一圈', C.brand, C.fGreen, 56);
  scenes.push(s);
}
{
  const s = new Scene('03-why', `为什么懂了道理还是没变化？因为懂道理这件事，本身就在舒适区里。看书、听课、点头，不用面对失败，也不用真的吃力。|而改变要求你走进拉伸区：明天六点起，今晚十一点关手机。那一刻是不舒服的。于是大脑替你选了一条更省力的路：再看一本书。`);
  s.nextBeat();
  heading(s, '“懂道理”本身，就在舒适区');
  s.line([[CX, 200], [CX, 940]], { strokeStyle: 'dashed', stroke: C.gray });
  s.text(480, 200, '懂道理', { size: 60, align: 'center', color: C.blue });
  s.image(480, 300, 'reader', { h: 360, align: 'center' });
  s.text(480, 700, '看书 · 听课 · 点头', { size: 40, align: 'center' });
  s.text(480, 780, '不用面对失败，不吃力', { size: 36, align: 'center', color: C.gray });
  s.nextBeat();
  s.text(1440, 200, '去做', { size: 60, align: 'center', color: C.brand });
  s.image(1440, 300, 'stepper', { h: 360, align: 'center' });
  s.text(1440, 700, '六点起 · 十一点关手机', { size: 40, align: 'center' });
  s.text(1440, 780, '那一刻，不舒服', { size: 36, align: 'center', color: C.red });
  s.arrow([[1240, 880], [700, 880]], { stroke: C.red, strokeWidth: 4 });
  s.text(CX, 895, '“再看一本书吧”', { size: 40, align: 'center', color: C.red });
  scenes.push(s);
}
{
  const s = new Scene('04-plateau', `还有一种没变化，是你真的做了，却卡住了。跑步跑了三个月，配速不动了；英语学了半年，还是那几句。|心理学家埃里克森研究过顶尖表演者，他的结论是：大多数技能，到够用的程度就会自动化，之后再重复，也不会更好。停在自动化里，是另一种舒适区。`);
  s.nextBeat();
  heading(s, '做了，却卡住了');
  s.line([[200, 860], [1300, 860]], { stroke: C.gray, strokeWidth: 3 });
  s.line([[200, 860], [200, 300]], { stroke: C.gray, strokeWidth: 3 });
  s.text(220, 280, '水平', { size: 32, color: C.gray });
  s.text(1200, 880, '时间', { size: 32, color: C.gray });
  s.line([[200, 840], [420, 700], [620, 520], [760, 450], [1280, 445]], { round: true, stroke: C.blue, strokeWidth: 5 });
  s.text(1030, 310, '平台期', { size: 48, color: C.red });
  s.text(1030, 380, '够用了，停在这', { size: 34, color: C.gray });
  s.image(1560, 400, 'stuck', { h: 380, align: 'center' });
  s.nextBeat();
  card(s, 720, 720, 280, 100, '够用', C.ink, C.fBlue, 44);
  s.arrow([[1010, 770], [1070, 770]], { stroke: C.gray });
  card(s, 1080, 720, 280, 100, '自动化', C.ink, C.fYellow, 44);
  s.text(1560, 810, '另一种舒适区', { size: 40, align: 'center', color: C.red });
  scenes.push(s);
}
{
  const s = new Scene('05-edge', `所以要变化，就得每次把自己放回拉伸区的边缘。判断标准很简单：做的时候有点吃力，但能完成。|太轻松，说明还在舒适区；完全做不了，说明跨进了困难区，先退一步。比如跑步，不是加倍跑，是把配速提一点点，或者多跑一公里。`);
  s.nextBeat();
  heading(s, '把自己放回边缘');
  s.image(360, 270, 'stepper', { h: 400, align: 'center' });
  card(s, 700, 300, 1060, 200, '有点吃力，但能完成', C.brand, C.fGreen, 64);
  s.text(1230, 530, '这就是边缘', { size: 40, align: 'center', color: C.gray });
  s.nextBeat();
  card(s, 700, 620, 500, 120, '太轻松 → 舒适区', C.blue, C.fBlue, 40);
  card(s, 1260, 620, 500, 120, '做不了 → 退一步', C.red, C.fRed, 40);
  s.text(1230, 790, '跑步：不是加倍跑，是配速提一点，或多跑一公里', { size: 36, align: 'center' });
  s.text(360, 720, '够得着', { size: 40, align: 'center', color: C.brand });
  scenes.push(s);
}
{
  const s = new Scene('06-dose', `还有一点，边缘练习很耗神，不用贪多。埃里克森那篇论文里，顶尖小提琴手每天专注练习，平均也就三个多小时，对多数人来说，有效的量接近一小时。|所以别定一天三小时的计划。每天在一件事上，往边缘挪一小步，比一周一次自我感动的大冲刺，更容易留下变化。`);
  s.nextBeat();
  heading(s, '边缘练习，不用贪多');
  s.ellipse(240, 280, 300, 300, { stroke: C.ink, strokeWidth: 4, fill: C.fYellow, fillStyle: 'solid' });
  s.line([[390, 430], [390, 330]], { stroke: C.ink, strokeWidth: 5 });
  s.line([[390, 430], [460, 470]], { stroke: C.ink, strokeWidth: 5 });
  s.text(390, 620, '顶尖小提琴手', { size: 36, align: 'center', color: C.gray });
  s.text(390, 680, '每天约 3 小时', { size: 44, align: 'center', color: C.ink });
  s.text(390, 750, '多数人有效量 ≈ 1 小时', { size: 40, align: 'center', color: C.brand });
  s.nextBeat();
  s.line([[760, 200], [760, 940]], { strokeStyle: 'dashed', stroke: C.gray });
  card(s, 840, 280, 900, 150, '一周一次三小时大冲刺', C.red, C.fRed, 48);
  s.squiggle(900, 1680, 450, { color: C.red });
  card(s, 840, 560, 900, 150, '每天一件事，挪一小步', C.brand, C.fGreen, 48);
  s.arrow([[900, 860], [1100, 845], [1300, 820], [1500, 785], [1680, 745]], { stroke: C.brand, strokeWidth: 4 });
  s.text(1200, 880, '变化留得下来', { size: 40, align: 'center', color: C.gray });
  scenes.push(s);
}
{
  const s = new Scene('07-close', `道理懂了，是起点，不是变化。变化只发生在那一圈稍微不舒服的地方。|今天，你想在哪件事上，往边缘挪一小步？评论区说说。`);
  s.nextBeat();
  heading(s, '懂了是起点，不是变化');
  zones(s, 440, 560, 330, { labels: false });
  s.arrow([[440, 560], [640, 470]], { stroke: C.brand, strokeWidth: 5 });
  s.text(760, 290, '变化只发生在', { size: 64 });
  s.text(760, 400, '稍微不舒服的那一圈', { size: 72, color: C.brand });
  s.nextBeat();
  card(s, 760, 620, 1000, 165, '今天，往边缘挪一小步的是哪件事？', C.ink, C.fYellow, 48);
  s.ellipse(1500, 800, 260, 110, { stroke: C.orange, fill: C.fYellow, fillStyle: 'solid' });
  s.text(1630, 828, '评论区聊聊', { size: 40, align: 'center', color: C.orange });
  scenes.push(s);
}
const cover = (s, ratio) => s.coverLayout({
  ratio,
  title: '道理都懂\n为什么没变化？',
  sub: '成长只发生在舒适区边缘',
  sticker: 'stepper',
  tag: '画懂那些卡住你的事',
});
build(__dirname, scenes, { cover });
