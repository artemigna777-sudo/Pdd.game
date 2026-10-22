#!/bin/sh
# 3D-кадр роликов из Blender: sh trailer/ads/blender/render3d.sh f1 40-bearman [имя клипа]
# (имя клипа — если одна сцена даёт два клипа, например LLTV_MODE=hover sh render3d.sh lltv 41-armstrong hover)
# → кадры в рабочей папке, затем trailer/ads/clips/<ролик>/<сцена>.mp4 (1080×1920, 30 к/с; в репозиторий не кладётся).
# Нужен Blender 4.2 (переменная BLENDER — путь к нему) и xvfb-run (EEVEE без видеокарты рисует через виртуальный экран).
set -e
cd "$(dirname "$0")"
scene="$1"
id="$2"
name="${3:-$scene}"
: "${BLENDER:?укажи путь к Blender в переменной BLENDER}"
work="${WORK:-/tmp/blender-$scene}"
rm -rf "$work" && mkdir -p "$work"
xvfb-run -a -s "-screen 0 1280x1024x24" "$BLENDER" --background --python "$scene.py" -- "$work" > "$work.log" 2>&1
grep -q '^DONE' "$work.log" || { tail -20 "$work.log"; exit 1; }
mkdir -p "../clips/$id"
ffmpeg -y -loglevel error -framerate 30 -i "$work/%04d.png" -vf "scale=1080:1920:flags=lanczos" -c:v libx264 -crf 14 -preset slow -pix_fmt yuv420p "../clips/$id/$name.mp4"
echo "clips/$id/$name.mp4"
