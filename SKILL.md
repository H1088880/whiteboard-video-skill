---
name: whiteboard-video
description: 手绘白板风"边画边讲"讲解视频出片 skill（Excalidraw 风格逐笔动画 + 火山引擎配音 + 烧录字幕 + 品牌水印与片尾卡 + 横竖两张封面 + 各平台发布文案）。当用户说"做一期白板视频 / 边画边讲 / 手绘讲解视频 / 用 excalidraw 做视频 / whiteboard video"，或要在本仓库里新建一期、改场景、换贴纸或真实 Logo、重出片、改字幕、出封面、写发布文案时使用。全链路本地：Playwright + ffmpeg + 火山 TTS + 本地 codex CLI 生图，不需要剪辑软件。
version: "2026-09-26"
origin: github
display_name: "手绘白板讲解视频"
display_name_en: "Whiteboard Explainer Video"
description_zh: "手绘白板风「边画边讲」讲解视频：Excalidraw 逐笔动画、火山配音、烧录字幕、品牌水印、横竖封面与发布文案。"
description_en: "Hand-drawn whiteboard explainer video: Excalidraw stroke animation, TTS, burned-in subtitles, brand watermark, covers, copy."
visibility: "public"
---
> 中文触发词：白板视频、边画边讲、手绘讲解视频、excalidraw 视频、whiteboard video。

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
7. **品牌层自动带，不用每期写。** 右上角手写水印（第一场景逐笔画入）、片尾品牌卡（5.5 秒，静音）、封面上的品牌标都由工具生成，名字、品牌色、slogan 在 `config.json` 的 `brand`；标题和点睛色优先用 `C.brand`。
8. **交付四件套：成片 + 两张封面 + `发布.md`**，主用标题和视频号简介直接贴在回复里。

## 命令

```bash
W=<仓库>/bin/wb
$W new "<标题>"                          # 建期目录：scenes.js 模板 + 发布.md 模板
$W logo "<标题>" logo-x="Commons 文件名.svg" ... [--vs=x,y]   # 真实 Logo → assets/<name>.png；--vs 拼 "A VS B" 封面图；--search="词" 先看候选
$W image "<标题>" name="英文描述" ...     # 贴纸，一次 ≤4 张（四宫格同风格）→ assets/<name>.png
$W stills "<标题>"                       # 每 beat 静帧 → <后台>/<期>/work/frames/，逐张看
$W cover "<标题>"                        # 封面-4x3.png + 封面-3x4.png → 期目录
$W build "<标题>"                        # scenes → tts → render → mix → cover → clean，出 outputs/final.mp4 / 字幕.srt / 旁白稿.md
```

分步：`scenes` / `tts` / `render [scene|99-brand]` / `mix [gain]` / `clean` / `open` / `list`。`wb build` 出片后自动 `clean`：删 `work/frames` 静帧和 `work/out` 里已不在场景表的旧分段，各场景分段与 master 保留（单场景重渲、重混配乐要用）。期参数用标题子串（`wb build 薄肌`）。`wb render <期> 03-xxx` 只重渲一段并自动重拼 master，接 `wb mix` 即新成片；TTS 有缓存，只有改过的旁白会重配。

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
- 再列本期物件（人物、器械、设备、道具），`wb image` 一次 ≤4 张，英文描述写姿势/服装/颜色（Excalidraw 五色：pale yellow/blue/green/red/grey）。
- 逐张看 `assets/<name>.png`：杂点、邻格残片、主体断块 → `--single` 单张重出；只是抠图问题 → `--rekey`。封面主角贴纸也在这一步出（公司题材封面用 Logo，不另出）。

### 4. 画场景
- 抄 `references/scene-patterns.md` 的版式坐标再微调；贴纸 `s.image(x, y, 'name', { h: 370, align: 'center' })`，人形 360~380 高；Logo 同样用 `s.image`：主视觉标志 h 260~300，卡片/柱子里 h 100~130，字标当标签用 `w`。
- 一屏 10~20 个元素；一个 beat 塞不下就删元素，别指望笔画得完（排期最多溢出到下一段前 35%，再多就整体压缩）。
- `wb stills` 后**逐张看静帧**：重叠、越界、文字超宽、太挤。改到满意。

### 5. 封面
- `scenes.js` 末尾 `cover` 函数：`s.coverLayout({ ratio, title, sub, sticker })`，`build(__dirname, scenes, { cover })`；`wb cover` 出 4:3 与 3:4。
- 标题 ≤2 行、每行 ≤8 字：第一行说对象，第二行说钩子（自动品牌色 + 马克笔高亮）；副标放数字；贴纸用主角（公司题材传 `sticker: 'logos-vs'` 或单个 `logo-x`，宽图在竖版会自动按宽度缩）。
- 看两张 png：文字没撞贴纸、高亮压在钩子行、品牌标在角上。

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
| 片尾卡 slogan / CTA / 时长 / 不要 | config `brand.slogan`、`brand.endCard.*` → `wb render <期> 99-brand && wb mix` |
| 封面文案 / 贴纸 / 画幅 | `scenes.js` 末尾 cover 函数 → `wb cover`；画幅 config `cover.ratios`，标签 `cover.seriesTag`（`tag: ''` 去掉） |
| 标题 / 发布文案 / 换平台 | 改 `发布.md`，不用重出片 |
| 在 Obsidian 里改了图 | `wb render && wb mix` 直接读 `.excalidraw.md`；增删元素会改逐笔顺序，结构性改动回 `scenes.js` |
| 换声线 / 换曲 | `.env` 的 `VOLC_TTS_VOICE` 或 config `tts.voice`（声音复刻音色配 `resourceId: volc.megatts.default`）/ `assets/bgm.mp3`（换曲先 volumedetect 量电平再定 gain） |
| 换账号品牌 | config `brand.name/accent/slogan`，其余不动 |

## 已知坑

- Logo：很多官网有验证页拦截，Logo 一律走 Commons API（`wb logo`），别去官网抓图。OpenAI 2025 字标最后的 "I" 就是一根竖条，不是被裁掉；Claude 星芒 SVG 边缘略锯齿，放大到 300 高以内看不出来。
- 火山 TTS 偶尔只返回半段：`tts-volc.mjs` 按逐字数校验自动重试；全量重配 `FORCE_TTS=1`。缓存键含文本+音色+语速，改语速会全部重配。
- 字幕文本必须用原文，TTS 词会把 `@grok` 写成 `atgrok`；字幕时间来自 TTS 逐字时间戳，改旁白必须重跑 tts。
- SVG dash 在每个子路径 `M` 处重起，rough.js 又双描边：整条 path 一起 dashoffset 会"所有边同时长、每边描两遍"。渲染器已按子路径拆节点、双描边拆 A/B 层，别回退。
- rough.js `toPaths` 不带 dasharray，虚线在 `render.html` 手动设。
- 文本宽度是估算值，居中用 `align:'center'` 才准；左对齐长文本别超 1920。
- Playwright 截图偶发 30s 超时，渲染器带 3 次重试；再挂重跑 `wb render`。
- 不要并发跑 `wb image`：codex 没按指定路径落盘时会兜底抓"最近生成的图"，并发会互相抓错。
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
>      render.js 只认后台目录那份，见 lib/paths.cjs 的 `audio` 字段——上游原脚本只写期目录，是对不上的）→
>      `bash bin/wb render "<期>"` → `bash bin/wb mix "<期>"` → `bash bin/wb cover "<期>"`。
>    - edge 脚本不带逐字时间戳 → `wb render` 会出「字幕 0 条」（无烧录字幕），音画同步用 segmentStarts 没问题；
>      **要逐字对齐的字幕必须用火山**。
>    - **EBUSY（errno -4082，pid=0）**：本机 node 用 `spawnSync` 拉 ffmpeg/ffprobe 会时发失败，而且可能
>      持续十几秒一直失败（实测 5 次 0.5/1/2/4/6s 阶梯退避 + `cmd.exe /c` 兜底全部照挂），但**同一条命令
>      在 Bash 里直调必定成功**。`wb mix` 报 EBUSY 时，直接把报错里 `spawnargs` 那串参数拼成命令在 Bash 跑：
>      无 BGM 时就是 `ffmpeg -y -loglevel error -i "<master.mp4>" -c copy -movflags +faststart "<final.mp4>"`。
>      `lib/mix-bgm.mjs` 的 `runBin()` 已带阶梯退避 + cmd.exe 兜底，仍失败就走手动，不影响成片内容。
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

