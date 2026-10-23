"""
Ролик 41, кадр 2: «В 16 лет он уже летал сам, а водительских прав ещё не было» — маленький высокоплан
с хвостовым колесом разбегается по травяному полю на рассвете и взлетает над камерой.
blender --background --python plane.py -- <папка для кадров> [кадр для пробы]
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

from neon import (box, camera, cyl, dim_line, empty, haze, key, look, mat, outline, parent, reset, sky,  # noqa: E402
                  still_or_anim, sun, windows)

FRAMES = 99
LIFT = 58
args = sys.argv[sys.argv.index('--') + 1:]
out = args[0]
still = int(args[1]) if len(args) > 1 else None

sc = reset(FRAMES, blur=True)
look(sc, 'Standard', -0.2)
sky(sc, zenith=(0.08, 0.14, 0.34), horizon=(1.0, 0.55, 0.28), stars=0.1, strength=1.15)
haze(sc, color=(0.85, 0.52, 0.32), start=90, depth=900, amount=0.3)
random.seed(46)
sun((math.radians(84), 0, math.radians(195)), strength=3.2, color=(1.0, 0.7, 0.45), angle=1.5)
# Солнце над горизонтом за полем — светящийся диск (свечение композитора даёт ореол).
bpy.ops.mesh.primitive_uv_sphere_add(radius=22, location=(-120, 1400, 60))
bpy.context.object.data.materials.append(mat('sunDisk', emit=(1.0, 0.8, 0.5), strength=6))

# ─── Поле: трава, выкошенная полоса, кочки, забор, ветроуказатель, сарай, деревья, холмы ─
grass = mat('grass', (0.05, 0.09, 0.03))
nt = grass.node_tree
b = nt.nodes['Principled BSDF']
n = nt.nodes.new('ShaderNodeTexNoise')
n.inputs['Scale'].default_value = 0.08
n.inputs['Detail'].default_value = 2
rp = nt.nodes.new('ShaderNodeValToRGB')
rp.color_ramp.elements[0].color = (0.03, 0.06, 0.02, 1)
rp.color_ramp.elements[1].color = (0.1, 0.13, 0.04, 1)
nt.links.new(n.outputs['Fac'], rp.inputs['Fac'])
nt.links.new(rp.outputs['Color'], b.inputs['Base Color'])
b.inputs['Roughness'].default_value = 0.95
box('field', (0, 0, -0.05), (4000, 4000, 0.1), grass)
strip = mat('strip', (0.1, 0.14, 0.05))
strip.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.95
for i in range(14):
    box('mown', (-2.5, -40 + i * 14, -0.03), (9, 7, 0.06), strip if i % 2 else mat('strip2', (0.09, 0.13, 0.045)))
# Пучки травы: тонкие треугольники, пучок — одна сетка, копии с общей сеткой (дёшево).
bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=0.03, radius2=0, depth=0.38, location=(0, -900, 0.19))
blade = bpy.context.object
blade.data.materials.append(mat('blade', (0.08, 0.16, 0.04)))
tufts = []
# Густо у камеры (силуэты против рассвета), реже вдали; полоса разбега чистая.
for _ in range(5200):
    y = -11 + 85 * random.random() ** 2.2
    x = random.uniform(-30, 30)
    if abs(x + 2.5) < 4.5:
        continue
    o = blade.copy()
    bpy.context.collection.objects.link(o)
    s = random.uniform(0.6, 1.6)
    o.location = (x, y, 0.2 * s)
    o.rotation_euler = (random.uniform(-0.3, 0.3), random.uniform(-0.3, 0.3), random.uniform(0, 6.3))
    o.scale = (s, s, s)
dl = dim_line()
env = []
wood = mat('wood', (0.09, 0.06, 0.04))
for i in range(40):
    env.append(box('post', (12, -30 + i * 4, 0.6), (0.14, 0.14, 1.2), wood))
env.append(box('rail1', (12, 48, 1.0), (0.06, 160, 0.08), wood))
env.append(box('rail2', (12, 48, 0.55), (0.06, 160, 0.08), wood))
env.append(cyl('sockPole', (15, 30, 3), 0.06, 6, wood, rot=(0, 0, 0), verts=8))
bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.45, radius2=0.18, depth=2.2, location=(14.0, 30, 5.6), rotation=(0, math.radians(-80), 0))
sock = bpy.context.object
sock.data.materials.append(mat('sock', (0.9, 0.35, 0.05), emit=(1.0, 0.48, 0.18), strength=0.5))
env.append(sock)
barnwin = windows('barnWin', (1.0, 0.75, 0.45), strength=1.0, axis='x', cell=(2.0, 1.6), lit=0.6, wall=(0.12, 0.05, 0.035))
env.append(box('barn', (26, 55, 4), (12, 16, 8), barnwin))
env.append(box('barnRoof', (26, 55, 8.6), (9, 16.4, 9), mat('roofm', (0.05, 0.03, 0.03)), rot=(0, math.pi / 4, 0)))
box('barnDoor', (19.9, 55, 2.6), (0.2, 5, 5), mat('barnDoor', (0.1, 0.07, 0.04), emit=(1.0, 0.7, 0.4), strength=1.4))
leaf = mat('leaf', (0.02, 0.04, 0.015))
for i in range(120):
    x = -320 + i * 5.5 + random.uniform(-2, 2)
    r = random.uniform(3, 8)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=r, location=(x, 230 + random.uniform(-15, 15), r * 0.95))
    bpy.context.object.data.materials.append(leaf)
hill = mat('hill', (0.045, 0.055, 0.08))
for i in range(30):
    r = random.uniform(90, 180)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(random.uniform(-1400, 1400), random.uniform(1300, 1700), -r * 0.82))
    bpy.context.object.data.materials.append(hill)
outline(env, width=0.04, line=dl)

# ─── Самолёт: высокоплан, хвостовое колесо; нос по −Y (к камере) ─────────────
body = mat('body', (0.04, 0.06, 0.12))
trim = mat('trim', (0.9, 0.35, 0.05), emit=(1.0, 0.48, 0.18), strength=0.7)
darkm = mat('darkp', (0.03, 0.03, 0.035))
glass = mat('glassP', (0.02, 0.03, 0.04), emit=(0.35, 0.55, 0.65), strength=0.35)
pl = empty('plane')
bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.62, radius2=0.14, depth=6.2, location=(0, 2.2, 1.55), rotation=(math.radians(-90), 0, 0))
fus = bpy.context.object
fus.scale = (0.85, 1, 1.15)
fus.data.materials.append(body)
parts = [fus,
         cyl('cowl', (0, -1.15, 1.55), 0.56, 0.9, darkm, verts=20),
         box('cabin', (0, -0.2, 2.15), (1.0, 1.9, 0.8), body, bevel=0.12),
         box('winL', (-0.51, -0.25, 2.2), (0.03, 1.4, 0.5), glass),
         box('winR', (0.51, -0.25, 2.2), (0.03, 1.4, 0.5), glass),
         box('wind', (0, -1.16, 2.2), (0.85, 0.05, 0.45), glass, rot=(-0.6, 0, 0)),
         box('wing', (0, -0.2, 2.62), (10.6, 1.6, 0.16), body, bevel=0.05),
         box('wingStripe', (0, -0.2, 2.71), (10.6, 0.35, 0.02), trim),
         box('fin', (0, 5.05, 2.25), (0.08, 1.1, 1.35), body, rot=(-0.35, 0, 0)),
         box('stab', (0, 5.1, 1.62), (3.2, 0.8, 0.08), body),
         box('finStripe', (0, 5.0, 2.4), (0.1, 0.9, 0.18), trim, rot=(-0.35, 0, 0))]
for x in (-1, 1):
    parts += [box('strut', (x * 1.65, -0.2, 1.95), (0.07, 0.12, 1.6), darkm, rot=(0, -x * 1.05, 0)),
              box('gear', (x * 0.75, -0.75, 0.75), (0.07, 0.12, 1.15), darkm, rot=(0, -x * 0.45, 0)),
              cyl('wheel', (x * 1.0, -0.8, 0.27), 0.27, 0.16, darkm, rot=(0, math.pi / 2, 0), verts=24)]
parts.append(cyl('tailWheel', (0, 5.0, 0.12), 0.11, 0.07, darkm, rot=(0, math.pi / 2, 0), verts=16))
prop = empty('prop', (0, -1.65, 1.55))
blades = [box('blade', (0, -1.65, 1.55), (0.12, 0.05, 2.0), darkm), cyl('spinner', (0, -1.68, 1.55), 0.16, 0.25, mat('spin', (0.6, 0.6, 0.62)), verts=16)]
parent(blades, prop)
# Пилот — светящийся человечек в кабине (голова и плечи видны в окне).
glowman = mat('man', emit=(0.97, 0.97, 0.96), strength=3.0)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.16, location=(0, -0.3, 2.3))
head = bpy.context.object
head.data.materials.append(glowman)
parent(parts + [prop, head], pl)
outline([p for p in parts + blades if p.name not in ('winL', 'winR', 'wind', 'wingStripe', 'finStripe')], width=0.03)
for f in range(1, FRAMES + 1):
    key(prop, f, rotation_euler=(0, f * 2.7, 0))

# Разбег: хвост на земле → хвост поднимается → отрыв на LIFT → набор высоты над камерой.
for f, x, y, z, pitch in ((1, -2.5, 78, 0, 0.17), (25, -2.5, 55, 0, 0.12), (40, -2.5, 34, 0.25, 0.0), (LIFT, -2.8, 14, 0.5, -0.05), (78, -4.5, 4, 3.4, -0.2), (FRAMES, -7.0, -3, 8.0, -0.26)):
    key(pl, f, location=(x, y, z), rotation_euler=(pitch, 0, 0.02 * math.sin(f * 0.2)))

aim = empty('aim')
for f, x, y, z in ((1, -2.5, 60, 1.6), (40, -2.5, 34, 1.9), (LIFT, -2.8, 14, 2.4), (78, -4.5, 5, 4.6), (FRAMES, -6.5, -2, 8.0)):
    key(aim, f, location=(x, y, z))
cam = camera((5.5, -15, 0.75), aim, lens=26)
cam.data.clip_end = 4000

still_or_anim(sc, out, still)
