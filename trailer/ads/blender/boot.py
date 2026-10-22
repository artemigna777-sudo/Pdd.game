"""
Ролик 41, итог: «Компьютер сбоил, но он посадил модуль вручную» — крупно след ботинка в лунной пыли
(рифлёная подошва, низкое солнце, резкие тени в рёбрах протектора), дальше — лунный модуль, в небе Земля.
blender --background --python boot.py -- <папка для кадров> [кадр для пробы]
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bpy  # noqa: E402
import numpy as np  # noqa: E402

from lmkit import build_lm  # noqa: E402
from neon import box, camera, craters, empty, key, look, mat, regolith, reset, sky, still_or_anim, sun, terrain  # noqa: E402

FRAMES = 64
args = sys.argv[sys.argv.index('--') + 1:]
out = args[0]
still = int(args[1]) if len(args) > 1 else None

sc = reset(FRAMES)
look(sc, 'AgX', 0.35)
sky(sc, stars=1.6)
random.seed(69)
sun((math.radians(90 - 12), 0, math.radians(-70)), strength=5.0, angle=0.4)


def print_at(x, y, cx, cy, ang, left):
    """След подошвы (33×15 см): впадина с мягким краем, поперечные рёбра протектора, валик пыли вокруг."""
    c, s = math.cos(ang), math.sin(ang)
    u = (x - cx) * c + (y - cy) * s  # вдоль следа
    v = -(x - cx) * s + (y - cy) * c  # поперёк
    half_w = 0.075 + 0.012 * np.cos(np.clip(u / 0.165, -1, 1) * math.pi) * (1 if left else 1)
    q = np.sqrt((u / 0.165) ** 4 + (v / half_w) ** 4)  # «скруглённый прямоугольник»
    inside = np.clip((1.06 - q) / 0.12, 0, 1)
    depth = -0.028 * inside
    ridge = (np.sin(u / 0.011 * math.pi) > 0.15) * 0.0065 * inside
    rim = 0.006 * np.exp(-((q - 1.1) / 0.12) ** 2)
    return depth + ridge + rim


_, base = craters(12, 70, (-60, 60, -10, 120), 0.3, 9, keep=(0, 0, 3))


def height(x, y):
    z = base(x, y) * 0.6
    # Цепочка шагов уходит вдаль (длинная ось следа — вдоль взгляда).
    z = z + print_at(x, y, 0.0, 0.0, 1.68, True) + print_at(x, y, -0.3, 0.75, 1.62, False) + print_at(x, y, 0.02, 1.5, 1.7, True)
    return z


dust = regolith('dust', 0.15, 0.12, grain=900)
terrain('near', 3.2, 640, height, dust, loc=(0, 0.6, 0))
# Даль — та же поверхность на 8 мм ниже (без ступеньки на стыке с подробной сеткой у камеры).
terrain('far', 300, 300, lambda x, y: height(x, y) - 0.008, regolith('farm', 0.13, 0.2), loc=(0, 140, 0))
box('floor', (0, 0, -0.7), (8000, 8000, 0.1), regolith('flat', 0.1, 0.1))

# Камешки вокруг следа.
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=(0, -300, 0))
pebble = bpy.context.object
pebble.data.materials.append(regolith('pebble', 0.17, 0.2, grain=300))
for _ in range(160):
    x, y = random.uniform(-1.4, 1.4), random.uniform(-0.6, 2.2)
    if abs(x) < 0.5 and -0.3 < y < 1.8:
        continue
    o = pebble.copy()
    bpy.context.collection.objects.link(o)
    s = 0.004 + 0.03 * random.random() ** 3
    o.location = (x, y, float(height(np.array([x]), np.array([y]))[0]))
    o.scale = (s, s * random.uniform(0.7, 1.2), s * 0.6)

# Модуль на заднем плане, в небе — Земля.
lm, _ = build_lm()
lm.location = (3.0, 46, float(base(np.array([3.0]), np.array([46.0]))[0]) * 0.6)
lm.rotation_euler = (0, 0, 0.5)
bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=30, location=(-95, 900, 175))
earth = bpy.context.object
bpy.ops.object.shade_smooth()
em = mat('earth', (0.02, 0.07, 0.3))
nt = em.node_tree
b = nt.nodes['Principled BSDF']
land = nt.nodes.new('ShaderNodeTexNoise')
land.inputs['Scale'].default_value = 2.2
land.inputs['Detail'].default_value = 5
lr = nt.nodes.new('ShaderNodeValToRGB')
lr.color_ramp.interpolation = 'CONSTANT'
lr.color_ramp.elements[0].color = (0.015, 0.06, 0.28, 1)
lr.color_ramp.elements[1].position = 0.56
lr.color_ramp.elements[1].color = (0.18, 0.22, 0.08, 1)
nt.links.new(land.outputs['Fac'], lr.inputs['Fac'])
cl = nt.nodes.new('ShaderNodeTexNoise')
cl.inputs['Scale'].default_value = 5.5
cl.inputs['Detail'].default_value = 4
cl.inputs['Distortion'].default_value = 2.0
cr = nt.nodes.new('ShaderNodeValToRGB')
cr.color_ramp.elements[0].position = 0.5
cr.color_ramp.elements[1].position = 0.68
nt.links.new(cl.outputs['Fac'], cr.inputs['Fac'])
mix = nt.nodes.new('ShaderNodeMixRGB')
nt.links.new(cr.outputs['Color'], mix.inputs['Fac'])
nt.links.new(lr.outputs['Color'], mix.inputs[1])
mix.inputs[2].default_value = (0.9, 0.92, 0.95, 1)
nt.links.new(mix.outputs['Color'], b.inputs['Base Color'])
b.inputs['Emission Color'].default_value = (0.25, 0.45, 1.0, 1)
lw = nt.nodes.new('ShaderNodeLayerWeight')
lw.inputs['Blend'].default_value = 0.25
k = nt.nodes.new('ShaderNodeMath')
k.operation = 'MULTIPLY'
k.inputs[1].default_value = 0.9
nt.links.new(lw.outputs['Fresnel'], k.inputs[0])
nt.links.new(k.outputs['Value'], b.inputs['Emission Strength'])
earth.data.materials.append(em)
earth.rotation_euler = (0.3, 0.2, 2.2)

# Камера: низко у следа, медленный наезд и чуть вбок; горизонт в верхней трети, след внизу.
aim = empty('aim')
key(aim, 1, location=(0.0, 1.3, 0.05))
key(aim, FRAMES, location=(0.02, 1.15, 0.03))
cam = camera((0.22, -0.95, 0.42), aim, lens=24)
cam.data.clip_end = 5000
cam.data.dof.use_dof = True
cam.data.dof.focus_object = empty('focus', (0, 0.05, 0))
cam.data.dof.aperture_fstop = 8
key(cam, 1, location=(0.22, -0.95, 0.42))
key(cam, FRAMES, location=(0.12, -0.75, 0.36))

still_or_anim(sc, out, still)
