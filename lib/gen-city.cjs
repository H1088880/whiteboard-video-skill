#!/usr/bin/env node
// 批量建城市旅游片期目录：node lib/gen-city.cjs [数据文件] [--only=北京,上海] [--prefix=旅游-]
// 数据文件默认 batch/cities.json（数组，每项见 README 字段说明）
const fs = require('fs');
const path = require('path');
const { PROJECTS_DIR, ROOT } = require('./paths.cjs');
const { genScenes } = require('./city-template.cjs');

const args = process.argv.slice(2);
const dataFile = args.find((a) => !a.startsWith('--')) || path.join(ROOT, 'batch', 'cities.json');
const onlyArg = (args.find((a) => a.startsWith('--only=')) || '').replace('--only=', '');
const prefix = (args.find((a) => a.startsWith('--prefix=')) || '--prefix=旅游-').replace('--prefix=', '');
// ⚠️ 2026-10-01 事故修复：本脚本按「assets/ 里有 <城>-*.png 贴纸」决定用真实地标贴纸还是退回程序化图元。
// 若先跑 gen-city 再生成贴纸（顺序反了），会**静默**产出全图元版本（河北省/邢台/廊坊/衡水/沈阳 就是这样漏的）。
// 现在改成 fail-fast：缺贴纸直接报错并列出清单，必须显式加 --allow-illo 才允许退回图元（出片前请跑 wb audit）。
const ALLOW_ILLO = args.includes('--allow-illo');

const all = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const cities = onlyArg ? all.filter((c) => onlyArg.split(',').includes(c.name)) : all;

// 配音（2026-09-30 用户二次定稿 —— 全系列只有两个声音，别再扩第三种）：
//   ① 普通话城     → 火山小天 zh_male_taocheng_uranus_bigtts；
//   ② 方言城       → 本地 CosyVoice 克隆（Vivi 或 小天，取决于方言是哪个）。
//   方言归属（用户原话「Vivi 只负责本来那几种音色」）：
//     - 四川话 / 东北话 / 陕西话 → **Vivi 克隆** prompts/vivi_sc.wav（这三档原本就是火山的 Vivi，
//       现在火山授权 403，改本地克隆，音色不变）。
//     - 粤语 / 上海话（吴语）等其余方言 → **小天克隆** prompts/xiaotian.wav（沿用已验收配方）。
//   ⚠️ 既然 Vivi 已有自己这三种的音色，就**不再重复做小天克隆的同款方言**（多余分支）。
const TAOCHENG = 'zh_male_taocheng_uranus_bigtts';  // 普通话（唯一走的火山音色）
const VIVI_DIALECTS = new Set(['四川话', '东北话', '陕西话']);  // Vivi 原本负责的三档
const DIALECT_INSTRUCT = { 四川话: '用四川话说这句话', 东北话: '用东北话说这句话', 陕西话: '用陕西话说这句话' };
// 城市 → 方言中文名（只放本账号真正能出的三种；其余留空=普通话）
const DIALECT = {
  成都: '四川话', 重庆: '四川话',
  哈尔滨: '东北话', 长春: '东北话', 沈阳: '东北话', 大连: '东北话', 吉林: '东北话',
  西安: '陕西话', 延安: '陕西话', 咸阳: '陕西话', 宝鸡: '陕西话', 汉中: '陕西话',
  河南省: '河南话',
  // 山西（晋语）：2026-09-30 起跑的第三批，走 CosyVoice3 原生山西话 instruct + 小天克隆
  晋中: '山西话', 运城: '山西话', 临汾: '山西话', 忻州: '山西话', 长治: '山西话',
  晋城: '山西话', 朔州: '山西话', 吕梁: '山西话', 阳泉: '山西话',
  // 河北（冀）：全省普通话 —— 火山 TTS 403 后统一走本地小天克隆，不再手动覆盖 voice.json
  唐山: '普通话', 保定: '普通话', 邯郸: '普通话', 张家口: '普通话', 沧州: '普通话',
  邢台: '普通话', 廊坊: '普通话', 衡水: '普通话',
  // 省级专题：省条目同样用本省代表方言（一省一音色，地级市沿用）
  山西省: '山西话', 河北省: '普通话',
};
// 方言 instruct（2026-09-30 用户定稿，CosyVoice3 原生方言指令 + 小天克隆）：
//   河南话经过多轮听审最终定稿 —— 纯方言 instruct「请用河南话表达，声音洪亮。」+ speed 1.1，
//   音色 = 小天克隆 prompts/xiaotian.wav（不是母语者 henan_ref，那是被否掉的旧方案）。
const DIALECT_INSTRUCT_V3 = {
  河南话: '请用河南话表达，声音洪亮。',
  山西话: '请用山西话表达，声音洪亮。',
  // 普通话城（火山 403 后）：走本地小天克隆，说出来是标准普通话
  普通话: '请用普通话清晰表达，声音洪亮。',
};
// 方言语速（一律走模型原生 speed，禁止 ffmpeg atempo 兜底 —— atempo 压停顿会让句子变"赶"但不连贯）：
//   河南话 1.1（用户听审定稿，3.92 字/s）；
//   山西话 1.1（2026-10-01 用户盲听五档后：先定点 1.0 的音色与连贯度，再要求「语速加快」→ 取 1.1，
//   实测 4.02 字/s，与河南话定稿 3.92 同档。0.9 被否＝太慢像老爷爷；若仍嫌慢再上 1.2＝4.47）
const DIALECT_SPEED = { 河南话: 1.1, 山西话: 1.1 };

// 前置体检：所有目标城市必须先有全套 AI 实景贴纸（hero / spot1..N / food / season），
// 缺任何一张就整体中止 —— 每个景点必须是该地标的真实贴纸，这是固定要求，不许拿图元凑数。
const lacks = [];
for (const c of cities) {
  const adir = path.join(PROJECTS_DIR, prefix + c.name, 'assets');
  const miss = ['hero', 'food', 'season'].filter((f) => !fs.existsSync(path.join(adir, `${c.name}-${f}.png`)))
    .concat((c.spots || []).map((_, i) => `spot${i + 1}`).filter((f) => !fs.existsSync(path.join(adir, `${c.name}-${f}.png`))));
  if (miss.length) lacks.push(`  ${c.name}（缺 ${miss.join(' / ')}）`);
}
if (lacks.length && !ALLOW_ILLO) {
  console.error(`\n❌ ${lacks.length} 期缺少 AI 实景地标贴纸，已中止（避免产出程序化图元版）：\n${lacks.join('\n')}\n`);
  console.error('   固定要求：每期景点一律用该地标真实贴纸（<城>-hero / -spotN / -food / -season）。');
  console.error('   正确顺序：① 生成贴纸 → ② 跑本命令生成 scenes.js → ③ wb build/render。');
  console.error('   确认要临时退回程序化图元（不建议）：追加 --allow-illo\n');
  process.exit(1);
}

const made = [];
let src, opts;
for (const c of cities) {
  const dir = path.join(PROJECTS_DIR, prefix + c.name);
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
  // AI 专属贴纸存在才贴图（缺失就退回到程序化插画，保证任何城市都能出片）
  // 2026-09-29 用户反馈「全是套模板」→ 三个景点 + 季节也要真实地标贴纸：
  //   <城>-hero（开场）/ <城>-spot1~3（三个必去）/ <城>-food（美食）/ <城>-season（什么时候来）
  src = path.join(dir, 'assets');
  const has = (f) => fs.existsSync(path.join(src, `${c.name}-${f}.png`));
  opts = {
    hero: has('hero'),
    foodImg: has('food'),
    spots: (c.spots || []).map((_, i) => has('spot' + (i + 1))),  // 景点数不锁 3，按 city.spots 长度检测
    seasonImg: has('season'),
  };
  fs.writeFileSync(path.join(dir, 'scenes.js'), genScenes(c, ROOT, opts), 'utf8');
  // 旅行类片子片尾 slogan 固定「下一站想去哪儿？」
  fs.writeFileSync(path.join(dir, 'brand.json'), JSON.stringify({ slogan: '下一站想去哪儿？' }, null, 2), 'utf8');
  const dia = c.dialect || DIALECT[c.name] || '';
  // 方言城 → 本地克隆（川/东北/陕=Vivi，其余方言=小天）；普通话城 → 火山小天
  // 河南话：定稿走 CosyVoice3 原生方言 instruct + 小天克隆 + speed（DIALECT_INSTRUCT_V3）
  const v3instruct = DIALECT_INSTRUCT_V3[dia] || '';
  const prompt = VIVI_DIALECTS.has(dia) ? 'vivi' : 'xiaotian';
  const instruct = v3instruct || DIALECT_INSTRUCT[dia] || (dia ? `用${dia.replace(/话$/, '')}话说这句话` : '');
  const voiceJson = dia
    ? { engine: 'cosyvoice', prompt, dialect: dia, instruct, ...(DIALECT_SPEED[dia] ? { speed: DIALECT_SPEED[dia] } : {}) }
    : { voice: c.voice || TAOCHENG, dialect: '', dialectCode: '', style: '' };
  fs.writeFileSync(path.join(dir, 'voice.json'), JSON.stringify(voiceJson, null, 2), 'utf8');
  const how = dia
    ? `${dia}（本地 ${prompt === 'vivi' ? 'Vivi' : '小天'} 克隆${instruct ? ' + instruct「' + instruct + '」' : ''}${DIALECT_SPEED[dia] ? ' + speed ' + DIALECT_SPEED[dia] : ''}）`
    : `普通话（${c.voice || TAOCHENG}）`;
  fs.writeFileSync(path.join(dir, 'README.md'), `# 《${c.name}》资料来源\n\n- 城市：${c.prov}\n- 主题色：${c.theme || 'warm'}\n- 配音：${how}\n- 内容要点由批量数据集 batch/cities.json 提供；数字与季节为通用常识，未逐条引用来源。\n`, 'utf8');
  made.push(prefix + c.name);
}
console.log(`已生成 ${made.length} 期：\n  ` + made.join('\n  '));
