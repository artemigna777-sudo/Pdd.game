"""
Ролик 40, кадр 1: болид «Формулы-1» (без марок и ливрей) летит по трассе прямо на камеру и проносится мимо.
blender --background --python f1.py -- <папка для кадров> [кадр для пробы]
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bpy  # noqa: E402

from neon import ACCENT, box, camera, cyl, empty, key, linear, mat, outline, parent, reset  # noqa: E402

FRAMES = 99
args = sys.argv[sys.argv.index('--') + 1:]
out = args[0]
still = int(args[1]) if len(args) > 1 else None

sc = reset(FRAMES)
dark = mat('dark')
asphalt = mat('asphalt', (0.008, 0.009, 0.012))
glow = mat('glow', emit=ACCENT, strength=9)
white = mat('white', emit=(1, 1, 1), strength=2.2)

# Трасса вдоль оси Y: асфальт, светящиеся края, пунктир и поребрики (без контуров — светятся сами).
box('track', (0, 0, -0.05), (16, 420, 0.1), asphalt)
for x in (-6.5, 6.5):
    box('edge', (x, 0, 0.005), (0.16, 420, 0.01), white)
for x in (-9.5, 9.5):
    box('rail', (x, 0, 1.05), (0.05, 420, 0.05), white)
for i in range(-8, 40):
    y = i * 4.5
    box('dash', (0, y, 0.005), (0.14, 2.2, 0.01), white)
    box('kerb', (-7.2, y, 0.03), (0.8, 2.2, 0.06), glow if i % 2 else white)
    box('kerb', (7.2, y, 0.03), (0.8, 2.2, 0.06), glow if i % 2 == 0 else white)

# Болид: нос к камере (по −Y).
car = empty('car')
parts = [
    box('floor', (0, 0, 0.12), (1.25, 3.5, 0.04), dark),
    box('tub', (0, 0, 0.45), (0.62, 3.2, 0.42), dark, bevel=0.06),
    box('nose', (0, -2.25, 0.36), (0.34, 1.5, 0.2), dark, bevel=0.05),
    box('stripe', (0, -1.6, 0.67), (0.07, 2.4, 0.012), glow),
    box('podL', (0.6, 0.35, 0.38), (0.46, 1.6, 0.34), dark, bevel=0.08),
    box('podR', (-0.6, 0.35, 0.38), (0.46, 1.6, 0.34), dark, bevel=0.08),
    box('cover', (0, 0.95, 0.74), (0.4, 1.7, 0.44), dark, bevel=0.08),
    box('halo', (0, -0.35, 0.98), (0.5, 0.08, 0.06), dark),
    box('haloBar', (0, -0.62, 0.86), (0.07, 0.5, 0.06), dark, rot=(0.6, 0, 0)),
    box('fwing', (0, -2.95, 0.16), (1.95, 0.46, 0.05), dark),
    box('fplateL', (0.98, -2.95, 0.26), (0.04, 0.52, 0.26), glow),
    box('fplateR', (-0.98, -2.95, 0.26), (0.04, 0.52, 0.26), glow),
    box('rwing', (0, 1.85, 1.02), (1.05, 0.42, 0.07), dark),
    box('rwing2', (0, 1.95, 0.86), (1.05, 0.3, 0.05), dark),
    box('rplateL', (0.53, 1.85, 0.86), (0.04, 0.62, 0.6), glow),
    box('rplateR', (-0.53, 1.85, 0.86), (0.04, 0.62, 0.6), glow),
    box('pylon', (0, 1.75, 0.8), (0.06, 0.2, 0.4), dark),
]
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.17, location=(0, -0.32, 0.86))
helmet = bpy.context.object
helmet.data.materials.append(mat('helmet', emit=ACCENT, strength=4))
parts.append(helmet)
wheels = []
for x, y, r, w in ((0.86, -1.62, 0.34, 0.32), (-0.86, -1.62, 0.34, 0.32), (0.88, 1.45, 0.37, 0.42), (-0.88, 1.45, 0.37, 0.42)):
    hub = empty('hub', (x, y, r))
    tyre = cyl('tyre', (x, y, r), r, w, dark, rot=(0, math.pi / 2, 0), verts=48)
    rim = cyl('rim', (x + (0.17 if x > 0 else -0.17) * (w / 0.32), y, r), r * 0.62, 0.02, mat('rim', emit=(1, 1, 1), strength=1.4), rot=(0, math.pi / 2, 0), verts=32)
    parent([tyre, rim], hub)
    wheels.append(hub)
    parts.append(hub)
parent(parts, car)
outline([p for p in parts if p.type == 'MESH'] + [c for h in wheels for c in h.children])

# Движение: издалека прямо на камеру и мимо, колёса крутятся.
key(car, 1, location=(0.9, 59.2, 0))
key(car, FRAMES, location=(0.9, -14, 0))
linear(car)
for hub in wheels:
    key(hub, 1, rotation_euler=(0, 0, 0))
    key(hub, FRAMES, rotation_euler=(-(73.2 / 0.35), 0, 0))
    linear(hub)

# Камера у края трассы, низко; следит за болидом, лёгкая тряска.
target = empty('aim')
target.parent = car
target.location = (0, -1.0, 0.5)
cam = camera((2.9, -8.0, 0.55), target, lens=77)
cam.data.shift_y = 0.05
for f in range(1, FRAMES + 1, 3):
    key(cam, f, location=(2.9 + 0.015 * math.sin(f * 1.7), -8.0, 0.55 + 0.015 * math.cos(f * 2.3)))

sc.render.filepath = os.path.join(out, '')
if still:
    sc.frame_set(still)
    sc.render.filepath = os.path.join(out, f'still_{still:04d}.png')
    bpy.ops.render.render(write_still=True)
else:
    sc.render.image_settings.file_format = 'PNG'
    bpy.ops.render.render(animation=True)
print('DONE')
