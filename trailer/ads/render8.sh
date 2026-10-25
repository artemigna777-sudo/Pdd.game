#!/bin/sh
# Ролики-истории «страшилки-правила» (engine8.ts): sh trailer/ads/render8.sh 42-noch-doroga. Готовые файлы — trailer/ads/mp4/.
# Голос и музыка — trailer/ads/music/<id>/vo.wav и music.wav (см. README, в репозиторий не кладём).
# Только снимки кадров: SNAP=1 AT=0.5,4,8 sh trailer/ads/render8.sh 42-noch-doroga.
# HQ=1 — меньше сжатие (для роликов с 3D-кадрами из Blender: на тёмном фоне иначе видно «зерно» и ступеньки).
set -e
cd "$(dirname "$0")"
id="$1"
npx tsx -e "
import { writeVideo8 } from './engine8.ts';
import('./videos/v$id.ts').then((mod) => console.log(writeVideo8(Object.values(mod)[0])));
"
if [ -n "$SNAP" ]; then
  (cd "out/$id" && rm -rf snapshots && npx -y hyperframes@0.8.119 snapshot . --at "${AT:-1.5,4.5,8.5,10.5,12.0,14,17,19,20.5,22,24.5,26.5,28.8,30.3,32,35,38.5,40.5}" >/dev/null 2>&1)
  ls "$PWD/out/$id"/snapshots/contact-sheet*.jpg
  exit 0
fi
mkdir -p mp4
if [ -n "$HQ" ]; then raw=14 crf=17 rate=20M; else raw=20 crf=23 rate=9M; fi
(cd "out/$id" && npx -y hyperframes@0.8.119 render . --fps 30 --crf $raw --video-frame-format png -o raw.mp4 >/dev/null 2>&1)
ffmpeg -y -loglevel error -i "out/$id/raw.mp4" -c:v libx264 -preset slow -crf $crf -maxrate $rate -bufsize $rate -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 44100 -movflags +faststart "mp4/kurier-pdd-ad-$id.mp4"
ffmpeg -y -loglevel error -i "mp4/kurier-pdd-ad-$id.mp4" -c:v copy -an -movflags +faststart "mp4/kurier-pdd-ad-$id-bez-zvuka.mp4"
echo "mp4/kurier-pdd-ad-$id.mp4"
