// 混 BGM（闪避配方）：BGM 裁剪循环，说话时 ×speak、间隙 ×gap，缓坡过渡，尾部淡出。
// 输入 work/out/master.mp4 → 输出 outputs/final.mp4（后台目录）。没有配乐文件时直接出无配乐成片
// 用法：node lib/mix-bgm.mjs <projectDir> [gain]      BGM=/path/x.mp3 可临时换曲
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import paths from "./paths.cjs";
const { projectPaths } = paths;
const cfg = paths.cfg.bgm;
const P = projectPaths(process.argv[2] || ".");
const IN = path.join(P.out, "master.mp4");
const OUT = P.final; // 成片落在后台 outputs/，旁白稿里放文件链接
fs.mkdirSync(path.dirname(OUT), { recursive: true });
// 本机 node 直接 spawn ffmpeg.exe / ffprobe.exe 会持续 EBUSY(-4082)（同一条命令在 Bash 里直调完全正常，
// 仅重试无效：实测 6 次全失败）。兜底：退到 cmd.exe /c 间接启动，node 不再直接 spawn 这两个二进制。
// EBUSY 在本机是「快速时发时好」的（实测同一条命令隔几秒就通，且同步/异步 spawn 都可能撞上），
// 所以关键是重试之间要真的等待，而不是空转。用同步阻塞 sleep（spawnSync 环境下不能用 await）。
function sleepSync(ms) {
  try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch { /* 不支持就空转 */ }
}
function runBin(bin, args) {
  let lastErr;
  const delays = [500, 1000, 2000, 4000, 6000];
  for (let i = 0; i < delays.length; i++) {
    try { return execFileSync(bin, args); }
    catch (e) {
      lastErr = e;
      if (!(e.code === "EBUSY" || e.errno === -4082)) throw e;
      sleepSync(delays[i]);
    }
  }
  const shell = process.env.ComSpec || "cmd.exe";
  try { return execFileSync(shell, ["/c", bin, ...args]); }
  catch { /* 落到下面抛原始 EBUSY，信息更准 */ }
  throw lastErr;
}
const runFF = (args) => runBin("ffmpeg", args);

const BGM = paths.expand(process.env.BGM || cfg.file || "assets/bgm.mp3");
if (!fs.existsSync(BGM)) {
  runFF(["-y", "-loglevel", "error", "-i", IN, "-c", "copy", "-movflags", "+faststart", OUT]);
  if (!fs.existsSync(OUT)) throw new Error(`mix 失败：ffmpeg 未产出 ${OUT}`);
  console.log(`没找到配乐 ${BGM}，已出无配乐成片：${OUT}（放一首无版权音乐到 assets/bgm.mp3 或改 config.json bgm.file 再跑 wb mix）`);
  process.exit(0);
}
const bgmLen = Number(runBin("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", BGM]).toString().trim());
const [TRIM0, TRIM1] = cfg.trim && cfg.trim.length === 2 ? [cfg.trim[0], Math.min(cfg.trim[1], bgmLen)] : [0, bgmLen]; // 不配 trim 就用整首循环
const GAIN = Number(process.argv[3] || cfg.gain);
const { speak: SPEAK, gap: GAP, rampSeconds: RAMP, tailFadeSeconds: TAIL } = cfg;
const SR = 48000;

// 1. 旁白轨 → 单声道 f32
const narr = path.join(P.audio, "_narration.f32");
runFF(["-y", "-loglevel", "error", "-i", IN, "-vn", "-ac", "1", "-ar", String(SR), "-f", "f32le", narr]);
const buf = fs.readFileSync(narr);
const pcm = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
const n = pcm.length, dur = n / SR;

// 2. 10ms 窗 RMS → 说话掩码（-38dBFS 以上算说话，两侧各扩 120ms 补气口）
const win = SR / 100, frames = Math.ceil(n / win);
const speaking = new Uint8Array(frames);
for (let f = 0; f < frames; f++) {
  let s = 0, c = 0;
  for (let i = f * win; i < Math.min(n, (f + 1) * win); i++) { s += pcm[i] * pcm[i]; c++; }
  speaking[f] = c && 10 * Math.log10(s / c + 1e-12) > -38 ? 1 : 0;
}
const dil = new Uint8Array(frames), pad = 12;
for (let f = 0; f < frames; f++) if (speaking[f]) for (let k = Math.max(0, f - pad); k <= Math.min(frames - 1, f + pad); k++) dil[k] = 1;

// 3. 目标电平 → 缓坡（移动平均）→ 头尾淡入淡出 → 立体声 f32 包络
const target = new Float32Array(frames);
for (let f = 0; f < frames; f++) target[f] = (dil[f] ? SPEAK : GAP) * GAIN;
const rampF = Math.round(RAMP * 100), env = new Float32Array(frames);
for (let f = 0; f < frames; f++) {
  let s = 0, c = 0;
  for (let k = Math.max(0, f - rampF); k <= Math.min(frames - 1, f + rampF); k++) { s += target[k]; c++; }
  env[f] = s / c;
}
const out = new Float32Array(n * 2);
for (let i = 0; i < n; i++) {
  const t = i / SR;
  let v = env[Math.min(frames - 1, Math.floor(i / win))];
  if (t > dur - TAIL) v *= Math.max(0, (dur - t) / TAIL);
  if (t < 1.5) v *= t / 1.5;
  out[i * 2] = v; out[i * 2 + 1] = v;
}
const envPath = path.join(P.audio, "_bgm-env.f32");
fs.writeFileSync(envPath, Buffer.from(out.buffer));
const spk = dil.reduce((a, b) => a + b, 0) / frames;
console.log(`旁白 ${dur.toFixed(1)}s，说话占比 ${(spk * 100).toFixed(0)}%，BGM ${path.basename(BGM)} 电平：说话 ${(SPEAK * GAIN).toFixed(3)} / 间隙 ${(GAP * GAIN).toFixed(3)}`);

// 4. BGM 裁剪循环 × 包络，再与旁白叠加
const loopLen = TRIM1 - TRIM0;
runFF(["-y", "-loglevel", "error",
  "-i", IN,
  "-i", BGM,
  "-f", "f32le", "-ar", String(SR), "-ac", "2", "-i", envPath,
  "-filter_complex",
  `[1:a]aformat=sample_fmts=fltp:sample_rates=${SR}:channel_layouts=stereo,atrim=${TRIM0}:${TRIM1},asetpts=N/SR/TB,aloop=loop=-1:size=${loopLen * SR},atrim=0:${dur.toFixed(3)},asetpts=N/SR/TB[bgm];` +
  `[bgm][2:a]amultiply[duck];` +
  `[0:a]aformat=sample_fmts=fltp:sample_rates=${SR}:channel_layouts=stereo[v];` +
  `[v][duck]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]`,
  "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", OUT]);
fs.rmSync(narr, { force: true }); fs.rmSync(envPath, { force: true });
console.log("final:", OUT);
