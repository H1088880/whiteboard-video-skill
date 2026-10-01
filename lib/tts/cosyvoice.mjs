// 本地 CosyVoice 配音引擎（白板视频专用）
// 2026-09-30 起因：① 火山 seed-tts-2.0 不支持粤语/吴语等方言；② 火山 Vivi(zh_female_vv_uranus_bigtts)
//   授权 403，用户定稿改走本地克隆（Vivi / 小天的声音克隆成本地资产）。
// 走 G:/cosyvoice/server.py 起的常驻服务（模型常驻，避免每条旁白等一次加载）。
// ⚠️ 必须显式开：WB_TTS_ENGINE=cosyvoice 才生效；不开与旧版完全一致。
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CV_URL = process.env.CV_URL || "http://127.0.0.1:8765";

export async function health() {
  try {
    const r = await fetch(`${CV_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

// 先把 24kHz 单声道的原始产物落在旁路临时文件，再用 ffmpeg 转成与火山一致的
// 44100/立体声（避免混音/拼接环节采样率不对齐），最后清掉临时文件。
function normalize(src, outWav) {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-ar", "44100", "-ac", "2", outWav], { stdio: "ignore" });
}

// text -> outWav(44100/stereo)，返回 { path, duration, words }；words 与火山同形：
// [{ word, startTime, endTime, confidence }]（秒）——没有就 []，字幕退化为按字数估。
// ⚠️ 语速两条路（2026-09-30）：① 默认走 ffmpeg atempo 追平 config tts.speed（默认 1.2）；
//    ② voice.json 给 speed（如河南话 1.1）→ 模型原生语速，此时跳过 atempo，两者绝不叠加。
export async function synthLocal(text, outWav, { voice = process.env.WB_CV_VOICE || "xiaotian", instruct = process.env.WB_CV_INSTRUCT || "", prompt_text = process.env.WB_CV_PROMPT_TEXT || "", speed = process.env.WB_CV_SPEED || "", words = process.env.WB_CV_WORDS !== "0" } = {}) {
  const h = await health();
  if (!h?.model) {
    throw new Error(`本地 CosyVoice 服务未就绪（${CV_URL}）。先跑：E:/Miniconda/envs/cosyvoice/python.exe G:/cosyvoice/server.py`);
  }
  const raw = `${outWav}.24k.wav`;
  const body = { text, out: path.resolve(raw), voice, words };
  if (instruct) body.instruct = instruct;
  if (prompt_text) body.prompt_text = prompt_text;   // 自定义母语参考音频（河南话等）必须带逐字稿
  const nativeSpeed = speed ? Number(speed) : 0;     // >0 = 模型原生语速
  if (nativeSpeed > 0) body.speed = nativeSpeed;
  const res = await fetch(`${CV_URL}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.ok) throw new Error(`本地 CosyVoice 合成失败: ${j.error || res.status}`);
  // 原生语速已含在产物里 → 不再做 atempo；否则按 VOLC_TTS_SPEED（speech_rate [-50,100]）追平
  const rate = Number(process.env.VOLC_TTS_SPEED || 0);
  const tempo = nativeSpeed > 0 ? 1 : Math.min(2, Math.max(0.5, 1 + rate / 100));
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", raw,
    ...(tempo === 1 ? [] : ["-filter:a", `atempo=${tempo}`]),
    "-ar", "44100", "-ac", "2", outWav], { stdio: "ignore" });
  try { fs.rmSync(raw, { force: true }); } catch { /* 忽略占用 */ }
  const dur = j.duration / tempo;
  const scaled = (j.words || []).map(w => ({
    word: w.word, startTime: +(w.startTime / tempo).toFixed(3),
    endTime: +(w.endTime / tempo).toFixed(3), confidence: w.confidence,
  }));
  return { path: outWav, duration: Number(dur.toFixed(3)), words: scaled, chunks: j.chunks || 1, tempo };
}
