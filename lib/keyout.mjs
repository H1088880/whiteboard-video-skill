// 贴纸后处理：node lib/keyout.mjs [--flat] <in.png> <out.png> [more pairs...]
// 共同第一步：右下角「AI生成/WORKBUDDY」水印用角部取样色填掉（取样右上角平均色）。
// 默认接着做白底抠图（四边泛洪 + 羽化 + 去杂点 + 裁边）；--flat 只去水印不抠
// （用于整幅"画在色纸上的"插画：保留原底色，放进宝丽来相框里展示）。
import fs from "node:fs";
import { keyoutAndSplit } from "./gen-image.mjs";
import { chromium } from "playwright";

async function unwatermark(src, dst) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const dataUrl = "data:image/png;base64," + fs.readFileSync(src).toString("base64");
  const out = await page.evaluate(async (dataUrl) => {
    const img = new Image(); img.src = dataUrl; await img.decode();
    const W = img.naturalWidth, H = img.naturalHeight;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0);
    // 取样：给定矩形里非透明像素的平均色；全透明则回退白色
    const sample = (x0, y0, x1, y1) => {
      const s = ctx.getImageData(Math.round(x0 * W), Math.round(y0 * H), Math.max(2, Math.round((x1 - x0) * W)), Math.max(2, Math.round((y1 - y0) * H))).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < s.length; i += 4) { if (s[i + 3] < 20) continue; r += s[i]; g += s[i + 1]; b += s[i + 2]; n++; }
      return n ? [Math.round(r / n), Math.round(g / n), Math.round(b / n)] : [255, 255, 255];
    };
    // 修复模式：补丁区已有黑块（旧版取到透明像素）→ 用补丁正上方的颜色盖回去
    const probe = ctx.getImageData(Math.round(0.98 * W) - 2, Math.round(0.955 * H), 2, 2).data;
    const isBroken = probe[3] >= 20 && probe[0] + probe[1] + probe[2] < 90;
    const [r, g, b] = isBroken ? sample(0.72, 0.845, 0.98, 0.9) : sample(0.9, 0.004, 0.96, 0.02);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(Math.round(W * 0.7), Math.round(H * 0.92), Math.round(W * 0.3), Math.round(H * 0.08));
    return c.toDataURL("image/png");
  }, dataUrl);
  await browser.close();
  fs.writeFileSync(dst, Buffer.from(out.split(",")[1], "base64"));
}

const a = process.argv.slice(2);
const flat = a.includes("--flat");
const pairs = [];
for (let i = 0; i < a.length; i++) {
  if (a[i].startsWith("--")) continue;
  if (a[i + 1] && !a[i + 1].startsWith("--")) { pairs.push([a[i], a[i + 1]]); i++; }
}
if (!pairs.length) { console.error("用法: node lib/keyout.mjs [--flat] <in> <out> [...]"); process.exit(1); }
for (const [i] of pairs) if (!fs.existsSync(i)) { console.error("缺少", i); process.exit(1); }

const tmpDir = "C:/Users/ADMIN/WorkBuddy/2026-09-26-17-10-23/_stk/_wm";
fs.mkdirSync(tmpDir, { recursive: true });
let k = 0;
for (const [i, o] of pairs) {
  const tmp = `${tmpDir}/wm${++k}.png`;
  await unwatermark(i, tmp);
  if (flat) {
    fs.copyFileSync(tmp, o);
    console.log(`OK(flat) ${o} ${Math.round(fs.statSync(o).size / 1024)}KB`);
  } else {
    await keyoutAndSplit(tmp, [o], { grid: false, pad: 12 });
    console.log(`OK ${o} ${Math.round(fs.statSync(o).size / 1024)}KB`);
  }
}
