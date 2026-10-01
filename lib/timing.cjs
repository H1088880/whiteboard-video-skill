// 时序体检：dump 一个场景的逐段「旁白窗口 vs 绘制区间 vs 字幕 cue」，用来核对画面和字的先后。
// 用法：node lib/timing.cjs <期目录> [场景名，不给=全部]
// 看「画完于 x%」：>100% = 画面比旁白慢（观感上字幕抢跑）；75% 左右 = 画面略微领先字幕，正常。
const fs = require('fs');
const path = require('path');
const url = require('url');
const { chromium } = require('playwright');
const SKILL = path.join(__dirname, '..');
const { cfg, projectPaths } = require(path.join(SKILL, 'lib', 'paths.cjs'));
const { cuesForScene } = require(path.join(SKILL, 'lib', 'captions.cjs'));

const P = projectPaths(process.argv[2] || '.');
const only = process.argv[3];
const script = JSON.parse(fs.readFileSync(P.script));
const LEAD = cfg.render.leadSeconds, HOLD = cfg.render.holdSeconds;

function loadDoc(scene) {
  const md = fs.readFileSync(path.join(P.scenes, `${scene}.excalidraw.md`), 'utf8');
  return JSON.parse(md.match(/```json\s*([\s\S]*?)```/)[1]);
}

(async () => {
  const browser = await chromium.launch();
  const pg = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto(url.pathToFileURL(path.join(SKILL, 'lib', 'render.html')).href);
  await pg.evaluate((o) => { window.setCanvas(1920, 1080); window.setPen(o); }, cfg.render.pen);
  for (const sc of script) {
    if (only && sc.name !== only) continue;
    const info = JSON.parse(fs.readFileSync(path.join(P.audio, `${sc.name}.json`), 'utf8'));
    const doc = loadDoc(sc.name);
    const beats = info.segmentStarts.map((t, i) => [t + LEAD, (i + 1 < info.segmentStarts.length ? info.segmentStarts[i + 1] : info.duration) + LEAD]);
    const sceneEnd = info.duration + LEAD + HOLD;
    await pg.evaluate(([els, bo, bt, se, cu]) => window.loadScene(els, bo, bt, {}, se, cu), [doc.elements, sc.beatOf, beats, sceneEnd, cuesForScene(info)]);
    const out = await pg.evaluate(() => items.map((x) => ({ start: x.start, end: x.end })));
    // items 按 start 排序 = 元素原顺序（schedule 内 start 单调递增），按下标回映 beatOf
    const byBeat = {};
    out.forEach((it, idx) => {
      const bi = sc.beatOf[idx];
      if (bi == null) return;
      byBeat[bi] = byBeat[bi] || { end: 0, start: 99 };
      byBeat[bi].start = Math.min(byBeat[bi].start, it.start);
      byBeat[bi].end = Math.max(byBeat[bi].end, it.end);
    });
    const cues = cuesForScene(info);
    console.log(`## ${sc.name}  (全长 ${sceneEnd.toFixed(2)}s)`);
    Object.keys(byBeat).sort().forEach((k) => {
      const w = beats[k], r = byBeat[k];
      // cue 归属与本 beat 一致：按 cue 起点落进窗口（渲染器 schedule 里也是这么分的）
      const inWin = cues.filter((c) => c.start >= w[0] - 0.05 && c.start < w[1] + 0.05);
      const pct = ((r.end - w[0]) / (w[1] - w[0])) * 100;
      const tail = inWin.length ? `，末条字幕结束 ${inWin[inWin.length - 1].end.toFixed(2)}` : '';
      console.log(`  beat${k} 旁白 ${w[0].toFixed(2)}-${w[1].toFixed(2)} | 绘制 ${r.start.toFixed(2)}→${r.end.toFixed(2)} = 画完于 ${pct.toFixed(0)}%${tail}`);
      // 逐条字幕：schedule 把该段元素按顺序均分成 N 组对应 N 条 cue，
      // 第 i 条 cue 应画完的是前 K 笔（K = 前(i+1)组的笔数），看它们是否在这句内完成
      if (inWin.length >= 2) {
        const list = out.map((it, idx) => ({ ...it, bi: sc.beatOf[idx] })).filter((x) => x.bi === Number(k));
        for (let i = 0; i < inWin.length; i++) {
          const c = inWin[i];
          const K = Math.max(1, Math.round((i + 1) * list.length / inWin.length));
          const doneBy = Math.max(...list.slice(0, K).map((x) => x.end));
          const ok = doneBy <= c.end + 0.05;   // 早于句末 0.05s 内算踩线通过（视觉上无感）
          const late = ok ? 0 : doneBy - c.end;
          console.log(`       字幕 ${c.start.toFixed(2)}-${c.end.toFixed(2)} 「${c.text}」 前${K}笔应画完于 ${doneBy.toFixed(2)} · ${ok ? '✓ 句内画完' : `⚠ 超 ${late.toFixed(2)}s`}`);
        }
      }
    });
  }
  await browser.close();
})();
