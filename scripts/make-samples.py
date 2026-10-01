#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从任一期生成 README 用的样片资产（三版封面拼图 + 预览 mp4 + 预览 gif）。

用法：
  python scripts/make-samples.py --episode 旅游-河北省
  python scripts/make-samples.py --episode "2026-09-29 人的一生6个阶段" --video-seconds 40 --gif-seconds 12

产出（默认写到 assets/）：
  sample-covers.jpg    三版封面一览（4:3 + 3:4 一行，16:9 一行，带比例标注）
  sample-preview.mp4   成片前 N 秒，1280 宽，faststart（README 里可直接播放）
  sample-preview.gif   成片前 M 秒，640 宽，循环
"""
import argparse
import os
import shutil
import subprocess
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAPER = (255, 253, 247)
INK = (30, 30, 30)
BORDER = (30, 30, 30, 60)


def find_ffmpeg(name="ffmpeg"):
    return shutil.which(name) or name


def cover_path(ep_dir, ratio):
    return os.path.join(ep_dir, "封面-%s.png" % ratio.replace(":", "x"))


def make_collage(ep_dir, out, height=700, gap=44, margin=56, radius=18):
    font_path = os.path.join(ROOT, "assets", "fonts", "Xiaolai-Regular.ttf")
    font = ImageFont.truetype(font_path, 30) if os.path.exists(font_path) else ImageFont.load_default()

    labels = {
        "4:3": "4:3 横版 · 公众号 / B站",
        "3:4": "3:4 竖版 · 视频号 / 小红书",
        "16:9": "16:9 宽横版 · 视频号横版 / 官网",
    }
    row1 = ["4:3", "3:4"]
    row2 = ["16:9"]

    tiles = {}
    for r in row1 + row2:
        p = cover_path(ep_dir, r)
        if not os.path.exists(p):
            sys.exit("缺封面：%s（先跑 wb cover <期>）" % p)
        im = Image.open(p).convert("RGB")
        w = round(im.width * height / im.height)
        im = im.resize((w, height), Image.LANCZOS)
        tiles[r] = im

    cap_h = 58
    row1_w = tiles["4:3"].width + gap + tiles["3:4"].width
    content_w = max(row1_w, tiles["16:9"].width)
    W = content_w + margin * 2
    H = margin + height + cap_h + gap + height + cap_h + margin

    canvas = Image.new("RGB", (W, H), PAPER)

    def paste(tile, x, y, label):
        mask = Image.new("L", tile.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, tile.width - 1, tile.height - 1], radius=radius, fill=255)
        canvas.paste(tile, (x, y), mask)
        d = ImageDraw.Draw(canvas)
        d.rounded_rectangle([x, y, x + tile.width - 1, y + tile.height - 1], radius=radius,
                            outline=BORDER, width=2)
        tw = d.textlength(label, font=font)
        d.text((x + (tile.width - tw) / 2, y + height + 16), label, font=font, fill=INK)

    y1 = margin
    x = (W - row1_w) // 2
    paste(tiles["4:3"], x, y1, labels["4:3"])
    paste(tiles["3:4"], x + tiles["4:3"].width + gap, y1, labels["3:4"])

    y2 = y1 + height + cap_h + gap
    x2 = (W - tiles["16:9"].width) // 2
    paste(tiles["16:9"], x2, y2, labels["16:9"])

    canvas.save(out, "JPEG", quality=90, optimize=True, progressive=True)
    print("✓ %s  %d×%d  %.0f KB" % (os.path.relpath(out), W, H, os.path.getsize(out) / 1024))


def make_video(ep_dir, out, seconds=40, width=1280, start=0):
    src = find_final(ep_dir)
    cmd = [find_ffmpeg(), "-y", "-v", "error", "-ss", str(start), "-t", str(seconds), "-i", src,
           "-vf", "scale=%d:-2:flags=lanczos" % width,
           "-c:v", "libx264", "-crf", "26", "-preset", "slow", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)
    print("✓ %s  %ds（从 %ds 起）  %.2f MB" % (os.path.relpath(out), seconds, start, os.path.getsize(out) / 1048576))


def make_gif(ep_dir, out, seconds=12, width=640, fps=12, start=0):
    src = find_final(ep_dir)
    vf = ("fps=%d,scale=%d:-2:flags=lanczos,split[a][b];"
          "[a]palettegen=max_colors=160[p];[b][p]paletteuse=dither=bayer:bayer_scale=3" % (fps, width))
    cmd = [find_ffmpeg(), "-y", "-v", "error", "-ss", str(start), "-t", str(seconds), "-i", src,
           "-vf", vf, "-loop", "0", out]
    subprocess.run(cmd, check=True)
    print("✓ %s  %ds（从 %ds 起）  %.0f KB" % (os.path.relpath(out), seconds, start, os.path.getsize(out) / 1024))


def find_final(ep_dir):
    """成片在 <后台>/<期>/outputs/final.mp4，其次期目录下的 *-final.mp4。"""
    name = os.path.basename(ep_dir.rstrip("\\/"))
    cands = [os.path.join(ROOT, "build", name, "outputs", "final.mp4")]
    if os.path.isdir(ep_dir):
        cands += [os.path.join(ep_dir, f) for f in os.listdir(ep_dir) if f.endswith("-final.mp4")]
    for c in cands:
        if os.path.exists(c):
            return c
    sys.exit("找不到成片：先跑 wb build <期>，或把 <题名>-final.mp4 放进期目录")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--episode", required=True, help="期名或期目录路径")
    ap.add_argument("--out-dir", default=os.path.join(ROOT, "assets"))
    ap.add_argument("--video-seconds", type=int, default=40)
    ap.add_argument("--gif-seconds", type=int, default=12)
    ap.add_argument("--video-start", type=float, default=0, help="预览 mp4 起始秒（片头留白多时可跳过）")
    ap.add_argument("--gif-start", type=float, default=0, help="预览 gif 起始秒")
    ap.add_argument("--only", choices=["covers", "video", "gif"], help="只生成其中一项")
    a = ap.parse_args()

    ep = a.episode if os.path.isdir(a.episode) else os.path.join(ROOT, "episodes", a.episode)
    if not os.path.isdir(ep):
        sys.exit("期目录不存在：%s" % ep)
    os.makedirs(a.out_dir, exist_ok=True)

    if a.only in (None, "covers"):
        make_collage(ep, os.path.join(a.out_dir, "sample-covers.jpg"))
    if a.only in (None, "video"):
        make_video(ep, os.path.join(a.out_dir, "sample-preview.mp4"), a.video_seconds, start=a.video_start)
    if a.only in (None, "gif"):
        make_gif(ep, os.path.join(a.out_dir, "sample-preview.gif"), a.gif_seconds, start=a.gif_start)


if __name__ == "__main__":
    main()
