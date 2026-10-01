# whiteboard-video · 手绘白板讲解视频

**手绘白板风格的"边画边讲"讲解视频**，做成一个 AI Agent skill：独立自包含、无外部依赖。给 AI 一句选题，它自己查资料、写旁白、画场景、配音对字幕、逐笔渲染、混配乐，交回四样东西——一条 1080p 成片、三版封面（4:3 横版 / 3:4 竖版 / 16:9 宽横版）、一份写好五个候选标题和各平台文案的发布稿、一份资料来源。

不露脸，不开剪辑软件，画面上每一笔都是代码画的。

> 维护：未智境AI ｜ 仓库：<https://github.com/H1088880/whiteboard-video-skill>

## 先看样片

**▶️ [assets/sample-preview.mp4](assets/sample-preview.mp4)**（《为什么你每天都不想上班》前 40 秒，点进去在 GitHub 页面里直接播放）。想渲染完整成片：建一期模板跑 `wb build` 就行，见下方「使用」。

<img src="assets/sample-preview.gif" width="640" alt="样片前 12 秒：标题一个字一个字写出来，铅笔跟着笔尖走，贴纸从左往右擦出，底部是字幕，右上角是品牌水印">

三版封面，由同一个函数一次出——横版给公众号和 B 站，竖版给视频号和小红书，宽横版给官网和横屏信息流：

<img src="assets/sample-covers.jpg" width="640" alt="三版封面：4:3 横版、3:4 竖版、16:9 宽横版，两行大标题，钩子行品牌色加马克笔高亮，主角贴纸，左下品牌标">

样片和封面里的品牌水印与片尾署名，读的都是 `config.json` 的 `brand.name`（当前是「未智境AI」），一处改成你自己的。

想换样片：`python scripts/make-samples.py --episode "<期名>"` 会从任意一期重新裁出预览 mp4、预览 gif 和三版封面拼图。

## 它是怎么做的

```
选题 → 查证（数字进 README）→ 写旁白（按 | 切段）→ 出 Logo 与贴纸 → 画场景（逐段静帧检查）
    → 火山 TTS 配音（逐字时间戳对字幕）→ 浏览器里逐笔渲染 → 混配乐 → 封面 → 发布文案
```

| 环节 | 用什么 |
| --- | --- |
| 手绘线条 | [rough.js](https://roughjs.com/)（Excalidraw 底层同一个库），场景同时导出 Excalidraw 格式，装了 Obsidian Excalidraw 插件能直接打开改 |
| 逐笔动画 | Playwright 在 Chromium 里逐帧截图，4 路并行，2.5 分钟的片子渲染约 35 秒 |
| 人物、道具贴纸 | 本地 [codex](https://github.com/openai/codex) CLI 生图，一次 2×2 四宫格，自动抠白底、去杂点 |
| 公司、产品 Logo | Wikimedia Commons 官方 SVG，出处自动记录 |
| 配音与字幕 | 火山引擎语音合成（官方音色或你自己的声音复刻），原生 1.2 倍语速，返回的逐字时间戳直接对字幕 |
| 合成 | ffmpeg：拼帧、烧字幕、说话时自动压低配乐 |

几条写死在 skill 里的规矩：

- **先写旁白，再决定画什么。** 每一段都得有东西能画，画不出来的句子并进相邻段。
- **字幕区和水印区是禁区。** 底部 y≥960 留给字幕，右上角 320×130 留给水印，元素压进去就报警告。
- **讲公司用官方 Logo，讲人用照片参考的漫画像。** AI 画的拟人机器人和通用小人，观众认不出是谁。
- **数字先查再写。** 出处和口径进期目录 README，旁白、字幕、封面、文案里的数字从同一处取。
- **每期都一样的东西进配置文件。** 语速、配乐音量、字幕字号、品牌名都在 `config.json`，AI 只写每期不一样的部分。
- **封面固定出三版，少一版不算完成。** 4:3 / 3:4 / 16:9 由 `config.json` 的 `cover.ratios` 控制，`wb cover` 一次出齐，质检会逐张校验。

## 仓库内容

| 路径 | 说明 |
| --- | --- |
| `SKILL.md` | 技能入口，AI 读这个 |
| `references/` | 场景 API、版式坐标、贴纸与 Logo、发布文案 |
| `references/common/` | 公共工序：事实核查、合规、成片验收、封面验收、发布文案机制 |
| `bin/wb` | 命令行：`new` `scenes` `stills` `image` `logo` `tts` `render` `mix` `cover` `build` `clean` |
| `lib/scene-dsl.js` | 场景 DSL：一行代码一个元素，导出 Excalidraw 场景图、旁白稿、封面 |
| `lib/render.html` `lib/render.js` | 逐笔渲染器：子路径顺序描边、双描边 A/B 层、按字数排期、铅笔跟随、并行出帧 |
| `lib/tts-volc.mjs` `lib/tts/` | 火山 TTS，带缓存与半段音频自动重试 |
| `lib/captions.cjs` | 逐字时间戳切 6~20 字短句，烧录并导出 SRT |
| `lib/gen-image.mjs` | codex 生图贴纸 + 抠图 |
| `lib/fetch-logo.mjs` | Wikimedia Commons 官方 Logo，`--vs` 拼对比封面图 |
| `lib/mix-bgm.mjs` | 闪避配乐：说话时压低，停顿时抬起，尾部淡出 |
| `scripts/make-samples.py` | 从任一期生成 README 用的样片资产（三版封面拼图 + 预览 mp4 + 预览 gif） |
| `scripts/make-portable.cjs` | 把 skill 打成可移植副本，装到别的 Agent 平台（Codex / Claude Code） |
| `templates/` | 每期 `scenes.js` 与 `发布.md` 模板 |
| `config.json` | 全部参数：目录、语速、配乐、笔速、字幕、品牌层、封面 |

## 环境

| 依赖 | 说明 |
| --- | --- |
| Node.js 20.12 以上 | 用到了 `process.loadEnvFile` |
| ffmpeg | Windows `winget install Gyan.FFmpeg`，macOS `brew install ffmpeg` |
| Playwright Chromium | `npm install` 会自动装 |
| codex CLI | 只有出贴纸（`wb image`）用到，登录后走你自己的额度 |
| 火山引擎账号 | 开通语音合成，凭证填 `.env`；想用自己的声音就在控制台做一次声音复刻 |
| Python + pillow | 只给 `scripts/make-samples.py` 和封面拼图用 |

Windows（Git Bash）为主力环境，macOS 同样能跑；`wb open` 在两个系统上用的命令不同，脚本已自动判断。

## 使用

```bash
git clone https://github.com/H1088880/whiteboard-video-skill.git
cd whiteboard-video-skill
npm install
cp .env.example .env          # 填火山凭证和音色

# 建一期试跑，确认环境没问题（模板 scenes.js 无贴纸引用，开箱即可渲染）
bin/wb new "我的第一期"         # 建期目录 + 模板 scenes.js，把里面的占位文字换成你的内容
bin/wb build 我的第一期         # 约一分钟，成片在 build/<期>/outputs/final.mp4
```

然后把本仓库放进 AI 工具的 skills 目录（Claude Code 是 `~/.claude/skills/`，Codex 是 `~/.codex/skills/`，软链也行），对它说：

> 做一期白板视频：为什么定了计划总是坚持不下去

它会按 `SKILL.md` 建期目录、查资料、写旁白、出贴纸、画场景，逐段出静帧给你看，最后出片、出封面、写发布稿。中途任何一步都可以停下来改。

自己动手也行：

```bash
bin/wb new "为什么定了计划总是坚持不下去"   # 建期目录，编辑里面的 scenes.js
bin/wb stills 计划                        # 每段一张静帧，检查排版
bin/wb build 计划                         # 出片
```

## 换成你的账号

- **品牌**：`config.json` → `brand.name`（没有 logo 时的水印与片尾手写名）、`brand.accent`（品牌色）、`brand.slogan`、`brand.endCard.cta`。`brand.logo` 填**透明底 PNG** 路径就会代替手写名出现在右上角水印与片尾品牌卡。本仓库已放好自有标志「未智境AI」：矢量源 `assets/weizhijing-ai.svg`，渲染稿 `assets/weizhijing-ai.png`，登记在 `assets/logos.json`；改完 SVG 跑 `node _render_logo.mjs` 重出 PNG。
- **声音**：`.env` 的 `VOLC_TTS_VOICE`。官方 2.0 音色配 `VOLC_TTS_RESOURCE_ID=seed-tts-2.0`，声音复刻音色（`S_` 开头）配 `volc.megatts.default`。
- **配乐**：仓库不附带音乐。放一首无版权音乐到 `assets/bgm.mp3`，或改 `config.json` 的 `bgm.file`；没有配乐就出无配乐成片。
- **目录**：`config.json` → `dirs.projects` 可以指到你的 Obsidian 仓库里（或直接拿 `episodes/` 当 vault），每期文件夹就能在 Obsidian 里直接看、直接改场景图。配置步骤见「在 Obsidian 里改场景图」。
- **封面标签**：`cover.seriesTag`。
- **发布文案口吻与话题**：`references/publish.md`、`templates/发布.md`。

## 在 Obsidian 里改场景图（可选）

`wb scenes` 除了生成渲染要用的数据，还会把每个场景写成 `scenes/<场景>.excalidraw.md`。这是 [Obsidian Excalidraw 插件](https://github.com/zsviczian/obsidian-excalidraw-plugin)的原生格式（文件头是 `excalidraw-plugin: parsed`），`lib/render.js` 直接读它出片。所以装了插件以后，场景图可以在 Obsidian 里双击打开、拖两笔、存盘，不用改 `scenes.js`。

三步配好：

1. **装 Obsidian**：Windows `winget install Obsidian.Obsidian`，macOS 从 [obsidian.md](https://obsidian.md) 下载。
2. **拿 `episodes/` 当 vault**：打开 Obsidian → **Open folder as vault** → 选 `config.json` 里 `dirs.projects` 指向的目录（默认就是本仓库的 `episodes/`）。每期一个文件夹，旁白稿、字幕、封面、场景图都在里面，一眼看得到。也可以反过来：把 `dirs.projects` 指到你已有 vault 里的某个子目录。
3. **装 Excalidraw 插件**：设置 → 第三方插件 → **关闭受限模式** → 浏览 → 搜 `Excalidraw` → 安装并启用。装完 `episodes/.obsidian/plugins/obsidian-excalidraw-plugin/` 下出现 `main.js`、`manifest.json`、`styles.css` 三个文件即成功。

改完回到出片：

```bash
bash bin/wb render "<期>"    # 直接读改过的 .excalidraw.md
bash bin/wb mix "<期>"
```

三条约束：

- **挪位置、改大小、改文字**这类改动，回渲立刻生效。
- **增删元素**会改变逐笔顺序（画出来的先后跟着变）。结构性改动回 `scenes.js`。
- `wb scenes` 会用 `scenes.js` 重新覆盖 `scenes/` 下的图，你在 Obsidian 里的手动改动会被冲掉。改图前先定好这次以谁为准。

不装 Obsidian 也完全能跑：`scenes.js` 是唯一手写源，改完 `wb stills` 看静帧就行。

## 许可

- 本项目代码与文档：MIT，见根目录 [`LICENSE`](LICENSE)。第三方组件与字体的来源、许可一并在该文件列明。
- `assets/fonts/Xiaolai-Regular.ttf`：[小赖字体](https://github.com/lxgw/kose-font)，SIL Open Font License 1.1，许可证见 `assets/fonts/OFL.txt`。
- 用 `wb logo` 取到的公司 Logo 版权归各自所有者，只适合在评论和报道语境中原样使用。

---

<!-- WORKBUDDY-ADAPT -->

## Windows / WorkBuddy 安装补充

- 依赖：`winget install Gyan.FFmpeg`（ffmpeg + ffprobe）、`winget install OpenJS.NodeJS`（Node 18+）；
  Python 用 `C:/Users/ADMIN/.workbuddy/binaries/python/versions/3.13.12/python.exe`（封面脚本需 `pillow`）。
- 原文里的 Homebrew 命令在 Windows 上替换为上面的 winget 命令；SignPainter 字体 Windows 需自行安装。
- `bin/wb` 是 bash 脚本，用 Git Bash 执行：`bash "<skill 绝对路径>/bin/wb" build "<期名>"`。
- 成片与封面用 WorkBuddy 的 `present_files` 打开绝对路径交付。
