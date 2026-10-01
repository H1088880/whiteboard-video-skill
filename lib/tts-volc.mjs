// 旁白：火山引擎语音合成（lib/tts/tts.mjs，凭证在仓库根目录 .env，字段见 .env.example）。
// 输出 <project>/audio/<scene>.wav + <scene>.json（duration / segmentStarts，渲染器按段起点对齐画图节奏）。
// 用法：node lib/tts-volc.mjs <projectDir> [scene...]   FORCE_TTS=1 强制重配
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import paths from "./paths.cjs";
const { cfg, projectPaths } = paths;
const P = projectPaths(process.argv[2] || ".");
const only = process.argv.slice(3);

try { process.loadEnvFile(path.join(paths.ROOT, ".env")); } catch { /* 没有 .env 就只用环境变量 */ }
if (cfg.tts.resourceId) process.env.VOLC_TTS_RESOURCE_ID = cfg.tts.resourceId;
// 语速：config tts.speed 倍率 → 火山 speech_rate（[-50,100]，100=2 倍速，-50=0.5 倍速）
const SPEED = Number(cfg.tts.speed || 1);
process.env.VOLC_TTS_SPEED = String(Math.max(-50, Math.min(100, Math.round((SPEED - 1) * 100))));
process.env.FORCE_TTS = process.env.FORCE_TTS || "0";
// 记录本次是否要求强制重配：场景循环里会在成功后把 FORCE_TTS 重置回 "0"，品牌卡在后段单独判断，
// 若读 env 会误判为「不用重配」而静默跳过（导致片尾 99-brand 永远用旧普通话缓存，2026-09-29 踩坑）。
const FORCE = process.env.FORCE_TTS === "1";
const { synthesize, getDuration } = await import("./tts/tts.mjs");

const vcfg = (() => { try { return JSON.parse(fs.readFileSync(path.join(P.project, "voice.json"), "utf8")); } catch { return {}; } })();
// 按期覆盖音色与方言（voice.json：<期>/voice.json = { voice, style }）。方言走 VOLC_TTS_STYLE 的
// additions.context_texts 指令通道（2026-09-29 实测：2.0 音色遵循「请全程用四川话朗读」类指令，
// 且正文逐字时间戳不含指令文本；文本前缀方式会把指令念出来，禁止）。
if (vcfg.style) process.env.VOLC_TTS_STYLE = vcfg.style;
// 方言：仅 Vivi(zh_female_vv_uranus_bigtts) 支持 explicit_dialect=sichuan/dongbei/shaanxi（seed-tts-2.0 实测+官方文档）
if (vcfg.dialectCode) process.env.VOLC_TTS_DIALECT = vcfg.dialectCode;
// 本地 CosyVoice 引擎（2026-09-30 起）：voice.json 里 engine=cosyvoice 时整期改走本地克隆，
// prompt=vivi|xiaotian（或 prompt wav 绝对路径），instruct=instruct2 自然语言方言指令。
// 用途：① 粤语/吴语等火山不支持的方言；② 替代授权 403 的火山 Vivi。留空走火山。
if (vcfg.engine === 'cosyvoice') {
  process.env.WB_TTS_ENGINE = 'cosyvoice';
  process.env.WB_CV_VOICE = vcfg.prompt || 'vivi';
  process.env.WB_CV_INSTRUCT = vcfg.instruct || '';
  process.env.WB_CV_PROMPT_TEXT = vcfg.prompt_text || '';
  if (vcfg.speed) process.env.WB_CV_SPEED = String(vcfg.speed);   // 模型原生语速（河南话定稿 1.1），设置后跳过 ffmpeg atempo
}
const VOICE = vcfg.voice || cfg.tts.voice || process.env.VOLC_TTS_VOICE;
if (!VOICE && process.env.WB_TTS_ENGINE !== 'cosyvoice') throw new Error("没有音色：在 .env 填 VOLC_TTS_VOICE，或在 config.json tts.voice / voice.json voice 填音色 ID；走本地 CosyVoice 则在 voice.json 填 engine=cosyvoice + prompt");
const norm = (s) => [...s].filter((c) => /[\p{L}\p{N}]/u.test(c)).join("");
// 逐字时间 → 每段旁白的起始秒（段起点按字位对齐到最近的词），渲染器按这个排绘制节拍
function segStartsOf(words, segs) {
  let acc = 0; const posTime = [];
  for (const w of words) { posTime.push([acc, w.startTime]); acc += norm(w.word).length; }
  const starts = []; let p = 0;
  for (const seg of segs) { starts.push(p); p += norm(seg).length; }
  const out = starts.map((sp) => { let best = 0; for (const [cp, t] of posTime) { if (cp <= sp) best = t; else break; } return best; });
  out[0] = 0; return out;
}
const scenes = JSON.parse(fs.readFileSync(P.script));
fs.mkdirSync(P.audio, { recursive: true });

for (const sc of scenes) {
  if (only.length && !only.includes(sc.name)) continue;
  const full = sc.segments.join("");
  const wav = path.join(P.audio, `${sc.name}.wav`);
  const need = norm(full).length;
  let r, tries = 0;
  while (true) {
    try {
      r = await synthesize(full, wav, { voice: VOICE, prompt_text: vcfg.prompt_text || undefined });
      const got = r.words.reduce((n, w) => n + norm(w.word).length, 0);
      // 本地 CosyVoice 的字来自 whisper 转写（方言会变字），阈值放宽，但仍然要拦「只念了半句」——
      // 2026-09-30 曾因服务端只保存首个音频块导致尾段丢失（06-outro 64/83 字），画面跟着错位。
      const floor = process.env.WB_TTS_ENGINE === 'cosyvoice' ? 0.75 : 0.85;
      if (got >= need * floor) break;
      // 火山偶尔只返回半段音频：按逐字数校验，不够就强制重配
      console.log(`  truncated ${sc.name}: ${got}/${need} chars, retry`);
      process.env.FORCE_TTS = "1";
    } catch (e) { console.log("  retry", sc.name, e.message.slice(0, 80)); }
    if (++tries >= 4) throw new Error("TTS failed: " + sc.name);
  }
  // 2026-10-01 修复：原先这里硬编码 "0"，导致 FORCE_TTS=1 只对第一个场景（01-intro）生效，
  // 之后的场景全部读缓存 —— 改了语速/音色后整期只有 intro 变，其余段还是旧音频。
  // 正确做法：恢复成开头捕获的 FORCE（强制重配要贯穿整期）。
  process.env.FORCE_TTS = FORCE ? "1" : "0";
  // 逐字时间 → 每个旁白段的起始秒
  const segStarts = segStartsOf(r.words, sc.segments);
  fs.writeFileSync(path.join(P.audio, `${sc.name}.json`), JSON.stringify({ name: sc.name, duration: r.duration, segmentStarts: segStarts, segments: sc.segments, voice: VOICE, words: r.words.length, normChars: need,
    wordList: r.words.map((w) => ({ w: w.word, s: +w.startTime.toFixed(3), e: +w.endTime.toFixed(3) })) }, null, 1));
  console.log(`${sc.name}: ${r.duration.toFixed(1)}s @${SPEED}x  starts=${segStarts.map((t) => t.toFixed(1)).join(",")}  words=${r.words.length}/${need}`);
}

// 片尾品牌卡配音（固定模板）：slogan + CTA 两句全念（旅行类=「下一站想去哪儿？」+「点赞，关注，评论区聊聊」）→ audio/99-brand.wav。
// render.js 给 99-brand 卡当音轨；没配出来就静音兜底。不随场景过滤跳过——单场景重配时顺手补齐。
// 卡上 CTA 显示用「 · 」分隔，朗读时换成逗号（否则 TTS 会把「·」读成「点」或直接吞掉）。
const brand = (() => { try { return JSON.parse(fs.readFileSync(path.join(P.project, "brand.json"), "utf8")); } catch { return {}; } })();
const B = { ...(cfg.brand || {}), ...brand };
const ctaShown = (B.endCard && B.endCard.enabled !== false && B.endCard.cta) || "";
const cardSegs = [...(B.slogan ? [B.slogan] : []), ...(ctaShown ? [ctaShown] : [])];
if (B.name && B.endCard && B.endCard.enabled !== false && cardSegs.length) {
  const spokenSegs = cardSegs.map((t) => t.replace(/\s*[·•・]\s*/g, "，"));
  const spoken = spokenSegs.join("");
  const wav = path.join(P.audio, "99-brand.wav");
  const jsonP = path.join(P.audio, "99-brand.json");
  let prev = null; try { prev = JSON.parse(fs.readFileSync(jsonP, "utf8")); } catch { /* 首次 */ }
  // 文案变了也自动重配（改了 slogan / CTA 不必手动 FORCE_TTS）；强制重配用开头捕获的 FORCE（不被场景循环清掉）
  if (FORCE || !fs.existsSync(wav) || !prev || prev.text !== spoken) {
    try {
      // 逐段单独合成，段间补 GAP 秒静音再拼：一句话合成会让 slogan 和 CTA 黏在一起，
      // 听感像「叠音」（2026-09-29 用户反馈），分开录再留口气才干净。
      const GAP = Number(process.env.WB_BRAND_GAP || 0.45);
      const partsDir = path.join(P.audio, "brand-parts");
      fs.mkdirSync(partsDir, { recursive: true });
      const parts = [], starts = [];
      let acc = 0;
      for (let i = 0; i < spokenSegs.length; i++) {
        const f = path.join(partsDir, `seg-${i + 1}.wav`);
        const r = await synthesize(spokenSegs[i], f, { voice: VOICE, prompt_text: vcfg.prompt_text || undefined });
        parts.push(f); starts.push(acc);
        acc += r.duration + GAP;
      }
      const list = [];
      for (let i = 0; i < parts.length; i++) {
        list.push(parts[i]);
        if (i < parts.length - 1) {
          const sf = path.join(partsDir, `gap-${i + 1}.wav`);
          // Windows 下 ffmpeg 写 gap 偶发 EBUSY（文件句柄未释放）：先清残留、再带重试
          try { fs.rmSync(sf, { force: true }); } catch { /* 不存在或占用，忽略 */ }
          let gapOk = false;
          for (let g = 0; g < 5 && !gapOk; g++) {
            try {
              execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-t", String(GAP), sf], { stdio: "ignore" });
              gapOk = true;
            } catch (e) {
              if (g === 4) throw e;
              Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
            }
          }
          list.push(sf);
        }
      }
      if (list.length > 1) {
        const args = ["-y", "-loglevel", "error"];
        for (const f of list) args.push("-i", f);
        args.push("-filter_complex", `${list.map((_, i) => `[${i}:a]`).join("")}concat=n=${list.length}:v=0:a=1[out]`, "-map", "[out]", wav);
        execFileSync("ffmpeg", args, { stdio: "ignore" });
      } else {
        fs.copyFileSync(parts[0], wav);
      }
      const duration = Math.max(...starts.map((s, i) => s + getDuration(parts[i]))) ;
      fs.writeFileSync(jsonP, JSON.stringify(
        { name: "99-brand", duration, segmentStarts: starts, segments: cardSegs, text: spoken, voice: VOICE, slogan: true }, null, 1));
      console.log(`99-brand: 片尾配音 ${duration.toFixed(1)}s（${spokenSegs.length} 句，间隔 ${GAP}s）「${spoken}」`);
    } catch (e) { console.warn("99-brand 配音失败（片尾卡将静音）:", e.message.slice(0, 80)); }
  }
}
