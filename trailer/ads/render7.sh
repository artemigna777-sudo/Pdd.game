#!/bin/sh
# Ролики-сценки с двигающимися человечками (engine7.ts): sh trailer/ads/render7.sh 38-noch. Готовые файлы — trailer/ads/mp4/
# Музыка образца — trailer/ads/music/<id>/music.wav (см. README, в репозиторий не кладём); без неё ролик немой.
# Только снимки кадров: SNAP=1 AT=0.5,4,8 sh trailer/ads/render7.sh 38-noch.
set -e
cd "$(dirname "$0")"
id="$1"
npx tsx -e "
import { writeVideo7 } from './engine7.ts';
import('./videos/v$id.ts').then((mod) => console.log(writeVideo7(Object.values(mod)[0])));
"
if [ -n "$SNAP" ]; then
  (cd "out/$id" && rm -rf snapshots && npx -y hyperframes@0.8.119 snapshot . --at "${AT:-1.5,4.0,6.2,8.6,11.0,15.5,17.3,18.5,20.0,23.0,24.6,26.0,29.4,30.8,32.0,33.8,36.5}" >/dev/null 2>&1)
  ls "$PWD/out/$id"/snapshots/contact-sheet*.jpg
  exit 0
fi
mkdir -p mp4
(cd "out/$id" && npx -y hyperframes@0.8.119 render . --fps 30 --crf 20 --video-frame-format png -o raw.mp4 >/dev/null 2>&1)
# Звук берём прямо из music.wav: при сборке кадров HyperFrames делает его тише (~ на 4–5 дБ).
if [ -f "out/$id/music.wav" ]; then audio="-i out/$id/music.wav -map 0:v -map 1:a"; else audio=""; fi
ffmpeg -y -loglevel error -i "out/$id/raw.mp4" $audio -c:v libx264 -preset slow -crf 23 -maxrate 9M -bufsize 18M -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 44100 -shortest -movflags +faststart "mp4/kurier-pdd-ad-$id.mp4"
ffmpeg -y -loglevel error -i "mp4/kurier-pdd-ad-$id.mp4" -c:v copy -an -movflags +faststart "mp4/kurier-pdd-ad-$id-bez-zvuka.mp4"
echo "mp4/kurier-pdd-ad-$id.mp4"
