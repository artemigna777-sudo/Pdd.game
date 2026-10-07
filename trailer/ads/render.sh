#!/bin/sh
# Рендер роликов в MP4: sh trailer/ads/render.sh [номера…]. Готовые файлы — trailer/ads/mp4/<id>.mp4.
set -e
# Нужен ffmpeg в PATH (см. README).
cd "$(dirname "$0")"
npx tsx build.ts "$@"
mkdir -p mp4
for d in out/*/; do
  id=$(basename "$d")
  if [ $# -gt 0 ]; then ok=0; for n in "$@"; do case "$id" in "$n"*) ok=1;; esac; done; [ $ok = 1 ] || continue; fi
  (cd "$d" && npx -y hyperframes@0.8.119 render . --fps 30 --crf 20 --video-frame-format png -o raw.mp4 >/dev/null 2>&1)
  # Для TikTok: битрейт не выше 9 Мбит/с (штриховка гравюр иначе даёт файлы под 90 МБ, а TikTok на Android
  # принимает до 72 МБ), звук 44,1 кГц, faststart (файл начинает играть сразу).
  ffmpeg -y -loglevel error -i "$d/raw.mp4" -c:v libx264 -preset slow -crf 23 -maxrate 9M -bufsize 18M -pix_fmt yuv420p \
    -c:a aac -b:a 192k -ar 44100 -movflags +faststart "mp4/kurier-pdd-ad-$id.mp4"
  echo "mp4/kurier-pdd-ad-$id.mp4"
done
