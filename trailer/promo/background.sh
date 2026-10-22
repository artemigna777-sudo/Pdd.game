#!/usr/bin/env bash
# Фоновое видео карточки RuStore: город сверху (запись city-wide, 1920×1080), 30 с, без звука.
# Петля без шва: последняя секунда плавно переходит в начало.
set -euo pipefail
cd "$(dirname "$0")"
ffmpeg -y -loglevel error -i video/clips/city-wide.mp4 -filter_complex \
  "[0]trim=1:31,setpts=PTS-STARTPTS[a];[0]trim=0:1,setpts=PTS-STARTPTS[b];[a][b]xfade=transition=fade:duration=1:offset=29,eq=saturation=1.08:contrast=1.03,vignette=PI/6,format=yuv420p[v]" \
  -map "[v]" -an -c:v libx264 -preset slow -crf 14 -r 30 -movflags +faststart kurier-pdd-background.mp4
echo "trailer/promo/kurier-pdd-background.mp4"
