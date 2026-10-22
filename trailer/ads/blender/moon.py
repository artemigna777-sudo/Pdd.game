"""
Ролик 41, кадр 1: лунный модуль садится на Луну (низкое солнце ~11°, как при посадке «Аполлона-11»).
Модуль снижается, смещается в сторону (ручное управление — искал ровное место), струя двигателя сдувает
пыль кольцом, на касании двигатель гаснет. Небо чёрное со звёздами, справа вверху — Земля.
blender --background --python moon.py -- <папка для кадров> [кадр для пробы]
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

FRAMES = 99
TOUCH = 86  # кадр касания
args = sys.argv[sys.argv.index('--') + 1:]
out = args[0]
still = int(args[1]) if len(args) > 1 else None

sc = reset(FRAMES, blur=True)
look(sc, 'AgX', 0.3)
sky(sc, stars=1.6)
random.seed(41)

# ─── Грунт: кратеры, камни, дальняя равнина ───────────────────────────────────
ground = regolith()
_, height = craters(7, 140, (-150, 150, -40, 260), 0.6, 26, keep=(0, 0, 7))
terrain('moon', 320, 420, height, ground, loc=(0, 110, 0))
box('far', (0, 0, -0.6), (6000, 6000, 0.1), regolith('far', 0.11, 0.1))
# Горы на горизонте: валы больших кратеров, освещённые низким солнцем.
hills = [(random.uniform(-900, 900), random.uniform(1100, 1700), random.uniform(40, 140), random.uniform(18, 70)) for _ in range(46)]
terrain('hills', 3000, 200, lambda x, y: sum(hh * np.exp(-((x - hx) ** 2 + (y - hy) ** 2) / (2 * w * w)) for hx, hy, w, hh in hills) - 0.5,
        regolith('hillm', 0.085, 0.2), loc=(0, 1300, 0))

protos = []
for k in range(4):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=(0, -500, 0))
    r = bpy.context.object
    for v in r.data.vertices:
        v.co *= 0.75 + 0.5 * random.random()
    r.scale = (1, 0.8 + 0.4 * random.random(), 0.55 + 0.3 * random.random())
    r.data.materials.append(regolith(f'rock{k}', 0.16, 0.25))
    bpy.ops.object.shade_smooth()
    protos.append(r)
for _ in range(420):
    x, y = random.uniform(-40, 40), random.uniform(-14, 120)
    if math.hypot(x, y) < 6:
        continue
    s = 0.05 + 0.6 * random.random() ** 3
    o = random.choice(protos).copy()
    bpy.context.collection.objects.link(o)
    o.location = (x, y, float(height(np.array([x]), np.array([y]))[0]) - 0.25 * s)
    o.rotation_euler = (0, 0, random.uniform(0, 6.3))
    o.scale = tuple(c * s for c in o.scale)

# ─── Солнце и Земля ───────────────────────────────────────────────────────────
sun((math.radians(90 - 11), 0, math.radians(-35)), strength=4.5)
bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=34, location=(-60, 900, 380))
earth = bpy.context.object
bpy.ops.object.shade_smooth()
em = mat('earth', (0.02, 0.07, 0.3))
nt = em.node_tree
b = nt.nodes['Principled BSDF']
b.inputs['Roughness'].default_value = 0.6
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
nt.links.new(k.outputs['Value'], b.inputs['Emission Strength'])  # атмосфера светится по краю
earth.data.materials.append(em)
earth.rotation_euler = (0.3, 0.2, 1.0)

# ─── Лунный модуль (нос — к камере, по −Y), см. lmkit.py ─────────────────────
lm, parts = build_lm()
darkm = bpy.data.materials['darkm']

# Струя двигателя (полупрозрачное свечение) и свет снизу: подсвечивает пыль и грунт под модулем.
# Полупрозрачная струя на процессоре втрое замедляла кадр — вместо неё непрозрачное светящееся ядро у сопла
# (свечение композитора даёт ореол) и свет снизу.
bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.62, radius2=0.34, depth=0.32, location=(0, 0, 0.42), end_fill_type='NOTHING')
plume = bpy.context.object
plume.data.materials.append(mat('core', emit=(1.0, 0.8, 0.55), strength=7))
plume.parent = lm
bpy.ops.object.light_add(type='POINT', location=(0, 0, -0.6))
burn = bpy.context.object
burn.data.color = (1.0, 0.7, 0.4)
burn.data.shadow_soft_size = 0.8
burn.parent = lm

# ─── Движение: снижение с замедлением, сдвиг в сторону (ручное управление), касание ─
for f, x, z, yaw in ((1, -3.6, 13.0, 0.18), (35, -3.8, 7.5, 0.1), (60, -1.2, 3.0, 0.03), (78, -0.2, 0.7, 0.0), (TOUCH, 0.0, 0.0, 0.0), (FRAMES, 0.0, 0.0, 0.0)):
    key(lm, f, location=(x, 0, z), rotation_euler=(0.02 * math.sin(f * 0.4), 0.025 * math.cos(f * 0.31), yaw))
for f in range(1, FRAMES + 1):
    on = f <= TOUCH + 1
    burn.data.energy = (2200 if on else 0) * (0.85 + 0.15 * random.random())
    burn.data.keyframe_insert('energy', frame=f)
    key(plume, f, hide_render=not on)

# Пыль: из кольца под двигателем частицы летят вдоль грунта во все стороны (с кадра, когда модуль низко).
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=1.2, depth=0.15, location=(0, 0, 0.12), end_fill_type='NOTHING')
emit = bpy.context.object
emit.show_instancer_for_render = False
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -500, 0))
grain = bpy.context.object
grain.scale = (0.3, 0.008, 0.008)
grain.data.materials.append(mat('dust', (0.5, 0.45, 0.4), emit=(0.85, 0.72, 0.55), strength=0.18))
ps = emit.modifiers.new('dust', 'PARTICLE_SYSTEM').particle_system.settings
ps.count = 4500
ps.frame_start, ps.frame_end = 38, TOUCH + 2
ps.lifetime, ps.lifetime_random = 22, 0.5
ps.normal_factor, ps.factor_random = 11, 4
ps.effector_weights.gravity = 0.0
ps.render_type = 'OBJECT'
ps.instance_object = grain
ps.particle_size, ps.size_random = 1.0, 0.7
ps.use_rotations = True
ps.rotation_mode = 'VEL'
ps.use_dynamic_rotation = True

# ─── Камера: низко над грунтом, следит за модулем, лёгкий наезд ──────────────
aim = empty('aim')
for f, x, z in ((1, -2.6, 10.5), (35, -2.0, 6.5), (60, -0.6, 4.2), (TOUCH, -0.2, 3.2), (FRAMES, -0.2, 3.0)):
    key(aim, f, location=(x, 0, z))
cam = camera((3.0, -21.0, 2.2), aim, lens=26)
cam.data.clip_end = 8000
for f, y in ((1, -21.0), (FRAMES, -18.5)):
    key(cam, f, location=(3.0 + 0.04 * math.sin(f), y, 2.2))

still_or_anim(sc, out, still)
