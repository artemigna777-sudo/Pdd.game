#!/bin/sh
# Рендер ролика-истории в MP4: sh trailer/story/render.sh → trailer/story/mp4/ (нужен ffmpeg в PATH, см. README).
set -e
cd "$(dirname "$0")"
npx tsx build.ts
mkdir -p mp4
(cd out && npx -y hyperframes@0.8.119 render . --fps 30 --crf 20 --video-frame-format png -o raw.mp4 >/dev/null 2>&1)
ffmpeg -y -loglevel error -i out/raw.mp4 -c:v libx264 -preset slow -crf 21 -maxrate 9M -bufsize 18M -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 44100 -movflags +faststart mp4/kurier-pdd-istoriya.mp4
ffmpeg -y -loglevel error -i mp4/kurier-pdd-istoriya.mp4 -c:v copy -an mp4/kurier-pdd-istoriya-bez-zvuka.mp4
ls -la mp4
