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

from neon import box, camera, cyl, empty, key, mat, outline, parent, reset  # noqa: E402

FRAMES = 74
args = sys.argv[sys.argv.index('--') + 1:]
out = args[0]
still = int(args[1]) if len(args) > 1 else None

sc = reset(FRAMES)
dark = mat('dark')
asphalt = mat('asphalt', (0.008, 0.009, 0.012))
white = mat('white', emit=(1, 1, 1), strength=2.2)
red = mat('red', (0.5, 0.0, 0.0), emit=(0.95, 0.03, 0.02), strength=2.4)
lamp = mat('lamp', emit=(1, 0.95, 0.8), strength=8)

# Наша дорога — вдоль Y (машина едет к перекрёстку по −Y), поперечная — вдоль X.
box('ground', (0, 0, -0.12), (200, 200, 0.1), mat('ground', (0.004, 0.005, 0.008)))
box('road', (0, 30, -0.05), (7, 70, 0.1), asphalt)
box('cross', (0, -1, -0.05), (80, 9, 0.1), asphalt)
for x in (-3.5, 3.5):
    box('edge', (x, 34, 0.005), (0.12, 60, 0.01), white)
for y in (-5.5, 3.5):
    for x0 in (-40, 21.75):
        box('edgeX', (x0 + (9 if x0 < 0 else 0), y, 0.005), (36.5 if x0 < 0 else 36.5, 0.12, 0.01), white)
for i in range(1, 14):
    box('dash', (0, 6 + i * 4.5, 0.005), (0.12, 2.2, 0.01), white)
box('stopline', (-1.75, 5.2, 0.006), (3.4, 0.4, 0.012), white)

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
camera((3.6, 16.5, 3.2), aim, lens=40)

sc.render.filepath = os.path.join(out, '')
if still:
    sc.frame_set(still)
    sc.render.filepath = os.path.join(out, f'still_{still:04d}.png')
    bpy.ops.render.render(write_still=True)
else:
    bpy.ops.render.render(animation=True)
print('DONE')
