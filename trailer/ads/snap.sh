#!/bin/sh
# Снимки ключевых кадров ролика: sh trailer/ads/snap.sh 02
set -e
# Нужен ffmpeg в PATH (см. README).
cd "$(dirname "$0")"
for n in "$@"; do
  npx tsx build.ts "$n" >/dev/null
  d=$(ls -d out/"$n"-*)
  (cd "$d" && rm -rf snapshots && npx -y hyperframes@0.8.119 snapshot . --at ${AT:-0.8,2.3,5.0,8.4,12.4,14.1,15.0,15.6,16.4,17.2,17.9,19.0,22.5,25.6} >/dev/null 2>&1)
  ls "$PWD/$d"/snapshots/contact-sheet*.jpg
done
