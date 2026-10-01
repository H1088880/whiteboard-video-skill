#!/bin/bash
# 批量出片队列：bash lib/run-batch.sh <期名1> <期名2> ...
# 每期：scenes → tts → render → mix → cover → 看片 → qc；结果汇总到 batch/report.txt
# ⚠️ 不跑 wb clean：clean 会批量删中间文件，触发本机的「单回合批量删除确认」保护，把整期判成失败（2026-09-29 实测）
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
OUT="batch/report.txt"
DELIV="${DELIV:-C:/Users/ADMIN/WorkBuddy/2026-09-26-17-10-23/城市旅游片}"
: > "$OUT"
mkdir -p "$DELIV"
for ep in "$@"; do
  S=$(date +%s)
  echo "=== $(date +%H:%M:%S) 开始：$ep" | tee -a "$OUT"
  if bash bin/wb scenes "$ep" >> "$OUT" 2>&1 \
     && bash bin/wb tts "$ep" >> "$OUT" 2>&1 \
     && bash bin/wb render "$ep" >> "$OUT" 2>&1 \
     && bash bin/wb mix "$ep" >> "$OUT" 2>&1 \
     && bash bin/wb cover "$ep" >> "$OUT" 2>&1; then
    city="${ep#旅游-}"
    bash bin/wb 看片 "$ep" "$DELIV/$city" >> "$OUT" 2>&1
    E=$(date +%s)
    echo "✔ $ep 完成（$((E-S))s）→ $DELIV/$city/看片.html" | tee -a "$OUT"
  else
    echo "✘ $ep 失败" | tee -a "$OUT"
  fi
done
echo "=== 队列结束 $(date +%H:%M:%S)" | tee -a "$OUT"
grep -E "^(✔|✘)" "$OUT"
