#!/bin/sh
# Ролики «как кино» (engine5.ts): sh trailer/ads/render5.sh 33-sdam. Готовые файлы — trailer/ads/mp4/.
# Голоса — trailer/ads/music/<voiceDir>/*.mp3 (см. README); без них ролик немой.
set -e
cd "$(dirname "$0")"
id="$1"
npx tsx -e "
import { writeVideo5 } from './engine5.ts';
import('./videos/v$id.ts').then((mod) => writeVideo5(Object.values(mod)[0]));
"
[ -n "$BUILD_ONLY" ] && exit 0
mkdir -p mp4
(cd "out/$id" && npx -y hyperframes@0.8.119 render . --fps 30 --crf 20 --video-frame-format png -o raw.mp4 >/dev/null 2>&1)
ffmpeg -y -loglevel error -i "out/$id/raw.mp4" -c:v libx264 -preset slow -crf 23 -maxrate 9M -bufsize 18M -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 44100 -movflags +faststart "mp4/kurier-pdd-ad-$id.mp4"
echo "mp4/kurier-pdd-ad-$id.mp4"
