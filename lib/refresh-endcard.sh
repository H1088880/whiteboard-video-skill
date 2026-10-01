#!/bin/bash
# 片尾刷新：改了正片收尾（06-outro）或片尾品牌卡（99-brand）模板后，把「已经出过片」的期只重渲片尾相关分段，
#           再重拼 master → 混 BGM → 出片 → 刷新看片页。比整期重出快得多（每期约 30 秒）。
#   bash lib/refresh-endcard.sh 旅游-三亚 旅游-上海        # 城市期：重跑 scenes.js → tts 99-brand → render 06-outro 99-brand → mix → 看片
#   bash lib/refresh-endcard.sh --card-only "2026-09-29 江西旅游" ...   # 只改片尾卡时用：跳过 06-outro
# 注意：改了 scenes.js（比如 lib/city-template.cjs）必须让本脚本先跑 scenes.js，否则渲染读的还是旧场景文件。
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; cd "$ROOT"
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-G:/ms-playwright}"
CARD_ONLY=0; [ "${1:-}" = "--card-only" ] && { CARD_ONLY=1; shift; }
fail=0
for name in "$@"; do
  P=$(node -p "require('./lib/paths.cjs').resolveProject(process.argv[1])" "$name" 2>/dev/null || echo "")
  [ -n "$P" ] && [ -d "$P" ] || { echo "  跳过（找不到期）：$name"; fail=1; continue; }
  printf "=== %s\n" "$(basename "$P")"
  if [ "$CARD_ONLY" = 0 ] && [ -f "$P/scenes.js" ]; then
    node "$P/scenes.js" >/dev/null 2>&1 || { echo "  ✗ scenes.js 失败"; fail=1; continue; }
  fi
  FORCE_TTS=1 node lib/tts-volc.mjs "$P" 99-brand 2>&1 | grep -vE "^\s+at " | tail -1
  if [ "$CARD_ONLY" = 0 ]; then
    node lib/render.js "$P" 06-outro 99-brand 2>&1 | tail -1
  else
    node lib/render.js "$P" 99-brand 2>&1 | tail -1
  fi
  node lib/mix-bgm.mjs "$P" >/dev/null 2>&1 && echo "  ✓ 成片已重出" || { echo "  ✗ mix 失败"; fail=1; }
  node lib/watch-page.cjs "$P" >/dev/null 2>&1 && echo "  ✓ 看片页已刷新" || echo "  ✗ 看片页失败"
done
echo "（fail=$fail）"
