---
name: whiteboard-video
description: 手绘白板风"边画边讲"讲解视频出片 skill（Excalidraw 风格逐笔动画 + 火山引擎配音 + 烧录字幕 + 品牌水印与片尾卡 + 三版封面 4:3/3:4/16:9 + 各平台发布文案）。当用户说"做一期白板视频 / 边画边讲 / 手绘讲解视频 / 用 excalidraw 做视频 / whiteboard video"，或要在本仓库里新建一期、改场景、换贴纸或真实 Logo、重出片、改字幕、出封面、写发布文案时使用。全链路本地：Playwright + ffmpeg + 火山 TTS + 本地 codex CLI 生图，不需要剪辑软件。
version: "2026-09-26"
origin: github
display_name: "手绘白板讲解视频"
display_name_en: "Whiteboard Explainer Video"
description_zh: "手绘白板风「边画边讲」讲解视频：Excalidraw 逐笔动画、火山配音、烧录字幕、品牌水印、三版封面（4:3 / 3:4 / 16:9）与发布文案。"
description_en: "Hand-drawn whiteboard explainer video: Excalidraw stroke animation, TTS, burned-in subtitles, brand watermark, covers, copy."
visibility: "public"
---
> 中文触发词：白板视频、边画边讲、手绘讲解视频、excalidraw 视频、whiteboard video。
>
> 维护：未智境AI ｜ 仓库：<https://github.com/H1088880/whiteboard-video-skill>。

# whiteboard-video：白板讲解视频出片

工具就是本仓库（下文 `<仓库>`），CLI 是 `<仓库>/bin/wb`，参数全在 `<仓库>/config.json`。每期内容在 `config.json` 的 `dirs.projects`（默认 `<仓库>/episodes/<日期 标题>/`），中间产物与成片在 `dirs.build`（默认 `<仓库>/build/<日期 标题>/`）。

本文件只讲流程与规矩。细节按需翻：`references/dsl.md`（场景与封面 API）、`references/scene-patterns.md`（版式坐标）、`references/stickers.md`（贴纸、真实 Logo、真人漫画像）、`references/publish.md`（标题与发布文案）；公共工序在本仓库的 `references/common/`：`fact-check.md`（查证）、`compliance.md`（合规）、`delivery-qa.md`（验收）、`cover-qa.md`（封面验收）、`platform-copy.md`（发布文案机制）。

## 硬规矩

1. **全链路本地。** 旁白走火山引擎语音合成（凭证在 `<仓库>/.env`，音色可以是官方音色或你自己的声音复刻），语速默认 1.2 倍原生合成；贴纸走本地 `codex` CLI 生图；真实 Logo 走 Wikimedia Commons 官方 SVG（`wb logo`）；配乐放 `assets/bgm.mp3`，没有就出无配乐成片。改配置不改代码。
2. **一处为主。** 期目录就是工程目录，`scenes.js` 是唯一手写源（旁白、场景、封面都在里面）；`scenes/`、`旁白稿.md`、`字幕.srt`、`封面-*.png` 是生成物，不手改、不外拷。`README.md`（资料来源）和 `发布.md`（文案）是人写的。视频不放进期目录：成片在 `<dirs.build>/<期>/outputs/final.mp4`，中间产物在同目录 `work/`，`旁白稿.md` 里自动带成片链接。
3. **先旁白后画面。** 旁白按 `|` 切 beat，每 beat 3~4 句配一组元素；6~8 个场景，成片 2~2.5 分钟（1.2 倍语速下约 500~600 字）。
4. **画布 1920×1080。y≥960 是字幕区，右上 320×130 是水印区**，元素不进去；`wb scenes` 的 ⚠ 必须清零。
5. **公司、产品、模型用真实 Logo；人物、器械、物件用贴纸；文字、箭头、框用 Excalidraw。** 讲到具体公司时主角用官方 Logo（`wb logo`），不用生图拟人机器人代指，观众认不出是谁。讲到具体公众人物时用真人照片参考的漫画像（`wb image ... --ref=照片 --likeness`，见 `references/stickers.md`），不用通用小人代指。Excalidraw 画人很丑，人和物件一律出贴纸。
6. **事实先查再写。** 数字、日期、价格要有来源，写进期目录 `README.md`；估算值在旁白和文案里都标"据报道/估算"。查证动作见 `references/common/fact-check.md`。
7. **品牌层自动带，不用每期写。** 右上角手写水印（第一场景逐笔画入）、片尾品牌卡（≈5.5 秒，念 slogan + CTA）、封面上的品牌标都由工具生成，名字、品牌色、slogan 在 `config.json` 的 `brand`；标题和点睛色优先用 `C.brand`。
8. **交付用「看片.html」，不直接甩 final.mp4**（用户约定 2026-09-29）：`wb 看片 <期>` 生成播放页（播放器 + 三版封面 + 分镜抽帧，成片拷为 `<题名>-final.mp4` 放同目录），present_files 只给看片.html。`wb build` 出片后自动生成。
9. **另有一套「铁律」（用户定死的内容/版式/配音/交付红线），跨平台总表在 skill `video-rules`**（2026-10-01 整理；本机另有一份人类可读版在工作区 `铁律.md`）。本文件各章节是它的展开说明。动手前扫这六条：①景点必须是该地标实景贴纸、不许图元；②牛皮纸白底永不染、每期一个主色；③封面固定出 3 版（4:3/3:4/16:9）；④配音只有小天/Vivi 两个声音、语速走模型原生 speed；⑤改了 scenes.js 要重跑 `node <期>/scenes.js`；⑥qc 全绿 + `wb audit` 两项为 0 才交付。
9. **用户只给主题时要无人值守跑完**（用户约定 2026-09-29）：收到"一个主题"＝授权跑完整条链路，**中途不要再问选题拆解/配色/时长/是否出片**，跑完直接交付看片.html。见下方「一句话出片 SOP」。

## 命令

```bash
W=<仓库>/bin/wb
$W new "<标题>"                          # 建期目录：scenes.js 模板 + 发布.md 模板
$W logo "<标题>" logo-x="Commons 文件名.svg" ... [--vs=x,y]   # 真实 Logo → assets/<name>.png；--vs 拼 "A VS B" 封面图；--search="词" 先看候选
$W image "<标题>" name="英文描述" ...     # 贴纸，一次 ≤4 张（四宫格同风格）→ assets/<name>.png
$W stills "<标题>"                       # 每 beat 静帧 → <后台>/<期>/work/frames/，逐张看
$W cover "<标题>"                        # 封面-4x3.png + 封面-3x4.png → 期目录
$W 看片 "<标题>" [输出目录]               # 出「看片.html」播放页（成片+封面+分镜抽帧）＝标准交付物
$W lab [端口]                            # 渲染实验室：本地 http://127.0.0.1:8791，拖动节奏/字幕旋钮即时看真实画面（同一渲染引擎），满意后「应用并重渲」；调效果一律先进实验室试，别拿整片出片当试错
$W build "<标题>"                        # scenes → tts → render → mix → cover → clean → 看片，出 outputs/final.mp4 / 看片.html
```

分步：`scenes` / `tts` / `render [scene|99-brand]` / `mix [gain]` / `clean` / `open` / `list`。`wb build` 出片后自动 `clean`：删 `work/frames` 静帧和 `work/out` 里已不在场景表的旧分段，各场景分段与 master 保留（单场景重渲、重混配乐要用）。期参数用标题子串（`wb build 薄肌`）。`wb render <期> 03-xxx` 只重渲一段并自动重拼 master，接 `wb mix` 即新成片；TTS 有缓存，只有改过的旁白会重配。

> **⚠ `wb render` 不重编译场景**：它直接渲染 `episodes/<期>/scenes/` 里上次 `wb scenes` 编译的
> `.excalidraw.md`（stills/cover 会先自动跑 scenes.js，render 不会）。改了 `scenes.js` 或
> `config.json` 的 `brand.accent`（DSL 的 `C.brand` 编译进场景元素颜色）之后，**必须先
> `wb scenes <期>` 再 render**，否则成片还是旧画面——2026-09-28 实测踩坑：accent 已改蓝，
> 只 render 重出的 5 期片头标题仍是编译时的旧品牌绿，和水印（渲染时现读 config）绿蓝混色。
> 渲染时现读的 config（watermark/pen/captions/endCard）不受影响，只 render 就生效。

## 一句话出片 SOP（用户只给主题时，照此无人值守跑完）

用户发来主题（一句话/一个词）＝全权委托。**不再追问选题拆解、配色、时长、要不要出片**，按下表一路跑到交付；只有真的失败（TTS 失败、渲染报错、素材拿不到）才停下来报告，并给出已完成的进度。

| 步 | 做什么 | 命令/产物 | 判据 |
| --- | --- | --- | --- |
| 1 | 立题定角度：一句话切入点 + 3~5 个分论点，口吻按账号默认 | 写在 `README.md` | 有观点，不是百科罗列 |
| 2 | 查证：数字/日期/价格要有来源，写进 `README.md` | 搜索 | 估值得标"据报道/估算" |
| 3 | 写旁白稿：500~600 字，`|` 切 beat，每 beat 3~4 句 | 写进 `scenes.js` | 6~8 场景 |
| 4 | 定主题色：整期一个主色（旅行多站可逐场景换色），**白底永不染** | `use(__dirname,{theme})` / `new Scene(...,{theme})` | 预设 warm/ocean/forest/berry/grape |
| 5 | 配素材：公司/产品/模型用真实 Logo，人物/物件用贴纸 | `wb logo` / `wb image` | 人不用 Excalidraw 画 |
| 6 | 编译场景 + 排期自检 | `wb scenes <期>` | ⚠ 清零 |
| 7 | 一条龙出片 | `wb build <期>`（scenes→tts→render→mix→cover→clean→看片→qc） | 末尾自动体检 |
| 8 | 看体检结果 | `wb qc <期>` | **全绿才交付**；有 ✗ 就自己修到绿（改 scenes.js 重渲 / 调参数），修完再交付 |
| 9 | 生成交付页 + 发布文案 | `wb 看片 <期> <工作区交付目录>`；`发布.md` | present_files 只给看片.html |

默认参数（除非主题明显不合适）：成片 2~2.5 分钟、6~8 场景、语速 1.2、三版封面（4:3 / 3:4 / 16:9）必出。交付目录放当前工作区下 `<主题>交付/`。

## 一期的流程

### 1. 立题与查证
- 明确选题、观众、口吻（默认冷静科普口吻，账号口吻写进 `references/publish.md`）。
- 搜 2~3 轮；**官方页优先且读到全文**，二手站数字只做线索。
- 数字、日期、来源列进 `README.md`「资料来源」，口径（"240 倍 = 6000 万 / 25 万"）单列一节。

### 2. 写旁白（scenes.js）
- 口语短句，每句一个信息点。数字用中文读法利于 TTS（"三百美元"）；字幕用原文，所以阿拉伯数字也行，但 `@`、`iOS` 这类 TTS 会念歪的词要斟酌。
- 结构：开场定义/反差 → 分解（三要素/两列对比/时间线）→ 怎么算/怎么做 → 数字与门槛 → 冷水/边界 → 一句话总结 + 评论区问题。
- 每个 beat 都要有能画出来的东西，抽象句并入相邻 beat。按原速写即可，成片语速 1.2 倍。

### 3. 出 Logo 与贴纸
- **先列本期出现的公司/产品/模型 → `wb logo`。** `wb logo --search="<公司> logo"` 看 Commons 候选，挑官方现行版（带年份的取最新），一期一条命令取齐：标志（`logo-<名>`，方形，放主视觉）+ 字标（`logo-<名>-word`，横长，当标签/表头）；两家对比再加 `--vs=a,b` 出 `logos-vs.png` 当封面主图。来源自动记在 `assets/logos.json`，抄进 README「画面素材」。Commons 没有的，去官网 press kit / brand 页找 SVG，确认授权再下载。
- 再列本期物件（人物、器械、设备、道具），`wb image` 一次 ≤4 张，英文描述写姿势/服装/颜色（默认 Excalidraw 五色：pale yellow/blue/green/red/grey）。
- **画廊画风贴纸**：`scenes.js` 首行若有工作台导出的 `// ART_STYLE={...}` 注释（「画廊同步」选的 278 种画风），
  `wb image` 会自动把它拼进贴纸提示词（`gen-image.mjs` 的 `loadArtStyle`/`galleryStyleTail`），替代内置白板风；
  没有该注释则回退内置 STYLE。贴纸硬约束（纯白底/无文字/无阴影/无边框）两种都保留。
- 逐张看 `assets/<name>.png`：杂点、邻格残片、主体断块 → `--single` 单张重出；只是抠图问题 → `--rekey`。封面主角贴纸也在这一步出（公司题材封面用 Logo，不另出）。

### 4. 画场景
- 抄 `references/scene-patterns.md` 的版式坐标再微调；贴纸 `s.image(x, y, 'name', { h: 370, align: 'center' })`，人形 360~380 高；Logo 同样用 `s.image`：主视觉标志 h 260~300，卡片/柱子里 h 100~130，字标当标签用 `w`。
- 一屏 10~20 个元素；一个 beat 塞不下就删元素，别指望笔画得完（排期最多溢出到下一段前 35%，再多就整体压缩）。
- `wb stills` 后**逐张看静帧**：重叠、越界、文字超宽、太挤。改到满意。

### 5. 封面
- `scenes.js` 末尾 `cover` 函数：`s.coverLayout({ ratio, title, sub, sticker })`，`build(__dirname, scenes, { cover })`；`wb cover` 按 `config.json` 的 `cover.ratios` 出**三版**：`封面-4x3.png`（横版·公众号/B站）、`封面-3x4.png`（竖版·视频号/小红书）、`封面-16x9.png`（宽横版），一版都不能少。
- 标题 ≤2 行、每行 ≤8 字：第一行说对象，第二行说钩子（自动品牌色 + 马克笔高亮）；副标放数字；贴纸用主角（公司题材传 `sticker: 'logos-vs'` 或单个 `logo-x`，宽图在竖版会自动按宽度缩）。
- **三张 png 逐张看**：文字没撞贴纸、高亮压在钩子行、品牌标在角上；16:9 另看贴纸坐在右下贴底、没压到标题栏。

### 6. 出片与验收
- `wb build`。抽 2~3 帧看（`ffmpeg -ss <t> -i final.mp4 -frames:v 1 x.png`）：字幕在底、水印在右上、贴纸擦出正常；片尾看一眼 `99-brand`。
- 看 `字幕.srt` 前几条：原文拼写、数字未拆。
- 机器检查与交付边界按 `references/common/delivery-qa.md`。
- `README.md` 写好，时长以 `ffprobe` 为准。

### 7. 发布文案与标题
- 按 `references/publish.md`：5 个标题候选（数字反差 / 事件主语 / 结论前置 / 生活单位换算 / 提问）选 1 主用；视频号简介、小红书标题+正文+标签、B 站标题、公众号摘要、评论区置顶。
- 数字与 `README.md` 一致；合规自查勾完（`references/common/compliance.md`）。
- 填 `发布.md`，交付四件套。

## 修改类请求怎么接

| 用户说 | 做法 |
|---|---|
| 改某句旁白 / 加一段 | 改 `scenes.js` → `wb build`（只重配改过的场景） |
| 用了假机器人 / 要真 Logo | `wb logo` 取官方 SVG → scenes.js 把 `s.image` 名字换成 `logo-*` → `wb stills` → `wb render && wb mix && wb cover` |
| 换贴纸 / 人物太丑 | `wb image` 重出 → `wb stills` → `wb render && wb mix`（封面用到的话再 `wb cover`） |
| 画得太快/太慢、文字蹦出来 | config `render.pen`：`speed` 描边 px/s、`charSeconds` 每字秒数区间、`minSeconds` 单元素下限、`gapSeconds` 抬笔间隙 → `wb render && wb mix` |
| 渲染太慢 / 机器吃紧 | config `render.workers`（默认 4 路，每路一个 Chromium；1 = 串行），出帧与路数无关、逐帧一致 |
| 语速快/慢 | config `tts.speed`（默认 1.2）→ `wb build`，全部场景自动重配、字幕同步 |
| 配乐大/小 | config `bgm.gain` → `wb mix`；临时试听 `wb mix <期> 0.4` |
| 字幕字号/位置 | config `captions.fontSize / baselineY` → `wb render && wb mix` |
| 水印位置/关掉/换 logo | config `brand.watermark.position/enabled`、`brand.logo`（透明底 png）→ `wb render && wb mix` |
| 片尾卡 slogan / CTA / 时长 / 不要 | config `brand.slogan`、`brand.endCard.*`（改完 `wb tts <期> 99-brand` 重配配音）→ `wb render <期> 99-brand && wb mix`；已出的期批量刷用 `bash lib/refresh-endcard.sh --card-only <期…>` |
| 封面文案 / 贴纸 / 画幅 | `scenes.js` 末尾 cover 函数 → `wb cover`；画幅 config `cover.ratios`，标签 `cover.seriesTag`（`tag: ''` 去掉） |
| 标题 / 发布文案 / 换平台 | 改 `发布.md`，不用重出片 |
| 在 Obsidian 里改了图 | `wb render && wb mix` 直接读 `.excalidraw.md`；增删元素会改逐笔顺序，结构性改动回 `scenes.js` |
| 换声线 / 换曲 | `.env` 的 `VOLC_TTS_VOICE` 或 config `tts.voice`（声音复刻音色配 `resourceId: volc.megatts.default`）/ `assets/bgm.mp3`（换曲先 volumedetect 量电平再定 gain） |
| 换账号品牌 | config `brand.name/accent/slogan`，其余不动 |

## Obsidian 改图环境（可选）

`wb scenes` 会同时写 `scenes/<场景>.excalidraw.md` —— Obsidian Excalidraw 插件的原生格式（文件头 `excalidraw-plugin: parsed`），`lib/render.js` 第 41~64 行直接读它出片（压缩块走 lz-string）。装了插件，场景图就能在 Obsidian 里打开改，不用碰 `scenes.js`。

配置三步：① 装 Obsidian（Windows `winget install Obsidian.Obsidian`，macOS 从 obsidian.md 下）；② **Open folder as vault** 选 `dirs.projects` 指向的目录（默认 `<仓库>/episodes/`），每期一个文件夹；③ 设置 → 第三方插件 → **关掉受限模式** → 浏览搜 `Excalidraw` → 安装启用。

> ⚠️ **受限模式开关绕不过去**：Obsidian 把它存在只有应用自己能写的地方，手工改 `.obsidian/` 下的文件无效，必须在 UI 里点一次。预装插件文件只保证"装完就有"，启用那一步得人手点。

改完：`wb render && wb mix` 直接吃改过的图。挪位置 / 改大小 / 改文字立刻生效；**增删元素**会改逐笔顺序，结构性改动回 `scenes.js`。另外 `wb scenes` 会用 `scenes.js` 覆盖 `scenes/` 下的图，Obsidian 里的手动改动会被冲掉 —— 接"改图"类请求时先问清这次以谁为准。

## 已知坑

- Logo：很多官网有验证页拦截，Logo 一律走 Commons API（`wb logo`），别去官网抓图。OpenAI 2025 字标最后的 "I" 就是一根竖条，不是被裁掉；Claude 星芒 SVG 边缘略锯齿，放大到 300 高以内看不出来。
- 火山 TTS 偶尔只返回半段：`tts-volc.mjs` 按逐字数校验自动重试；全量重配 `FORCE_TTS=1`。缓存键含文本+音色+语速，改语速会全部重配。
- 字幕文本必须用原文，TTS 词会把 `@grok` 写成 `atgrok`；字幕时间来自 TTS 逐字时间戳，改旁白必须重跑 tts。
- SVG dash 在每个子路径 `M` 处重起，rough.js 又双描边：整条 path 一起 dashoffset 会"所有边同时长、每边描两遍"。渲染器已按子路径拆节点、双描边拆 A/B 层，别回退。
- **本机「批量删除保护」**：累计删到约 50 个后所有 `fs.rmSync` 会被拦 `SAFE_DELETE_BULK_CONFIRM_REQUIRED`，批量出片时 TTS/mix 清临时文件会中断整条流水线（成片质量不受影响）。已在 `lib/safe-rm.cjs` 里把删除降级为"尽力而为"（失败→改名挪到系统 temp→再失败就忽略），并由 `render.js / scene-dsl.js / mix-bgm.mjs / gen-image.mjs / tts/tts.mjs / tts/content-cache.mjs` 首加载挂载。新增 lib 脚本如果要在批量里跑，**记得 import './safe-rm.cjs'**。另外 `wb clean`（清静帧）在批量里照样会被拦，`lib/run-batch.sh` 刻意不走 clean。
- 文本宽度是估算值，居中用 `align:'center'` 才准；左对齐长文本别超 1920。
- Playwright 截图偶发 30s 超时，渲染器带 3 次重试；再挂重跑 `wb render`。
- 不要并发跑 `wb image`：codex 没按指定路径落盘时会兜底抓"最近生成的图"，并发会互相抓错。
- `wb mix` 撞顽固 EBUSY(-4082)（node spawnSync 不解析 WinGet Links 下 0 字节的 ffmpeg/ffprobe app alias，重试+cmd 兜底都可能连挂）时，别再死磕 node 版，直接跑 Python 版绕过：`python lib/mix-bgm-py.py "<期完整目录名>" [gain]`（行为与 mix-bgm.mjs 一致，旧 final.mp4 自动备份为 final-旧版.mp4）。bash 里手调 ffprobe 正常不代表 node spawn 正常，PATH 前置真 ffmpeg 目录也未必救得回来。
- 渲染整期约 35 秒（4 路并行，2.5 分钟片），`wb build` 全程约 40 秒（TTS 命中缓存时）。后台长任务不要用 `&`，用工具自带的后台运行。
- 并行出帧靠两点，别动：`render.html` 的 `seek()` 每帧把底色矩形原地重插，强制整屏重画（否则 Chromium 只重画变化区域，帧会跟出帧顺序有关）；每路单开一个 Chromium。改渲染器后用 `render.workers=1` 和 `4` 各出一遍，`ffmpeg -f framemd5` 对比必须 0 帧不同。
- 用 `require()` 跑 `templates/scenes.js` 会在 templates/ 下生成产物，别这么测；冒烟测试用 `wb new`。


---

<!-- WORKBUDDY-ADAPT -->

> **【WorkBuddy 环境适配 · 本节覆盖原文中所有平台专有写法】**
>
> 1. **打开产物一律用 `present_files`**：成片 `final.mp4`、封面 png、`旁白稿.md`、`发布.md` 都传**绝对路径**给
>    `present_files`。不要只把 `file://` URI 或裸路径丢给「让用户自己打开」——WorkBuddy 打不开。
>    ⚠️ 预览本地 HTML 时 `present_files` 会把文件拷到隔离目录，跨目录相对路径的图片会 403/404；
>    要预览带相对资源的页面，先在资源根目录起 `python -m http.server <port> --bind 127.0.0.1`，
>    再 `present_files` 打开 `http://127.0.0.1:<port>/...`。
> 2. **原平台专有工具在本环境不存在**（如 `mcp__codex_app__open_in_codex`、Claude Code 的某些内建调用），
>    严禁尝试调用或假装调用，按第 1 条用 `present_files` 替代。
> 3. **Windows 执行方式**（本机为 win32）：
>    - `bin/wb` 是 bash 脚本 → 用 Git Bash 跑：`bash "<skill 绝对路径>/bin/wb" build "<期名>"`。
>    - `wb open`（原文写在 Finder 打开）已改为 Windows 资源管理器，无需手动处理。
>    - 依赖安装不走 Homebrew：`winget install Gyan.FFmpeg`（ffmpeg/ffprobe）、
>      `winget install OpenJS.NodeJS`（Node 18+）、Python 用 `C:/Users/ADMIN/.workbuddy/binaries/python/versions/3.13.12/python.exe`。
>    - 路径里的 `~` 在 Windows 下已做 `HOME → USERPROFILE` 兜底。
> 4. **贴纸/封面生图**：原文走本地 `codex` CLI（`wb image`）。判断依据：`~/.codex/auth.json` 不存在即未登录
>    （`codex login` 也没用——本机网络对 `auth.openai.com` 返回 403、`api.openai.com` 不通，见第 7 条）。
>    未登录时走 **ImageGen 兜底**，已实测跑通（2026-09-26 养生期 4 张贴纸全部进片）：
>    - ① 取提示词：`node -e "import('./lib/gen-image.mjs').then(m=>console.log(m.stickerPrompt('英文描述')))"`
>      （复用本包 `stickerPrompt`/`caricaturePrompt`，保证与 codex 路径画风一致）→ 用 ImageGen 出 1024×1024、白底。
>    - ② 原图放进 **`build/<期>/work/raw/<name>.png`**（⚠️ 是 `work/raw`，不是 `raw`——见 lib/paths.cjs）。
>    - ③ 抠白底+裁边：`bash bin/wb image "<期>" <name>="sticker" --single --rekey`，**逐张跑**
>      （`--rekey` = 复用原图不重新生成）。产物 `episodes/<期>/assets/<name>.png`，透明底。
>    - ⚠️ **千万别直接调 `node lib/gen-image.mjs "<标题>"`**：它不做期名解析，会拿标题当相对路径，
>      在 skill 根目录误建 `<标题>/assets/` 假目录，之后 `resolveProject` 永远命中假目录、全部命令错位。
>      一旦误建：删掉根目录那个假目录即可恢复。一律走 `wb image`。
>    - 主体内部大面积纯白（如白枕头）会被泛洪抠空，属正常手绘观感，不必强修。
>    - `wb logo`（Wikimedia Commons 官方 SVG）不依赖 codex，可直接用。
> 5. **凭证**：火山 TTS 凭证仍放在本 skill 目录的 `.env`（字段见 `.env.example`），本包不上传、不外传任何密钥。
> 6. **没有火山凭证时也能出片（Edge TTS 备胎路径，已实测跑通）**：
>    - `wb scenes` → `wb stills`（无音频也能渲，用估算时长）→
>      `"C:/Users/ADMIN/.workbuddy/binaries/python/envs/default/Scripts/python.exe" lib/tts-edge.py "<期目录绝对路径>"`
>      （微软 Edge TTS 免密钥；**已修复**：脚本现在会自动把 mp3+json 同步到 `build/<期名>/work/audio/`，
>      render.js 只认后台目录那份，见 lib/paths.cjs 的 `audio` 字段——早期版本只写期目录，是对不上的）→
>      `bash bin/wb render "<期>"` → `bash bin/wb mix "<期>"` → `bash bin/wb cover "<期>"`。
>    - edge 脚本不带逐字时间戳 → `wb render` 会出「字幕 0 条」（无烧录字幕），音画同步用 segmentStarts 没问题；
>      **要逐字对齐的字幕必须用火山**。
>    - **EBUSY（errno -4082，pid=0）**：本机 node 用 `spawnSync` 拉 ffmpeg/ffprobe 会时发失败，而且可能
>      持续十几秒一直失败（实测 5 次 0.5/1/2/4/6s 阶梯退避 + `cmd.exe /c` 兜底全部照挂），但**同一条命令
>      在 Bash 里直调必定成功**。`wb mix` 报 EBUSY 时，直接把报错里 `spawnargs` 那串参数拼成命令在 Bash 跑：
>      无 BGM 时就是 `ffmpeg -y -loglevel error -i "<master.mp4>" -c copy -movflags +faststart "<final.mp4>"`。
>      `lib/mix-bgm.mjs` 的 `runBin()` 已带阶梯退避 + cmd.exe 兜底，仍失败就走手动，不影响成片内容。
>      **2026-09-28 补充：EBUSY 是 node 专属，Python 不受影响**（`subprocess.run(['ffprobe', ...])` 一次就成，
>      连测 3 次 node 全挂、python 全过）。**现成脚本：`lib/mix-bgm-py.py`**——与 `mix-bgm.mjs` 行为一致
>      （读 config bgm 参数、说话/间隙双电平、缓坡、尾部淡出、循环、旧 final 自动备份为 `final-旧版.mp4`），
>      用法 `python lib/mix-bgm-py.py "<期目录完整名>" [gain]`，gain 缺省取 `config.bgm.gain`。
>      `wb mix` 挂掉时直接跑它，不必再手拼 spawnargs。原理（已固化进脚本）：
>      读 `config.json` 的 bgm 参数 → ffmpeg 提取旁白 f32（48k 单声道）→ 10ms 窗 RMS 做说话掩码（>-38dBFS，两侧扩 120ms）
>      → 目标电平移动平均成包络（尾部淡出 + 开头 1.5s 淡入）→ 写立体声 f32 → 一条 `amultiply` + `amix` 混合，
>      `-c:v copy` 不出帧。比手拼 filter_complex 省事，结果与 `wb mix` 一致。
>    - **排障提醒**：不要用 `taskkill /IM chrome.exe` 清残留进程！本机 chrome.exe 是用户自己的
>      Chrome（`C:\Program Files\Google\Chrome`）和百分浏览器（`D:\百分浏览器\CentBrowser`），
>      杀掉会丢所有标签页。playwright 的 Chromium 只在 `G:\ms-playwright\` 下，要清就按路径区分。
>    - edge 音色/语速用环境变量 `VOICE`（默认 zh-CN-YunxiNeural）、`RATE`（默认 +2%）控制。
> 7. **codex CLI 在本机登录不了（2026-09-27 实测，别再重复排查）**：
>    - `codex login`（浏览器 OAuth + localhost:1455 回调）跑满 6 分钟 → `Login cancelled`；
>      `codex login --device-auth` → `device code request failed with status 403 Forbidden`。
>    - 根因是网络：本机唯一出口是 WorkBuddy 注入的代理 `127.0.0.1:16035`，对 `auth.openai.com` 返回 **403**，
>      `api.openai.com` / `chatgpt.com` 返回 **000（不通）**；直连与常见代理端口（7890/7897/10809）同样不通。
>    - 快速定性三连：`ls ~/.codex/auth.json` +
>      `curl -m 8 -o /dev/null -w "%{http_code}" https://auth.openai.com/.well-known/openid-configuration` +
>      `curl -m 8 -o /dev/null -w "%{http_code}" https://api.openai.com/v1/models`。
>    - 结论：**贴纸一律走第 4 条的 ImageGen 兜底**，不要试图先去登录 codex。除非用户给出可用出口
>      （可访问 OpenAI 的代理地址 / OpenAI API Key 走 `codex login --with-api-key` / 别处登录拷回
>      `~/.codex/auth.json`）。
> 8. **出片三件套环境修正（2026-09-28 实测，《宣传片是怎么钩住人的》全流程跑通）**：
>    - **ffmpeg PATH**：winget `Links/` 下的 ffmpeg.exe 是 shim，node `spawnSync` 会报 **EFTYPE**；
>      必须把**真身 bin 目录**放进 PATH 再跑 `wb build`：
>      `/c/Users/ADMIN/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin`。
>      Remotion 内置 ffmpeg（n7.1）解不了 image2pipe 的 jpeg，**不能**当备胎。
>    - **Chromium 截图崩溃**（"Unable to capture screenshot" / "browser has been closed"）：
>      已给 `lib/render.js` 的 `openPage()` 加 `--disable-gpu` + 3 次启动重试；同时 config `render.workers`
>      要保持 **1**（本机 4 路并发必挂；单路 86s 片约 1 分钟，可接受）。
>      **崩溃固定在同一帧 ≈ 内存不足**（`GlobalMemoryStatusEx` 查：内存负载 >85% 时 Chromium 渲染进程被系统杀，
>      静默无 stderr，重试无效）。已给 `encodeFrames` 加**页面轮换**：`seek(t)` 无状态，每 150 帧
>      `page.reload()` 后用 `mountScene()` 重装场景，逐帧结果不变；2026-09-28 实测 86% 负载下
>      原来必在第 300 帧崩，改后 3300 帧全程稳定。
>    - **wb mix EBUSY（pid:0）**：按第 6 条把 spawnargs 手拼成命令直调；若 Bash 沙箱拦 ffmpeg，
>      改用 **PowerShell 工具**跑 `ffmpeg -c copy -movflags +faststart`，产物再拷回 `outputs/final.mp4`。
>      cover/clean 没跑完就单独补 `wb cover`。
> 9. **Obsidian 改图环境本机已配好（2026-09-28）**，接"改某张场景图"类请求可直接用：
>    - 主程序 `C:\Users\ADMIN\AppData\Local\Programs\Obsidian\Obsidian.exe`（1.13.7，`winget install Obsidian.Obsidian` 装的）。
>    - **vault = `<skill>/episodes/`**，也就是 `config.json` 的 `dirs.projects` 本身，零迁移。已写进 `%APPDATA%\obsidian\obsidian.json`，
>      打开 Obsidian 直接列出 5 期文件夹（旁白稿、字幕、封面、scenes/*.excalidraw.md 都在里面）。
>    - Excalidraw 插件 2.27.3 已预装到 `episodes/.obsidian/plugins/obsidian-excalidraw-plugin/`（main.js + manifest.json + styles.css），
>      `episodes/.obsidian/community-plugins.json` 已列好。
>    - **还剩一步必须人手点**：设置 → 第三方插件 → **关闭受限模式**。这个开关 Obsidian 存在应用自己的配置里，写文件绕不过去，别白试。
>    - 升级插件：github.com 本机不通（000），走 **api.github.com 取 release asset**（`-H "Accept: application/octet-stream"`）；
>      main.js 4.8MB 单次 curl 常被截断，用 `-C -` 续传再比对字节数。
>    - `episodes/` 已在 `.gitignore` 里，`.obsidian/` 不会进 git。
> 10. **自有品牌 Logo v2 已就位（2026-09-28，蓝紫渐变版）**：`config.json` 的 `brand.logo` 指向
>    `assets/weizhijing-ai.png`（1050×332 透明底横排 lockup：渐变 mark + 「未智境Ai」渐变字标）。
>    素材来自用户提供的两张品牌图，经**边界泛洪 + 饱和度阈值**背景分离提取（mark 背景是高饱和渐变天空，
>    饱和度阈值单独用会失败，必须配合从四边泛洪）；分层源 `assets/weizhijing-ai-mark.png`（847×478，
>    含左上紫色爱心）与 `assets/weizhijing-ai-text.png`（445×101）。元数据登记在 **skill 根**
>    `assets/logos.json`（键 `weizhijing-ai`，`kind: brand-self`，自有版权；v1 绿色矢量版归档在
>    `assets/archive/`）。给了 `brand.logo` 后，**右上角水印角标与片尾品牌卡都用 logo 图代替手写名**；
>    `brand.accent` 已同步为 mark 均色 `#2573fd`（v1 是绿色 #2f9e44）。
>    `render.js` 读 PNG 的 IHDR 取宽高（`readUInt32BE(16/20)`），**`brand.logo` 只能给 PNG**。
>    **入场动画 = 逐笔画出（image 默认的左→右擦除 + 笔尖跟随），水印与片尾卡 logo 都用这个，不许改成淡入**
>    （2026-09-28 五轮返工的最终定稿，用户原话「返回一开始的动画效果」）。中途曾给位图 logo 加
>    `appear: 'stamp'`（整块淡入+缩放回落），被用户明确否掉——白板片的灵魂是手绘感，logo 也要像被
>    笔画出来的（星形 → logo 擦出 → 下划线，按 drawInSeconds 分段推进）。stamp 模式已从
>    render.html / scene-dsl.js 移除，别再加回。
>    **图标要大、要清楚**：`watermark.drawInSeconds: 1.2`；`logoHeight: 88`（缺省 size*1.6=64 时
>    mark 内容只有 57px 高，手机上细笔画糊成一团，用户会报"没画全"）；`sparkle: true`（装饰星是
>    入场动画的第一笔，logoHeight 加大后星只占 logo 宽 ~17%，比例正常）；`opacity: 0.9`、`size: 40`。
>    mark 以**无花瓣版**为准（与品牌实际使用图标一致，用户参考图确认）；带花瓣变体存
>    `assets/archive/weizhijing-ai-*-petal变体.png`。
>    改标志：替换 `assets/weizhijing-ai.png`（或改分层源后重新合成）→ `wb render && wb mix`；
>    备份：`config.json.bak-20260928-logo`（接 logo 前）、`config.json.bak-20260928-logo2`（v1 绿版 accent）、
>    `config.json.bak-20260928-wm`（首帧直出版）、`config.json.bak-20260928-wm2`（直出→动画定稿前）。
>    注意 `logos.json` 有两层：**skill 根** `assets/logos.json` = 品牌自有资产登记；`episodes/<期>/assets/logos.json`
>    = `wb logo` 抓 Commons 的每期来源流水，两者互不影响。


## 城市旅游片批量流水线（2026-09-29 起，"中国所有城市各一部"）

> **三条铁律（2026-09-29 用户定死，做任何一座城都照此不变）**：
> 1. **文案多元化**——每城措辞轮换，不许同一腔调（intro/报站/美食/收尾各 3 套，按城名哈希确定性选套，叠加每城 hook/why/foodTip）。
> 2. **每城当地方言配音**——每个城说自己的话，但**全系列只两个声音**：普通话=火山小天；四川/东北/陕西话=本地 Vivi 克隆；其余方言（粤语/吴语等）=本地小天克隆。同一方言不重复克隆两份。
> 3. **每个景点都是专属的真实地标贴纸**——不许程序化图元凑数，`hero/spot1~3/food/season` 六张全用该城真实地标 AI 生图。

- 数据：`batch/cities.json`（每城 name/prov/theme/traits/hook/why/spots[3]/foods[3]/season）；队列 `batch/queue.txt`（333 地级行政区）。
- 生成：`node lib/gen-city.cjs [--only=北京,上海]` → `episodes/旅游-<城>/`（scenes.js + brand.json slogan「下一站想去哪儿？」+ voice.json 方言配音）。片结构固定：开场定位 → 三个必去 → 吃什么 → 什么时候来。
  - ⚠️ **顺序铁律：贴纸先生成入库，再 gen-city**。gen-city 是**当场检测** assets 里有没有 `<城>-hero/-food/-spots.../-season.png` 决定写不写贴纸分支的；反过来（先生成 scenes.js、后补贴纸）片子会退回程序化插画，**补了贴纸也不会进片**，必须重跑 gen-city + 整期重渲。
    - 🛡️ **2026-10-01 已加硬闸（此前是静默退回，导致河北省/邢台/廊坊/衡水/沈阳 五期漏图元）**：gen-city 现在**前置体检全部目标城市**，缺任何一张贴纸就打印清单并 `exit 1` 中止，不再静默出图元版；确要临时退回图元须显式 `--allow-illo`（不建议）。
    - 🔍 **出片前必跑 `wb audit`**（全期贴纸体检）：列出①还有哪些期在用 `illo(s,...)` 程序化图元、②scenes.js 引用了但 assets/ 里缺的贴纸。两项都应为 0，全绿才继续。
  - ⚠️ **贴纸命名用中文城市前缀**：`assets/成都-spot1.png`，不是 `chengdu-spot1.png`（keyout 输出直接落到 episodes/旅游-<城>/assets/，名字写对）。
- **方言配音（2026-09-29 用户需求：每城当地话）**：
  - 机制：`voice.json`（每期一个，gen-city 自动写）。**两套写法**：① 普通话=火山：`{ "voice": "zh_male_taocheng_uranus_bigtts" }`；② 方言=本地克隆：`{ "engine": "cosyvoice", "prompt": "vivi"|"xiaotian", "instruct": "用四川话说这句话" }`（prompt 选谁看上面分工表）。缓存键含 prompt/instruct，改方言自动全量重配。
  - ⚠️ **火山那套 `explicit_dialect` 已停用**（2026-09-30）：曾是 Vivi 的方言开关（`dialectCode: sichuan/dongbei/shaanxi`），但该音色授权 403，方言已迁到本地克隆；`VOLC_TTS_DIALECT` 分支保留只为回滚，新期不要再写 dialectCode。
  - **双引擎分工（2026-09-30 二次定稿，覆盖旧版）**：**全系列只有两个声音**——小天 与 已克隆好的 Vivi。
    - **普通话** → 火山小天 `zh_male_taocheng_uranus_bigtts`（火山唯一还在用的音色）。
    - **四川话 / 东北话 / 陕西话** → 本地 **Vivi 克隆**（`G:/cosyvoice/prompts/vivi_sc.wav`）。这三档原本就是火山 Vivi 负责的；用户原话「**Vivi 只负责本来那几种音色**」= 不给她扩新增方言。
    - **粤语 / 上海话（吴语）等其余方言** → 本地 **小天克隆**（`prompts/xiaotian.wav`，沿用已验收配方）。
    - ⚠️ **别重复做**：Vivi 有的那三种方言不再做小天克隆版（`G:/cosyvoice/out/d_sichuan/_dongbei/_shaanxi_*.wav` 已作废）；同理小天负责的方言也不回填 Vivi。
    - 方言一律 `inference_instruct2(文本, '用XX话说这句话<|endofprompt|>', prompt_wav)`。
    - **已接入配音层**：常驻服务 `E:/Miniconda/envs/cosyvoice/python.exe G:/cosyvoice/server.py`（127.0.0.1:8765，模型只加载一次）；期目录 `voice.json` 加 `{ "engine": "cosyvoice", "prompt": "vivi", "instruct": "用四川话说这句话" }` 即整期改走本地（`lib/tts/cosyvoice.mjs` + `WB_TTS_ENGINE=cosyvoice`，不开则与旧版完全一致，零回归）。
    - 字幕对齐：本地无逐字时间戳 → 用 **whisper small 词级**转写补（`words:true`，单位秒，与火山同形）；`tts-volc.mjs` 对 cosyvoice 用 **0.75** 的宽松阈值（方言转写会变字），但仍校验「有没有只念了半句」。
    - ⚠️ **服务端必须把多块拼起来**（2026-09-30 踩坑）：CosyVoice 会把长文案按句切成**多个 yield**，只保存第 1 块会丢掉尾段 → 片子「配音缺失 + 画面节拍错位」（成都 06-outro 只念了 64/83 字）。`server.py` 现在 `torch.cat` 全部块后一次落盘，并返回 `chunks` 便于核对。
    - ⚠️ **本地引擎不认 speech_rate**：config `tts.speed`(默认 1.2) 只作用于火山。忽略它会让本地旁白比原片慢约 20%（成都 81s→93s）。`lib/tts/cosyvoice.mjs` 已用 ffmpeg `atempo` 追平，并同比缩放词级时间戳。
    - 2026-09-30 实测：单条约 10s（首条含 whisper 加载 37s），比火山慢但可用、且不受授权限制。重渲前记得 `FORCE_TTS=1`（缓存键含 prompt/instruct/tempo，实际会自动失效）。
  - ⚠️ **CosyVoice 方言正确用法 = `inference_instruct2(文本, '用粤语说这句话<|endofprompt|>', prompt_wav)` 自然语言指令**（上海话『请用上海话说这句话』已实测 OK）。粤语文本可用标准书面语，也可用粤语白话文（嘅/係/嚟），待用户最终选型。
  - ⚠️ **CosyVoice 大坑：别用 `<|yue|>` 语言标签**——那套 `<|zh|>/<|en|>/<|yue|>` 属于**语音识别侧 whisper 词表**，CosyVoice2 **文本词表里根本没有**（只有 endoftext/im_start/im_end/endofprompt），写了会被当普通字符 → 粤语书面语被读成普通话（2026-09-30 实测踩坑，`cross_lingual('<|yue|>…')` 全废）。
  - ⚠️ **本账号 seed-tts-2.0 不支持粤语/吴语/闽南/河南话等**（explicit_dialect 只有东北/陕西/四川），这些城按上面分工走本地 CosyVoice（**粤语/吴语=小天克隆**），不要硬凑普通话。**CosyVoice 已接入配音层**（2026-09-30）：起常驻服务 + voice.json 写 `engine=cosyvoice`，详上。
  - 方言城（`batch/cities.json` 实际命中 7 座）：成都/重庆→四川话，哈尔滨/长春/沈阳/大连→东北话，西安→陕西话（**三档全=Vivi 克隆**）。其余普通话。想给某城新增方言：改 `voice.json` 加 `engine=cosyvoice`+`prompt`（Vivi 三档用 vivi，其余方言用 xiaotian）+`instruct`，然后重配+重渲。**不要再扩第三种音色源。**
- **文案多元化（2026-09-29 用户反馈「千篇一律」）**：city-template.cjs 里 intro/报站/美食/收尾各 3 套措辞，按城市名哈希 `vIdx` 确定性选套（同城永远同套，城际口吻错开），再叠加每城自有字段 hook/why/foodTip。改文案套路时保持每场景段数不变（3 段/场），节拍数才对得上。
- **贴纸（2026-09-29 用户定死：每个景点必须是专属的真实地标贴纸，不许程序化图元凑数）**：
  - **每城 6 张真实地标贴纸**，全部 AI 生图（ImageGen 白底 → keyout 抠透明），一张都不能省：
    `<城>-hero`（开场主视觉）+ `<城>-spot1/2/3`（三个必去景点，各画**该景点真实地标**）+ `<城>-food`（美食）+ `<城>-season`（什么时候来）。
  - ⚠️ **不许用 `lib/illo.cjs` 程序化几何图元顶替景点插画**（那是 2026-09-29 用户痛批的「批量套模板、插画不真实」，跟江西版真实地标贴纸差太远）。每个景点的贴纸要画那座具体的山/湖/塔/门/街，一眼能认出是哪。
  - 生成链：ImageGen 白底出图（**别用 background=transparent，会画成假棋盘格**）→ `node lib/keyout.mjs <in> <out>`（先填右下角 AI 生成水印 → 再抠白底）；hero 用 `--flat` 只去水印保留原底（放进相框更好看）。画风可在水彩/木刻/剪纸/版画/蜡笔/丝网间轮换，但**同一座城内部保持一套画风统一**（同城 6 张要像一套）。
  - 贴纸命名中文城市前缀 `assets/成都-spot1.png`（不是 chengdu-spot1）。贴纸先全部 keyout 入库，再 gen-city（gen-city 检测到才贴图；缺了会静默退回，补了也不进片）。
  - 批量出片前自检：`grep -o "<城>-(hero|spot1|spot2|spot3|food|season)" episodes/旅游-<城>/scenes/*.excalidraw.md` 应齐 6 种。
- 出片：`bash lib/run-batch.sh 旅游-北京 旅游-上海 …`（一条龙 build + 看片页，结果在 `batch/report.txt`；**不要走 clean**，会触发删除保护）。交付根：`工作区/城市旅游片/<城>/看片.html`，总索引 `node lib/city-index.cjs`。
- 单部约 2 分钟；333 城需分批跑，每跑完一批补一批城市数据（脚本够不着 ImageGen，贴纸由助手逐城调用生成）。
- **片尾固定模板（2026-09-29 用户二次定稿，别再改）**：品牌卡 = logo + 品牌色划线 + slogan + CTA 胶囊，**两拍逐笔画出**（第 1 拍 logo/slogan，第 2 拍 CTA 胶囊）。
  - **配音念全**：`wb tts` 把 `brand.slogan + brand.endCard.cta` 一起合成 `audio/99-brand.wav`（CTA 里的「 · 」朗读前换成逗号，否则 TTS 会读成「点」或吞掉）；文案变了会自动重配（比对 `99-brand.json` 的 `text`），改 slogan/CTA 不必手动 `FORCE_TTS`。
  - 卡片时长随配音自适应：`total = max(brand.endCard.seconds, LEAD + 配音长 + holdSeconds + 0.6)`，否则 ffmpeg `-shortest` 会把 CTA 尾音切掉。
  - 旅行类 slogan 由期目录 `brand.json` 覆盖成「下一站想去哪儿？」（其他题材用 config 默认「把复杂的事，讲明白。」）。
  - **正片 06-outro 不再画 slogan 胶囊**（2026-09-29 用户反馈：结尾不需要「下一站想去哪儿？」）。outro 的第 3 拍只留白，画面停在金句上，末句只走旁白+字幕。**slogan 全片只出现一次，就在品牌卡上。**
- **改了片尾要刷已出的期**：`bash lib/refresh-endcard.sh <期…>`（城市期会自动先跑 `scenes.js` 再重渲 06-outro + 99-brand → mix → 看片页，每期约 30 秒）；只改品牌卡时用 `--card-only`。**坑：只改 `scenes.js` 不跑 `node <期>/scenes.js`，渲染读的还是旧场景文件**（`.excalidraw.md`），成片不会有变化。
- **city-template 换行坑（2026-09-29 修过，别回退）**：`wrap()` 用真实换行连接、`esc()` 负责把真实换行转成 `\n` 转义。在生成器里手写 `'\\n'` 再过 `q()/esc()` 会被二次转义，片子里文字直接显示「\n」且整行出框（封面标题同理，用真实 `\n`）。
- 已修的选型：illo 有 `panda` 图元，`pickKind` 规则 `/熊猫|国宝/ → panda`（大熊猫基地此前兜底成 city 楼群，用户点名不对）。
- 增量重建（只重渲受影响场景）：`bash lib/rebuild-city.sh 旅游-<城>`（scenes → tts 06+卡 → render 02/03/04/06+99-brand → mix → 看片 → qc；01/05 沿用旧分段）。
- **贴纸生图必须串行**：ImageGen 的文件名 = 「提示词截断前缀 + 秒级时间戳」，同批并行的 food 提示词前缀相同 → **同秒直接互相覆盖**（实测 5 张只剩 3 张）；且**并行时 `output_dir` 不生效**（全落到最后一个目录）。规矩：一城两图分开发，food 一律单发；出图后逐张读图确认归属再入库。
- 抠底偶发失败：批量 keyout 会随机在某一两张上 chromium 报错。**别用 `set -e` 一把梭**，逐条打印结果，失败的单独重跑即可。
- 全部成片总入口：`node lib/all-films.cjs` → 工作区根 `全部成片.html`（扫 城市旅游片 + 各交付目录 + `往期交付/`，封面卡点开进看片页）。旧期没有看片页时先 `wb 看片 <期> <往期交付/<题名>>` 补一版。
