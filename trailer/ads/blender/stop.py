"""
Ролик 40, кадр 3: легковая машина подъезжает к знаку STOP (2.5), сбавляет скорость — и проезжает стоп-линию,
так и не остановившись. Камера со стороны подъезда: машина проезжает мимо неё к знаку и стоп-линии.
blender --background --python stop.py -- <папка для кадров> [кадр для пробы]
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bpy  # noqa: E402

import random  # noqa: E402

from neon import box, camera, cyl, dim_line, empty, haze, key, mat, outline, parent, reset, stripes, wet, windows  # noqa: E402

FRAMES = 74
args = sys.argv[sys.argv.index('--') + 1:]
out = args[0]
still = int(args[1]) if len(args) > 1 else None

sc = reset(FRAMES, reflections=True)
haze(sc, start=5, depth=75, amount=0.9)
random.seed(25)
dark = mat('dark')
asphalt = wet('asphalt', (0.008, 0.009, 0.012))
white = mat('white', emit=(1, 1, 1), strength=2.2)
paint = mat('paint', emit=(0.85, 0.87, 0.9), strength=1.2)
red = mat('red', (0.5, 0.0, 0.0), emit=(0.95, 0.03, 0.02), strength=2.4)
lamp = mat('lamp', emit=(1, 0.95, 0.8), strength=8)
side = mat('sidewalk', (0.018, 0.02, 0.026))
leaf = mat('leaf', (0.006, 0.014, 0.01))
dl = dim_line()
env = []  # всё окружение — с тусклыми холодными контурами

# Наша дорога — вдоль Y (машина едет к перекрёстку по −Y), поперечная — вдоль X.
box('ground', (0, 0, -0.12), (300, 300, 0.1), mat('ground', (0.004, 0.007, 0.006)))
box('road', (0, 30, -0.05), (7, 70, 0.1), asphalt)
box('cross', (0, -1, -0.05), (160, 9, 0.1), asphalt)
for x in (-3.5, 3.5):
    box('edge', (x, 34, 0.005), (0.12, 60, 0.01), paint)
for y in (-5.5, 3.5):
    for x0 in (-40, 21.75):
        box('edgeX', (x0 + (9 if x0 < 0 else 0), y, 0.005), (36.5, 0.12, 0.01), paint)
for i in range(1, 14):
    box('dash', (0, 6 + i * 4.5, 0.005), (0.12, 2.2, 0.01), paint)
for i in range(-12, 12):
    if abs(i) > 1:
        box('dashX', (i * 4.5, -1, 0.005), (2.2, 0.12, 0.01), paint)
box('stopline', (-1.75, 5.2, 0.006), (3.4, 0.4, 0.012), white)
# Надпись STOP на асфальте перед стоп-линией (как в Великобритании).
bpy.ops.object.text_add(location=(-1.75, 8.6, 0.01), rotation=(0, 0, math.pi))
road_txt = bpy.context.object
road_txt.data.body = 'STOP'
road_txt.data.align_x = road_txt.data.align_y = 'CENTER'
road_txt.data.size = 1.5
road_txt.scale = (0.7, 1.9, 1)
road_txt.data.materials.append(paint)
# Пешеходный переход через поперечную дорогу (слева от перекрёстка).
for k in range(8):
    box('zebra', (-9.5, -4.6 + k * 1.1, 0.006), (3.2, 0.55, 0.012), paint)

# Тротуары с бордюрами по углам перекрёстка.
for cx, cy, w, d in ((-26, -9.0, 45, 6.6), (24, -9.0, 45, 6.6), (-26, 7.0, 45, 6.6), (24, 7.0, 45, 6.6), (-6.0, 30, 5, 46), (6.0, 30, 5, 46)):
    env.append(box('walk', (cx, cy, 0.07), (w, d, 0.14), side))

# Дома за перекрёстком: окна тёплые и холодные, у некоторых — двускатная крыша.
wall = (0.014, 0.019, 0.03)  # фасады — тёмно-синие, а не чёрные
win_w = windows('winW', (1.0, 0.6, 0.3), strength=0.6, lit=0.55, cell=(1.2, 1.05), wall=wall)
win_c = windows('winC', (0.45, 0.65, 1.0), strength=0.55, lit=0.5, cell=(1.3, 1.05), wall=wall)
shop = [windows('shopW', (1.0, 0.72, 0.42), strength=0.75, cell=(1.5, 2.2), lit=0.8, wall=wall),
        windows('shopC', (0.55, 0.8, 1.0), strength=0.65, cell=(1.5, 2.2), lit=0.8, wall=wall)]
awn = [stripes('awn1', ((0.7, 0.18, 0.15), (0.85, 0.8, 0.72)), strength=0.45, period=0.7),
       stripes('awn2', ((0.12, 0.42, 0.4), (0.8, 0.78, 0.7)), strength=0.45, period=0.7)]
metal = mat('metal', (0.03, 0.035, 0.045))
x = -60.0
while x < 30:
    w = random.uniform(7, 12)
    h = random.uniform(5, 10)
    d = random.uniform(8, 11)
    y = -17 - d / 2 - random.uniform(0, 3)
    xc, front = x + w / 2, y + d / 2
    env.append(box('house', (xc, y, h / 2), (w, d, h), random.choice((win_w, win_w, win_c))))
    if random.random() < 0.45:
        env.append(box('roof', (xc, y, h), (w * 0.55, d, w * 0.55), dark, rot=(0, math.pi / 4, 0)))
    else:
        # Плоская крыша: бортик, антенна, кондиционеры или бак.
        env.append(box('parapet', (xc, front - 0.1, h + 0.25), (w, 0.2, 0.5), dark))
        if random.random() < 0.5:
            env.append(box('tank', (xc + random.uniform(-2, 2), y, h + 1.1), (1.6, 1.6, 2.2), metal))
        env.append(cyl('ant', (xc - w * 0.3, y + 1, h + 1.5), 0.04, 3, metal, rot=(0, 0, 0), verts=6))
        env.append(box('antX', (xc - w * 0.3, y + 1, h + 2.6), (1.2, 0.05, 0.05), metal))
    # Витрина первого этажа с полосатым навесом.
    # (прямо за знаком витрин нет — там тёмная крона, чтобы знак не терялся на светлом)
    if random.random() < 0.75 and abs(xc + 22) > 4.5:
        box('shop', (xc, front + 0.03, 1.4), (w * 0.72, 0.06, 2.2), random.choice(shop))
        env.append(box('awning', (xc, front + 0.55, 2.55), (w * 0.8, 1.1, 0.12), random.choice(awn), rot=(-0.3, 0, 0)))
    # Балконы и кондиционеры на этажах.
    for fz in range(2, int(h / 2.6)):
        z = fz * 2.6
        if random.random() < 0.4:
            env.append(box('balcony', (xc + random.uniform(-w / 4, w / 4), front + 0.5, z), (2.2, 1.0, 0.12), dark))
        if random.random() < 0.35:
            env.append(box('ac', (xc + random.uniform(-w / 3, w / 3), front + 0.25, z + 0.9), (0.8, 0.45, 0.55), metal))
    x += w + random.uniform(0.3, 2.5)
# Дальний город — высокие дома в дымке, чтобы небо не было пустым.
win_f = windows('winF', (0.5, 0.7, 1.0), strength=0.5, lit=0.3, cell=(2.2, 1.6))
x = -90.0
while x < 40:
    w = random.uniform(10, 18)
    h = random.uniform(24, 55)
    env.append(box('tower', (x + w / 2, random.uniform(-50, -65), h / 2), (w, 12, h), random.choice((win_f, win_w))))
    x += w + random.uniform(1, 6)

# Деревья: тёмная крона прямо за знаком отделяет его от окон и фонарей.
for tx, ty, r in ((-17.5, -8.6, 2.6), (-23, -8.4, 2.0), (-4.5, -8.6, 1.7), (-31, -8.6, 2.3), (-12.5, 7.8, 1.6), (6.8, 12, 1.8), (6.8, 22, 2.0)):
    env.append(cyl('trunk', (tx, ty, r * 0.9), 0.14, r * 1.8, dark, rot=(0, 0, 0), verts=8))
    # Крона из нескольких гладких шаров — круглая, не похожа на восьмиугольник знака.
    for dx, dz, k in ((0, 0.7, 1.0), (-0.55, 0.3, 0.7), (0.6, 0.35, 0.72), (0.1, 1.25, 0.65)):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=r * k, location=(tx + dx * r, ty, r * 1.8 + dz * r))
        crown = bpy.context.object
        bpy.ops.object.shade_smooth()
        crown.data.materials.append(leaf)
        env.append(crown)

# Остановка автобуса на дальнем тротуаре: навес, светящийся щит без надписей, скамейка.
for o in (box('shRoof', (-13.0, -10.6, 2.55), (3.6, 1.6, 0.1), metal), box('shBack', (-13.0, -11.3, 1.3), (3.4, 0.06, 2.3), mat('shGlass', (0.02, 0.03, 0.045))),
          box('shLegL', (-14.7, -10.0, 1.25), (0.08, 0.08, 2.5), metal), box('shLegR', (-11.3, -10.0, 1.25), (0.08, 0.08, 2.5), metal),
          box('shBench', (-13.0, -10.9, 0.5), (2.6, 0.45, 0.08), metal)):
    env.append(o)
box('shAd', (-11.25, -10.6, 1.35), (0.06, 1.3, 1.9), stripes('ad', ((0.2, 0.55, 0.75), (0.85, 0.45, 0.2)), strength=0.8, axis='x', period=0.8))
# Знак «Пешеходный переход» (синий квадрат) у зебры — меньше и другого цвета, чем STOP.
env.append(cyl('pedPole', (-7.4, -5.9, 1.2), 0.04, 2.4, metal, rot=(0, 0, 0), verts=8))
box('pedSign', (-7.4, -5.86, 2.35), (0.6, 0.04, 0.6), mat('blue', (0.02, 0.1, 0.4), emit=(0.1, 0.3, 0.9), strength=0.9))
box('pedTri', (-7.4, -5.83, 2.35), (0.36, 0.02, 0.32), mat('pedW', emit=(0.9, 0.9, 0.95), strength=0.7), rot=(0, math.pi / 4, 0))
# Столбики вдоль бордюров и урна, пожарный гидрант.
for bx in range(-30, -1, 2):
    if not -12 < bx < -7:
        env.append(cyl('bollard', (bx, -5.95, 0.45), 0.07, 0.6, metal, rot=(0, 0, 0), verts=10))
env.append(cyl('bin', (-3.9, -6.3, 0.55), 0.28, 0.8, metal, rot=(0, 0, 0), verts=16))
env.append(cyl('hydrant', (-5.6, -6.1, 0.5), 0.13, 0.7, mat('hyd', (0.35, 0.05, 0.03)), rot=(0, 0, 0), verts=12))
# Провода между столбами над улицей — линии в небе.
for px in (-3.0, -16.0, -29.0):
    env.append(cyl('upole', (px, -12.5, 4.5), 0.1, 9, dark, rot=(0, 0, 0), verts=8))
    env.append(box('ucross', (px, -12.5, 8.6), (0.08, 1.6, 0.08), dark))
for wy in (-11.9, -13.1):
    for p0, p1 in ((-29.0, -16.0), (-16.0, -3.0)):
        bpy.ops.curve.primitive_bezier_curve_add(location=(0, 0, 0))
        cv = bpy.context.object
        pts = cv.data.splines[0].bezier_points
        pts[0].co, pts[1].co = (p0, wy, 8.55), (p1, wy, 8.55)
        pts[0].handle_right, pts[1].handle_left = (p0 + 4, wy, 7.4), (p1 - 4, wy, 7.4)
        pts[0].handle_left, pts[1].handle_right = (p0 - 1, wy, 8.7), (p1 + 1, wy, 8.7)
        cv.data.bevel_depth = 0.02
        cv.data.materials.append(dl)
# Облака в небе — тёмные полосы, подсвеченные городом снизу.
for cx, cz, cw in ((-70, 46, 60), (-20, 58, 80), (30, 50, 50)):
    box('cloud', (cx, -130, cz), (cw, 2, 5), mat('cloud', (0.03, 0.04, 0.07), emit=(0.08, 0.1, 0.18), strength=0.6))

# Фонари — натриевые (янтарные), неяркие, в стороне от знака.
sodium = mat('sodium', emit=(1.0, 0.55, 0.2), strength=4)
for lx, ly, f in ((-6.6, -6.6, 1), (-36, -6.6, 1), (5.2, 14, -1), (-5.2, 26, 1)):
    env.append(cyl('lpole', (lx, ly, 2.6), 0.07, 5.2, dark, rot=(0, 0, 0), verts=8))
    env.append(box('larm', (lx + 0.5 * f, ly, 5.15), (1.1, 0.1, 0.1), dark))
    box('lhead', (lx + 1.0 * f, ly, 5.05), (0.5, 0.25, 0.12), sodium)
    bpy.ops.object.light_add(type='POINT', location=(lx + 1.0 * f, ly, 4.8))
    lt = bpy.context.object
    lt.data.color = (1.0, 0.6, 0.3)
    lt.data.energy = 650
    lt.data.shadow_soft_size = 0.3

# Припаркованная машина на дальней стороне (тусклые контуры, без света).
for px in (-24.5,):
    env.append(box('pbody', (px, -4.4, 0.55), (3.9, 1.7, 0.6), dark, bevel=0.12))
    env.append(box('pcab', (px + 0.3, -4.4, 1.08), (2.0, 1.5, 0.52), dark, bevel=0.12))

outline(env, width=0.05, line=dl)

# Знак 2.5: стойка, восьмиугольник, белая кайма, надпись STOP.
# Машина и камера — со стороны +Y: кайма позади, лицо, надпись впереди.
pole = cyl('pole', (-4.4, 5.5, 1.3), 0.06, 2.6, dark, rot=(0, 0, 0), verts=12)
border = cyl('border', (-4.4, 5.52, 2.75), 0.84, 0.04, white, rot=(math.pi / 2, math.pi / 8, 0), verts=8)
face = cyl('face', (-4.4, 5.58, 2.75), 0.76, 0.06, red, rot=(math.pi / 2, math.pi / 8, 0), verts=8)
bpy.ops.object.text_add(location=(-4.4, 5.64, 2.75), rotation=(math.pi / 2, 0, math.pi))
txt = bpy.context.object
txt.data.body = 'STOP'
txt.data.align_x = 'CENTER'
txt.data.align_y = 'CENTER'
txt.data.size = 0.5
txt.data.extrude = 0.01
txt.data.materials.append(white)
outline([pole, face])

# Машина: кузов, кабина, колёса, фары; нос по −Y.
car = empty('car')
parts = [
    box('body', (0, 0, 0.6), (1.75, 3.9, 0.62), dark, bevel=0.14),
    box('cabin', (0, 0.35, 1.18), (1.55, 2.1, 0.6), dark, bevel=0.14),
    box('glassF', (0, -0.72, 1.2), (1.4, 0.04, 0.42), mat('glass', (0.02, 0.03, 0.05)), rot=(-0.5, 0, 0)),
    box('lightL', (0.6, -1.96, 0.72), (0.34, 0.04, 0.14), lamp),
    box('lightR', (-0.6, -1.96, 0.72), (0.34, 0.04, 0.14), lamp),
    box('tailL', (0.62, 1.96, 0.78), (0.32, 0.04, 0.14), red),
    box('tailR', (-0.62, 1.96, 0.78), (0.32, 0.04, 0.14), red),
]
for x, y in ((0.88, -1.25), (-0.88, -1.25), (0.88, 1.3), (-0.88, 1.3)):
    parts.append(cyl('tyre', (x, y, 0.32), 0.32, 0.24, dark, rot=(0, math.pi / 2, 0), verts=36))
parent(parts, car)
outline(parts)

# Подъезд: быстро, потом медленно — и через стоп-линию, не останавливаясь (скорость не падает до нуля).
for f, y in ((1, 23.0), (24, 13.0), (44, 9.0), (62, 7.0), (74, 5.4)):
    key(car, f, location=(-1.75, y, 0))
for fc in car.animation_data.action.fcurves:
    for kp in fc.keyframe_points:
        kp.interpolation = 'BEZIER'
        kp.handle_left_type = kp.handle_right_type = 'AUTO_CLAMPED'

aim = empty('aim', (-3.0, 5.6, 1.5))
camera((3.6, 16.5, 3.2), aim, lens=33)

sc.render.filepath = os.path.join(out, '')
if still:
    sc.frame_set(still)
    sc.render.filepath = os.path.join(out, f'still_{still:04d}.png')
    bpy.ops.render.render(write_still=True)
else:
    bpy.ops.render.render(animation=True)
print('DONE')
