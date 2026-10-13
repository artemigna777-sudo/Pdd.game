#!/bin/sh
# Ролики по картинкам (engine4.ts): sh trailer/ads/render4.sh 31-plavanie. Готовые файлы — trailer/ads/mp4/.
# Картинки — trailer/ads/pics/<id>/1.png, 2.png…; музыка — trailer/ads/music/plan.wav (см. README).
set -e
cd "$(dirname "$0")"
id="$1"
npx tsx -e "
import { writeVideo4 } from './engine4.ts';
import('./videos/v$id.ts').then((mod) => writeVideo4(Object.values(mod)[0]));
"
mkdir -p mp4
(cd "out/$id" && npx -y hyperframes@0.8.119 render . --fps 30 --crf 20 --video-frame-format png -o raw.mp4 >/dev/null 2>&1)
ffmpeg -y -loglevel error -i "out/$id/raw.mp4" -c:v libx264 -preset slow -crf 23 -maxrate 9M -bufsize 18M -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 44100 -movflags +faststart "mp4/kurier-pdd-ad-$id.mp4"
ffmpeg -y -loglevel error -i "mp4/kurier-pdd-ad-$id.mp4" -c:v copy -an "mp4/kurier-pdd-ad-$id-bez-zvuka.mp4"
echo "mp4/kurier-pdd-ad-$id.mp4"
