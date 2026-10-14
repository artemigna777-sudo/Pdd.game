#!/bin/sh
# Ролики «как кино» (engine5.ts): sh trailer/ads/render5.sh 33-sdam. Готовые файлы — trailer/ads/mp4/.
# Голоса и музыка образца — trailer/ads/music/<voiceDir>/ (см. README); без них ролик немой.
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
# Копия без музыки образца (только голоса и звуки) — если музыку нужно выбрать в TikTok.
if [ -f "out/$id/voice.wav" ]; then
  ffmpeg -y -loglevel error -i "mp4/kurier-pdd-ad-$id.mp4" -i "out/$id/voice.wav" -map 0:v -map 1:a -c:v copy \
    -c:a aac -b:a 192k -ar 44100 -shortest -movflags +faststart "mp4/kurier-pdd-ad-$id-bez-muzyki.mp4"
fi
echo "mp4/kurier-pdd-ad-$id.mp4"
