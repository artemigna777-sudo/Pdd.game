"""
Ролик 40, кадр 1: болид «Формулы-1» (без марок и ливрей) летит по трассе прямо на камеру и проносится мимо.
blender --background --python f1.py -- <папка для кадров> [кадр для пробы]
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bpy  # noqa: E402

import random  # noqa: E402

from neon import ACCENT, box, camera, cyl, dim_line, empty, haze, key, linear, mat, outline, parent, reset, smooth, stripes, wet, windows  # noqa: E402

FRAMES = 99
args = sys.argv[sys.argv.index('--') + 1:]
out = args[0]
still = int(args[1]) if len(args) > 1 else None

sc = reset(FRAMES, reflections=True, blur=True)
haze(sc, start=25, depth=330)
random.seed(40)
dark = mat('dark')
asphalt = wet('asphalt')
glow = mat('glow', emit=ACCENT, strength=9)
white = mat('white', emit=(1, 1, 1), strength=2.2)

# Трасса вдоль оси Y: асфальт, края, пунктир и поребрики (без контуров — светятся сами).
# Разметка чуть тусклее контуров болида, чтобы не спорить с ним.
paint = mat('paint', emit=(0.85, 0.87, 0.9), strength=1.3)
box('track', (0, 0, -0.05), (16, 420, 0.1), asphalt)
box('grass', (0, 0, -0.12), (400, 900, 0.1), mat('grass', (0.004, 0.007, 0.006)))
for x in (-6.5, 6.5):
    box('edge', (x, 0, 0.005), (0.16, 420, 0.01), paint)
for i in range(-8, 40):
    y = i * 4.5
    if not 0 < y < 70:
        box('dash', (0, y, 0.005), (0.14, 2.2, 0.01), paint)
    box('kerb', (-7.2, y, 0.03), (0.8, 2.2, 0.06), glow if i % 2 else white)
    box('kerb', (7.2, y, 0.03), (0.8, 2.2, 0.06), glow if i % 2 == 0 else white)

# Стартовая решётка: позиции «уголками» в шахматном порядке и клетчатая линия старта под светофором.
for i in range(9):
    x, y = (2.6 if i % 2 else -2.6), 6 + i * 7
    box('slot', (x, y, 0.006), (2.6, 0.18, 0.012), paint)
    for sx in (-1.21, 1.21):
        box('slotSide', (x + sx, y + 0.7, 0.006), (0.16, 1.4, 0.012), paint)
dark_sq = mat('sq', (0.03, 0.03, 0.035))
for j in range(26):
    for r in range(2):
        box('chk', (-6.25 + j * 0.5, 66.25 + r * 0.5, 0.007), (0.5, 0.5, 0.012), paint if (j + r) % 2 else dark_sq)

# Ограждение и рекламные щиты без надписей и марок: косые полосы приглушённых цветов.
for x in (-9.6, 9.6):
    box('rail', (x, 0, 1.0), (0.06, 420, 0.06), mat('railm', emit=(0.5, 0.62, 0.8), strength=0.5))
    box('fence', (x, 0, 0.5), (0.04, 420, 1.0), dark)
boards = [stripes('bb1', ((0.1, 0.55, 0.65), (0.85, 0.35, 0.12))), stripes('bb2', ((0.55, 0.2, 0.6), (0.1, 0.45, 0.7))),
          stripes('bb3', ((0.8, 0.55, 0.15), (0.15, 0.35, 0.65)))]
bbs = []
for k, y in enumerate(range(14, 230, 17)):
    for side in (-1, 1):
        bbs.append(box('board', (side * 10.0, y, 1.6), (0.12, 7.0, 2.0), boards[(k + (side > 0)) % 3]))

# Мостик над трассой с длинным щитом — виден издалека над болидом.
bridge = [box('bridge', (0, 150, 8.0), (30, 2.4, 1.2), dark)]
bridge += [box('bridgeLeg', (x, 150, 3.7), (0.8, 1.6, 7.4), dark) for x in (-13, 13)]
bridge.append(box('bridgeBoard', (0, 148.75, 8.0), (22, 0.1, 1.0), stripes('bb4', ((0.15, 0.5, 0.75), (0.75, 0.25, 0.5)), strength=0.8)))
bridge.append(box('bridgeLamps', (0, 148.7, 7.25), (28, 0.08, 0.08), mat('bl', emit=(0.4, 0.7, 1.0), strength=1.2)))

# Стартовый светофор над линией старта: 5 пар красных огней — гаснут в начале кадра («старт!»).
gantry = [box('gantry', (0, 66.5, 6.6), (12.5, 0.5, 0.9), dark)]
gantry += [box('gantryLeg', (x, 66.5, 3.2), (0.35, 0.35, 6.4), dark) for x in (-8.2, 8.2)]
gantry.append(box('gantryTop', (0, 66.5, 7.3), (17, 0.4, 0.4), dark))
redOn = mat('redOn', (0.3, 0, 0), emit=(1.0, 0.04, 0.02), strength=7)
redOff = mat('redOff', (0.06, 0.02, 0.02))
OUT = 16  # кадр, на котором огни гаснут
for i in range(5):
    x = -3.2 + i * 1.6
    gantry.append(box('pod', (x, 66.2, 6.6), (0.9, 0.3, 1.5), dark))
    for z in (6.95, 6.3):
        cyl('redOff', (x, 66.03, z), 0.24, 0.06, redOff, rot=(math.pi / 2, 0, 0), verts=20)
        on = cyl('red', (x, 66.0, z), 0.25, 0.08, redOn, rot=(math.pi / 2, 0, 0), verts=20)
        key(on, 1, hide_render=False)
        key(on, OUT, hide_render=True)

# Трибуны по обе стороны: уступы с «болельщиками» (россыпь тусклых огоньков), навес с лампами.
crowd = windows('crowd', (0.95, 0.75, 0.55), strength=0.45, axis='x', cell=(0.55, 0.5), lit=0.45)
stand = []
for side in (-1, 1):
    for t in range(6):
        x, ht = side * (12.0 + t * 1.8), 1.5 * (t + 1)
        stand.append(box('tier', (x, 165, ht / 2), (1.8, 190, ht), crowd))
    stand.append(box('roof', (side * 17.5, 165, 13.5), (13, 190, 0.4), dark))
    stand.append(box('roofLight', (side * 12.0, 165, 13.2), (0.15, 190, 0.12), mat('rl', emit=(0.45, 0.65, 1.0), strength=0.9)))
    for y in range(80, 260, 30):
        stand.append(box('pillar', (side * 11.5, y, 6.6), (0.3, 0.3, 13.2), dark))

# Мачты прожекторов — далеко и высоко, холодные и неяркие (не за силуэтом болида и не белые, как контуры).
flood = mat('flood', emit=(0.55, 0.72, 1.0), strength=2.2)
for y in range(110, 300, 45):
    for side in (-1, 1):
        cyl('mast', (side * 30, y, 13), 0.25, 26, dark, rot=(0, 0, 0), verts=8)
        box('flood', (side * 29, y, 26.5), (2.6, 0.3, 1.4), flood)

# Город за трассой: силуэты домов с окнами (тёплые и холодные), дальние — тусклее за дымкой.
win_w = windows('winW', (1.0, 0.6, 0.3), strength=0.6, lit=0.3)
win_c = windows('winC', (0.45, 0.65, 1.0), strength=0.55, lit=0.25, cell=(2.0, 1.4))
city = []
x = -90.0
while x < 90:
    w = random.uniform(8, 16)
    h = random.uniform(18, 70) if abs(x) > 12 else random.uniform(26, 48)
    y = random.uniform(300, 360)
    city.append(box('house', (x + w / 2, y, h / 2), (w, random.uniform(10, 16), h), random.choice((win_w, win_w, win_c))))
    if random.random() < 0.3:
        cyl('antenna', (x + w / 2, y, h + 3), 0.1, 6, dark, rot=(0, 0, 0), verts=6)
        box('beacon', (x + w / 2, y, h + 6.1), (0.5, 0.5, 0.5), mat('beacon', emit=(1, 0.1, 0.05), strength=2))
    x += w + random.uniform(0.5, 4)

outline(gantry + bridge + stand + city, width=0.08, line=dim_line())

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
    box('diffuser', (0, 1.95, 0.16), (1.1, 0.5, 0.12), dark, rot=(-0.25, 0, 0)),
    box('mirrorL', (0.5, -0.6, 0.78), (0.18, 0.05, 0.08), dark),
    box('mirrorR', (-0.5, -0.6, 0.78), (0.18, 0.05, 0.08), dark),
    box('rainlight', (0, 2.08, 0.5), (0.18, 0.03, 0.08), mat('rain', emit=(1, 0.05, 0.03), strength=12)),
]
# Подвеска: тонкие рычаги от монокока к колёсам.
for x in (1, -1):
    for y, z in ((-1.62, 0.42), (-1.62, 0.28), (1.45, 0.45), (1.45, 0.3)):
        dx = 0.62 * x
        parts.append(box('arm', (dx / 2 + 0.3 * x, y, z), (abs(dx), 0.05, 0.03), dark))
smooth([p for p in parts if p.name.startswith(('tub', 'nose', 'podL', 'podR', 'cover'))])
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.17, location=(0, -0.32, 0.86))
helmet = bpy.context.object
helmet.data.materials.append(mat('helmet', emit=ACCENT, strength=4))
parts.append(helmet)
wheels = []
for x, y, r, w in ((0.86, -1.62, 0.34, 0.32), (-0.86, -1.62, 0.34, 0.32), (0.88, 1.45, 0.37, 0.42), (-0.88, 1.45, 0.37, 0.42)):
    hub = empty('hub', (x, y, r))
    tyre = cyl('tyre', (x, y, r), r, w, dark, rot=(0, math.pi / 2, 0), verts=48)
    rim = cyl('rim', (x + (0.17 if x > 0 else -0.17) * (w / 0.32), y, r), r * 0.62, 0.02, mat('rim', emit=(1, 1, 1), strength=1.4), rot=(0, math.pi / 2, 0), verts=32)
    side = 1 if x > 0 else -1
    bpy.ops.mesh.primitive_torus_add(major_radius=r * 0.8, minor_radius=0.012, location=(x + side * (w / 2 + 0.005), y, r),
                                     rotation=(0, math.pi / 2, 0))
    ring = bpy.context.object
    ring.data.materials.append(glow)
    parent([tyre, rim, ring], hub)
    wheels.append(hub)
    parts.append(hub)
parent(parts, car)
outline([p for p in parts if p.type == 'MESH' and p.name != 'rainlight'] + [c for h in wheels for c in h.children if c.name.startswith('tyre')], width=0.03)

# Искры из-под днища: короткие оранжевые штрихи назад, мигают вразнобой.
for i in range(14):
    sp = box('spark', (random.uniform(-0.5, 0.5), random.uniform(1.0, 2.4), 0.04),
             (0.012, random.uniform(0.3, 0.9), 0.012), mat('spark', emit=(1, 0.6, 0.2), strength=25),
             rot=(0, 0, random.uniform(-0.3, 0.3)))
    sp.parent = car
    for f in range(1, FRAMES + 1, 2):
        key(sp, f, hide_render=random.random() < 0.55)

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
cam.data.dof.use_dof = True
cam.data.dof.focus_object = target
cam.data.dof.aperture_fstop = 4.0
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
