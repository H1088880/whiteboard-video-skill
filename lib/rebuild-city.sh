#!/bin/bash
# 单城精简重建（2026-09-29 修 \n 出框 / 熊猫插画 / 片尾卡配音后用）：
#   bash lib/rebuild-city.sh <期名>
# scenes → tts(06-outro，顺带补 99-brand slogan 配音) → render(02/03/04/06 + 99-brand) → mix → 看片 → qc
# 01-intro 与 05-food 未受换行 bug 影响，不重渲（沿用 out/ 旧分段，render 会自动重拼 master）
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
ep="$1"
DELIV="${DELIV:-C:/Users/ADMIN/WorkBuddy/2026-09-26-17-10-23/城市旅游片}"
city="${ep#旅游-}"
bash bin/wb scenes "$ep" || exit 1
bash bin/wb tts "$ep" 06-outro || exit 1
bash bin/wb render "$ep" 02-spot1 03-spot2 04-spot3 06-outro 99-brand || exit 1
bash bin/wb mix "$ep" || exit 1
mkdir -p "$DELIV/$city"
bash bin/wb 看片 "$ep" "$DELIV/$city" || exit 1
bash bin/wb qc "$ep"
