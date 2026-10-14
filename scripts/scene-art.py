"""
Картинки кат-сцен (этап 18): кадры из Gemini → WebP для игры.

  python3 scripts/scene-art.py <папка с кадрами .jpg> <глава, например ch3>

Полные кадры уменьшаются до 1080 по ширине. Кадры на ярко-зелёном фоне (имена в KEYED) вырезаются:
зелёный становится прозрачным, зелёная кайма по краю убирается, пустые края обрезаются.
Результат — public/scenes/<глава>/<имя>.webp.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

KEYED = {'artem-moped', 'suv'}
MAX_W = 1080


def key_green(img: Image.Image) -> Image.Image:
    a = np.asarray(img.convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    green = g - np.maximum(r, b)
    # Чем зеленее пиксель, тем он прозрачнее: до 25 — непрозрачный, от 90 — прозрачный.
    alpha = 1 - np.clip((green - 25) / 65, 0, 1)
    # Кайма: оставшийся зелёный оттенок убираем (зелёный не больше остальных каналов).
    g2 = np.where(green > 0, np.maximum(r, b) + np.minimum(green, 0), g)
    out = np.dstack([r, g2, b, alpha * 255]).clip(0, 255).astype(np.uint8)
    res = Image.fromarray(out, 'RGBA')
    box = Image.fromarray((alpha > 0.05).astype(np.uint8) * 255).getbbox()
    return res.crop(box) if box else res


def main(src: str, chapter: str) -> None:
    out = Path(__file__).resolve().parent.parent / 'public' / 'scenes' / chapter
    out.mkdir(parents=True, exist_ok=True)
    for f in sorted(Path(src).glob('*.jpg')):
        if f.stem.startswith('sheet-'):
            continue
        img = Image.open(f)
        if f.stem in KEYED:
            img = key_green(img)
        if img.width > MAX_W:
            img = img.resize((MAX_W, round(img.height * MAX_W / img.width)), Image.LANCZOS)
        dst = out / f'{f.stem}.webp'
        img.save(dst, 'WEBP', quality=80, method=6, alpha_quality=90)
        print(f'{dst.name}: {img.width}×{img.height}, {dst.stat().st_size // 1024} КБ')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
