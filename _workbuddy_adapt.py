#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WorkBuddy 环境适配（幂等）——上游 trustfuture/simon-skills 更新后，覆盖安装完跑一次：

    python _workbuddy_adapt.py

只做三件事：
  1. 补 WorkBuddy 识别需要的 frontmatter 元数据（version/origin/display_name/...）
  2. 把 macOS 专有写法（Finder / Homebrew）改成 Windows 可用的等价写法
  3. 在 SKILL.md 末尾追加「WorkBuddy 环境适配」说明块（用 marker 判重，重复执行只输出 ok）

原文件的原始指令一律保留，只在下方追加覆盖说明，避免破坏上游自检脚本的断言。
"""

import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
MARKER = "<!-- WORKBUDDY-ADAPT -->"
UPSTREAM_SHA = "3ad0a25127c17da48a0e869c9efbf4136c40848b"
UPSTREAM_DATE = "2026-09-26"

META = {
    "investigation-video": {
        "display_name": "调查长片视频",
        "display_name_en": "Investigation Long-form Video",
        "description_zh": "不露脸商业/消费调查长片出片：选题、事实核查、长叙事、真实素材、配音字幕、AI 封面与多平台发布文案。",
        "description_en": "Faceless business/consumer investigation long-form video: topic, fact-check, narrative, footage, TTS, covers, platform copy.",
    },
    "whiteboard-video": {
        "display_name": "手绘白板讲解视频",
        "display_name_en": "Whiteboard Explainer Video",
        "description_zh": "手绘白板风「边画边讲」讲解视频：Excalidraw 逐笔动画、火山配音、烧录字幕、品牌水印、横竖封面与发布文案。",
        "description_en": "Hand-drawn whiteboard explainer video: Excalidraw stroke animation, TTS, burned-in subtitles, brand watermark, covers, copy.",
    },
    "video-common": {
        "display_name": "视频公共工序",
        "display_name_en": "Video Common Pipeline",
        "description_zh": "视频流水线公共工序：事实核查与来源台账、封面比例验收、平台文案机制、成片验收、合规自查。",
        "description_en": "Shared video pipeline steps: fact-check, cover QA, platform copy, delivery QA, compliance.",
    },
}

TRIGGER_ZH = {
    "investigation-video": "中文触发词：调查视频、调查长片、商业调查、消费调查、10 分钟长视频、做一期调查片。",
    "whiteboard-video": "中文触发词：白板视频、边画边讲、手绘讲解视频、excalidraw 视频、whiteboard video。",
    "video-common": "中文触发词：事实核查、来源台账、封面验收、平台文案、成片验收、合规自查。",
}

ADAPT_BLOCK = """

---

{marker}

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
> 4. **贴纸/封面生图**：原文走本地 `codex` CLI（`wb image`）。本机没有 codex CLI 时，改用 WorkBuddy 内置
>    **ImageGen** 工具，提示词直接复用本包 `lib/gen-image.mjs` 导出的 `stickerPrompt(desc)` /
>    `caricaturePrompt(desc)`（可用 `node -e "import('./lib/gen-image.mjs').then(m=>console.log(m.stickerPrompt('描述')))"`
>    取到完整英文提示词），产物存到期目录 `assets/<name>.png`，后续 `wb stills` / `wb render` 流程不变。
>    `wb logo`（Wikimedia Commons 官方 SVG）不依赖 codex，可直接用。
> 5. **凭证**：火山 TTS 凭证仍放在本 skill 目录的 `.env`（字段见 `.env.example`），本包不上传、不外传任何密钥。
"""


def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


def write(p, s):
    with open(p, "w", encoding="utf-8", newline="\n") as f:
        f.write(s)


def patch_frontmatter(skill_md, name):
    txt = read(skill_md)
    m = re.match(r"^---\n(.*?)\n---\n", txt, re.S)
    if not m:
        print("  ! 未找到 frontmatter，跳过元数据补丁")
        return txt
    fm = m.group(1)

    if "origin: github" in fm:
        print("  = frontmatter 已打过补丁")
        return txt

    meta = META[name]
    lines = fm.split("\n")
    out = []
    for ln in lines:
        out.append(ln)
        if ln.startswith("description:"):
            out.append('version: "%s"' % UPSTREAM_DATE)
            out.append("origin: github")
            out.append('display_name: "%s"' % meta["display_name"])
            out.append('display_name_en: "%s"' % meta["display_name_en"])
            out.append('description_zh: "%s"' % meta["description_zh"])
            out.append('description_en: "%s"' % meta["description_en"])
            out.append('visibility: "public"')
            # 中文触发词追加到原 description 之后，避免中文提问命中不了
    new_fm = "\n".join(out)
    new_head = "---\n" + new_fm + "\n---\n"
    rest = txt[m.end() :]

    # 中文触发词：在正文开头（frontmatter 之后）插入一行引用
    if TRIGGER_ZH[name] not in txt:
        rest = "> " + TRIGGER_ZH[name] + "\n" + rest
    return new_head + rest


def patch_wb_bin():
    p = os.path.join(HERE, "bin", "wb")
    if not os.path.exists(p):
        return
    txt = read(p)
    changed = False
    if "wbOpen()" not in txt:
        anchor = 'cmd="$1"; shift || true'
        if anchor in txt:
            helper = (
                'wbOpen() { if command -v cygpath >/dev/null 2>&1; then explorer.exe "$(cygpath -w "$1")"; '
                'else open "$1"; fi; }\n'
            )
            txt = txt.replace(anchor, helper + anchor, 1)
            changed = True
    if 'open "$P"' in txt:
        txt = txt.replace('open "$P"', 'wbOpen "$P"')
        txt = txt.replace('open "$S"', 'wbOpen "$S"')
        changed = True
    if changed:
        write(p, txt)
        print("  + bin/wb: open → explorer.exe（Windows 资源管理器）")
    else:
        print("  = bin/wb 已适配")


def patch_wb_root():
    """Windows 真坑：bin/wb 用 Git Bash 的 pwd 得到 /c/... 这种 POSIX 路径，
    写进期目录 scenes.js 的 require() 后，原生 node.exe 认不出来 → MODULE_NOT_FOUND。
    改成 cygpath -m 的 C:/... 混合路径（node 认，sed 替换也不会被 \\U 之类的转义吃掉）。"""
    p = os.path.join(HERE, "bin", "wb")
    if not os.path.exists(p):
        return
    txt = read(p)
    if "WROOT=" in txt:
        print("  = bin/wb 根路径已适配")
        return
    anchor = 'ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"'
    if anchor not in txt:
        print("  ! bin/wb 未找到 ROOT 定义，跳过")
        return
    txt = txt.replace(
        anchor,
        anchor + '\nWROOT="$(cygpath -m "$ROOT" 2>/dev/null || echo "$ROOT")"  # Windows: node.exe 不认 /c/... 路径',
        1,
    )
    if "__WB_ROOT__#$ROOT#" in txt:
        txt = txt.replace("__WB_ROOT__#$ROOT#", "__WB_ROOT__#$WROOT#", 1)
        print("  + bin/wb: 期目录 scenes.js 的 __WB_ROOT__ 写成 Windows 混合路径")
    write(p, txt)


def patch_wb_pw():
    """Playwright 浏览器缓存默认落在 C:\\Users\\<u>\\AppData\\Local\\ms-playwright（~650MB）。
    本机 C 盘只剩 ~11G，改指到 G:\\ms-playwright；同时写进 bin/wb，避免环境变量没继承时找不到。"""
    p = os.path.join(HERE, "bin", "wb")
    if not os.path.exists(p):
        return
    txt = read(p)
    if "PLAYWRIGHT_BROWSERS_PATH" in txt:
        print("  = bin/wb 已指定 Playwright 浏览器目录")
        return
    anchor = 'ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"'
    if anchor not in txt:
        print("  ! bin/wb 未找到锚点，跳过 Playwright 路径")
        return
    txt = txt.replace(
        anchor,
        anchor + '\nexport PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-G:/ms-playwright}"',
        1,
    )
    write(p, txt)
    print("  + bin/wb: PLAYWRIGHT_BROWSERS_PATH 默认指到 G:/ms-playwright")


def patch_paths_cjs():
    p = os.path.join(HERE, "lib", "paths.cjs")
    if not os.path.exists(p):
        return
    txt = read(p)
    old = "p.replace(/^~/, process.env.HOME)"
    new = "p.replace(/^~/, process.env.HOME || process.env.USERPROFILE || os.homedir())"
    if old in txt:
        txt = txt.replace(old, new, 1)
        if "const os = require('os');" not in txt:
            txt = txt.replace("const fs = require('fs');", "const fs = require('fs');\nconst os = require('os');", 1)
        write(p, txt)
        print("  + lib/paths.cjs: HOME → USERPROFILE 兜底")
    else:
        print("  = lib/paths.cjs 已适配")


def patch_readme_win():
    p = os.path.join(HERE, "README.md")
    if not os.path.exists(p):
        return
    txt = read(p)
    if MARKER in txt:
        print("  = README 已适配")
        return
    block = (
        "\n---\n\n"
        + MARKER
        + "\n\n## Windows / WorkBuddy 安装补充\n\n"
        "- 依赖：`winget install Gyan.FFmpeg`（ffmpeg + ffprobe）、`winget install OpenJS.NodeJS`（Node 18+）；\n"
        "  Python 用 `C:/Users/ADMIN/.workbuddy/binaries/python/versions/3.13.12/python.exe`（封面脚本需 `pillow`）。\n"
        "- 原文里的 Homebrew 命令在 Windows 上替换为上面的 winget 命令；SignPainter 字体 Windows 需自行安装。\n"
        "- `bin/wb` 是 bash 脚本，用 Git Bash 执行：`bash \"<skill 绝对路径>/bin/wb\" build \"<期名>\"`。\n"
        "- 成片与封面用 WorkBuddy 的 `present_files` 打开绝对路径交付。\n"
    )
    write(p, txt.rstrip("\n") + "\n" + block)
    print("  + README.md: 追加 Windows 安装说明")


def write_upstream():
    p = os.path.join(HERE, "_upstream.json")
    if os.path.exists(p):
        return
    import json

    write(
        p,
        __import__("json").dumps(
            {
                "repo": "trustfuture/simon-skills",
                "branch": "master",
                "sha": UPSTREAM_SHA,
                "date": UPSTREAM_DATE,
                "note": "更新时用 compare API 对比本 sha 与上游最新 sha，覆盖拷贝后重跑 _workbuddy_adapt.py",
            },
            ensure_ascii=False,
            indent=2,
        ),
    )
    print("  + 写入 _upstream.json")


def main():
    skill_md = os.path.join(HERE, "SKILL.md")
    if not os.path.exists(skill_md):
        print("SKILL.md 不存在：", skill_md)
        return 1
    m = re.search(r"^name:\s*(\S+)", read(skill_md), re.M)
    name = m.group(1) if m else os.path.basename(HERE)
    print("[%s] 适配开始" % name)

    write(skill_md, patch_frontmatter(skill_md, name))
    patch_skill_block_apply(skill_md)
    patch_wb_bin()
    patch_wb_root()
    patch_wb_pw()
    patch_paths_cjs()
    patch_readme_win()
    write_upstream()
    print("[%s] ok" % name)
    return 0


def patch_skill_block_apply(skill_md):
    txt = read(skill_md)
    if MARKER in txt:
        print("  = 适配说明块已存在")
        return
    write(skill_md, txt.rstrip("\n") + "\n" + ADAPT_BLOCK.format(marker=MARKER) + "\n")
    print("  + SKILL.md: 追加 WorkBuddy 环境适配说明")


if __name__ == "__main__":
    sys.exit(main())
