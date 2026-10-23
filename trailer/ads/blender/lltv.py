"""
Ролик 41, кадры 3 и 4: тренажёр лунной посадки (рама «летающая кровать» с реактивным двигателем посередине).
LLTV_MODE=crash — 6 мая 1968 года: тренажёр кренится, пилот катапультируется, раскрывается парашют, машина
падает и взрывается (по Википедии: катапультируйся он на полсекунды позже — парашют не успел бы раскрыться).
LLTV_MODE=hover — «и продолжил тренироваться»: такой же тренажёр висит над полем на рассвете, камера облетает.
blender --background --python lltv.py -- <папка для кадров> [кадр для пробы]
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bpy  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Vector  # noqa: E402

from neon import (box, camera, cyl, dim_line, empty, haze, key, look, mat, metal, outline, parent, reset,  # noqa: E402
                  sky, still_or_anim, sun, windows)

MODE = os.environ.get('LLTV_MODE', 'crash')
FRAMES = 74
EJECT, CHUTE, HIT = 22, 32, 50
args = sys.argv[sys.argv.index('--') + 1:]
out = args[0]
still = int(args[1]) if len(args) > 1 else None

sc = reset(FRAMES, blur=True)
look(sc, 'Standard', -0.3)  # огонь в AgX выходил бледным
random.seed(68)
if MODE == 'crash':
    sky(sc, zenith=(0.03, 0.05, 0.16), horizon=(0.9, 0.42, 0.2), stars=0.4, strength=1.0)
    sun((math.radians(86), 0, math.radians(150)), strength=2.2, color=(1.0, 0.62, 0.38), angle=2)
else:
    sky(sc, zenith=(0.05, 0.12, 0.32), horizon=(1.0, 0.62, 0.36), stars=0.15, strength=1.2)
    sun((math.radians(82), 0, math.radians(-150)), strength=3.0, color=(1.0, 0.75, 0.5), angle=2)
# Дымка слабая и цвета горизонта: «туман» закрашивает и небо, а оно здесь цветное.
haze(sc, color=(0.55, 0.3, 0.22) if MODE == 'crash' else (0.75, 0.5, 0.35), start=120, depth=900, amount=0.22)

# ─── Аэродром: бетон со швами, трава, ангары с окнами, вышка, огни полосы, лесополоса ─
dl = dim_line()
concrete = mat('concrete', (0.09, 0.09, 0.1))
concrete.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.9
box('apron', (0, 20, -0.05), (160, 160, 0.1), concrete)
box('grass', (0, 0, -0.12), (3000, 3000, 0.1), mat('grass', (0.025, 0.04, 0.02)))
joint = mat('joint', (0.02, 0.02, 0.025))
for i in range(-16, 17):
    box('jx', (i * 5, 20, 0.002), (0.06, 160, 0.004), joint)
    box('jy', (0, 20 + i * 5, 0.002), (160, 0.06, 0.004), joint)
paint = mat('paint', (0.6, 0.55, 0.3), emit=(0.9, 0.8, 0.4), strength=0.25)
for i in range(30):
    box('taxi', (-8, -30 + i * 3.4, 0.004), (0.25, 1.8, 0.006), paint)
blue = mat('edgeLight', emit=(0.3, 0.5, 1.0), strength=6)
for i in range(40):
    for x in (-30, 30):
        cyl('edge', (x, -40 + i * 6, 0.2), 0.12, 0.4, blue, rot=(0, 0, 0), verts=8)
doorm = windows('door', (1.0, 0.8, 0.55), strength=0.7, axis='y', cell=(1.6, 1.4), lit=0.85, wall=(0.04, 0.04, 0.05))
win = windows('hangarWin', (1.0, 0.7, 0.4), strength=1.2, axis='y', cell=(2.2, 1.6), lit=0.55, wall=(0.03, 0.035, 0.045))
env = []
for x, w, h in ((-70, 34, 14), (-30, 30, 12), (25, 40, 15), (75, 30, 11)):
    env.append(box('hangar', (x, 160, h / 2), (w, 26, h), win))
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=w / 2, depth=26, location=(x, 160, h), rotation=(math.pi / 2, 0, 0))
    roof = bpy.context.object
    roof.scale = (1, 0.28, 1)
    roof.data.materials.append(mat('roof', (0.05, 0.055, 0.065)))
    env.append(roof)
    box('door', (x, 146.9, h * 0.4), (w * 0.7, 0.2, h * 0.75), doorm)
env.append(cyl('tower', (48, 200, 14), 2.2, 28, concrete, rot=(0, 0, 0), verts=16))
env.append(cyl('cab', (48, 200, 30), 4.2, 4, win, rot=(0, 0, 0), verts=16))
box('beacon', (48, 200, 32.5), (0.6, 0.6, 0.6), mat('beacon', emit=(1, 0.15, 0.08), strength=8))
leaf = mat('leaf', (0.015, 0.025, 0.015))
for i in range(90):
    x = -260 + i * 6 + random.uniform(-2, 2)
    r = random.uniform(3, 7)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=r, location=(x, 320 + random.uniform(-10, 10), r * 0.9))
    bpy.context.object.data.materials.append(leaf)
outline(env, width=0.12, line=dl)

# ─── Тренажёр: рама на четырёх ногах, двигатель в центре, кабина спереди, баки ─
alu = metal('alu', (0.55, 0.57, 0.6), 0.45)
alu.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = 0.3
darkm = metal('darkm', (0.06, 0.06, 0.07), 0.5)
accent = mat('accent', (0.9, 0.35, 0.08), emit=(1.0, 0.48, 0.18), strength=0.6)


def rod(name, a, b, r, m):
    a, b = Vector(a), Vector(b)
    o = cyl(name, tuple((a + b) / 2), r, (b - a).length, m, rot=(0, 0, 0), verts=10)
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(b - a)
    return o


lv = empty('lltv')
parts = []
for i in range(4):
    a = math.pi / 4 + i * math.pi / 2
    c, s = math.cos(a), math.sin(a)
    parts += [rod('leg', (1.3 * c, 1.3 * s, 2.2), (2.6 * c, 2.6 * s, 0.1), 0.07, alu),
              cyl('foot', (2.6 * c, 2.6 * s, 0.05), 0.28, 0.1, darkm, rot=(0, 0, 0), verts=16),
              rod('brace', (1.3 * c, 1.3 * s, 2.2), (1.3 * math.cos(a + math.pi / 2), 1.3 * math.sin(a + math.pi / 2), 2.2), 0.05, alu),
              rod('brace2', (1.3 * c, 1.3 * s, 3.2), (1.3 * math.cos(a + math.pi / 2), 1.3 * math.sin(a + math.pi / 2), 3.2), 0.05, alu),
              rod('post', (1.3 * c, 1.3 * s, 2.2), (1.3 * c, 1.3 * s, 3.2), 0.05, alu),
              rod('diag', (1.3 * c, 1.3 * s, 2.2), (1.3 * math.cos(a + math.pi / 2), 1.3 * math.sin(a + math.pi / 2), 3.2), 0.03, alu)]
    # Двигатели ориентации на углах.
    parts.append(box('rcs', (1.45 * c, 1.45 * s, 3.25), (0.22, 0.22, 0.22), darkm))
parts += [cyl('engine', (0, 0, 2.6), 0.42, 2.6, darkm, rot=(0, 0, 0), verts=24),
          cyl('intake', (0, 0, 3.95), 0.5, 0.25, alu, rot=(0, 0, 0), verts=24),
          box('gimbal', (0, 0, 2.7), (1.1, 1.1, 0.12), accent),
          cyl('tankL', (-0.85, 0.5, 2.7), 0.38, 1.2, alu),
          cyl('tankR', (0.85, 0.5, 2.7), 0.38, 1.2, alu)]
for x in (-0.6, 0.6):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.42, location=(x, -0.2, 3.55))
    sph = bpy.context.object
    sph.data.materials.append(alu)
    parts.append(sph)
# Кабина пилота — площадка спереди (к камере, по −Y) с приборной доской и рамой.
parts += [box('deck', (0, -1.9, 2.25), (1.3, 1.2, 0.08), darkm),
          box('panel', (0, -2.4, 2.75), (1.0, 0.08, 0.5), darkm, rot=(0.5, 0, 0)),
          box('screen', (0, -2.43, 2.78), (0.6, 0.03, 0.28), mat('scr', emit=(0.3, 0.9, 0.6), strength=1.2), rot=(0.5, 0, 0)),
          rod('frame1', (-0.6, -2.4, 2.3), (-0.6, -2.4, 3.6), 0.035, alu),
          rod('frame2', (0.6, -2.4, 2.3), (0.6, -2.4, 3.6), 0.035, alu),
          rod('frame3', (-0.6, -2.4, 3.6), (0.6, -2.4, 3.6), 0.035, alu),
          rod('frame4', (-0.6, -2.4, 3.6), (-0.6, -1.3, 3.6), 0.035, alu),
          rod('frame5', (0.6, -2.4, 3.6), (0.6, -1.3, 3.6), 0.035, alu)]
parent(parts, lv)
outline([p for p in parts if p.name not in ('screen',)], width=0.03)

# Пламя двигателя (непрозрачное светящееся ядро) и свет под машиной.
bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.15, radius2=0.36, depth=1.1, location=(0, 0, 0.75), end_fill_type='NOTHING')
flame = bpy.context.object
flame.data.materials.append(mat('flame', emit=(1.0, 0.65, 0.3), strength=8))
flame.parent = lv
bpy.ops.object.light_add(type='POINT', location=(0, 0, 0.2))
burn = bpy.context.object
burn.data.color = (1.0, 0.65, 0.35)
burn.data.energy = 1800
burn.parent = lv

# ─── Пилот — светящийся человечек из трубок (как в 2D-кадрах роликов) ─────────
glowman = mat('man', emit=(0.97, 0.97, 0.96), strength=3.2)
seat = empty('seat')
seat_parts = [box('seatBack', (0, 0.25, 0.65), (0.6, 0.08, 0.9), darkm), box('seatPan', (0, 0, 0.18), (0.6, 0.55, 0.08), darkm)]
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.17, location=(0, 0.05, 1.25))
head = bpy.context.object
head.data.materials.append(glowman)
man = [head, rod('torso', (0, 0.1, 0.25), (0, 0.08, 1.05), 0.045, glowman),
       rod('thighL', (-0.15, 0.05, 0.25), (-0.15, -0.4, 0.28), 0.04, glowman), rod('thighR', (0.15, 0.05, 0.25), (0.15, -0.4, 0.28), 0.04, glowman),
       rod('shinL', (-0.15, -0.4, 0.28), (-0.15, -0.5, -0.2), 0.04, glowman), rod('shinR', (0.15, -0.4, 0.28), (0.15, -0.5, -0.2), 0.04, glowman),
       rod('armL', (-0.22, 0.08, 0.9), (-0.25, -0.35, 0.6), 0.035, glowman), rod('armR', (0.22, 0.08, 0.9), (0.25, -0.35, 0.6), 0.035, glowman)]
parent(seat_parts + man, seat)
outline(seat_parts, width=0.02)
seat_home = Vector((0, -1.7, 2.3))

if MODE == 'hover':
    seat.parent = lv
    seat.location = seat_home
    for f in range(1, FRAMES + 1, 4):
        key(lv, f, location=(0.15 * math.sin(f * 0.11), 0.1 * math.cos(f * 0.09), 7.5 + 0.25 * math.sin(f * 0.13)),
            rotation_euler=(0.03 * math.sin(f * 0.17), 0.03 * math.cos(f * 0.13), 0.004 * f))
    # Вспышки двигателей ориентации.
    puff = mat('puff', emit=(0.85, 0.9, 1.0), strength=6)
    for i in range(4):
        a = math.pi / 4 + i * math.pi / 2
        p = box('puffBox', (1.62 * math.cos(a), 1.62 * math.sin(a), 3.25), (0.25, 0.08, 0.08), puff, rot=(0, 0, a))
        p.parent = lv
        for f in range(1, FRAMES + 1):
            key(p, f, hide_render=not ((f + i * 9) % 20 < 3))
    aim = empty('aim', (0, 0, 9.2))
    cam = camera((0, -17, 3.2), aim, lens=30)
    cam.data.clip_end = 3000
    for f in range(1, FRAMES + 1, 3):
        a = -math.pi / 2 + 0.55 * (f - 1) / FRAMES - 0.25
        key(cam, f, location=(17 * math.cos(a), 17 * math.sin(a), 3.0 + 0.6 * f / FRAMES))
else:
    # Крен нарастает, на EJECT пилот катапультируется, машина падает, на HIT — удар и взрыв.
    poses = ((1, (0, 0, 12), (0, 0, 0)), (10, (0.3, 0, 12.2), (0.12, 0.05, 0)), (EJECT, (1.2, 0, 11.6), (0.55, 0.12, 0.1)),
             (36, (2.4, 0, 7.2), (1.05, 0.25, 0.3)), (HIT, (3.5, 0, 0.6), (1.5, 0.35, 0.45)), (FRAMES, (3.7, 0, 0.4), (1.55, 0.35, 0.45)))
    for f, loc, rot in poses:
        key(lv, f, location=loc, rotation_euler=rot)
    # Кресло едет с машиной до EJECT, дальше летит вверх и в сторону, потом висит под куполом и плывёт.
    seat.parent = lv
    seat.location = seat_home
    key(seat, 1, location=seat_home)
    key(seat, EJECT - 1, location=seat_home)
    sc.frame_set(EJECT - 1)
    world0 = seat.matrix_world.copy()
    seat.parent = None
    seat.animation_data_clear()
    seat.matrix_world = world0
    p0 = world0.translation.copy()
    key(seat, 1, location=p0)
    for f, d in ((EJECT - 1, (0, 0, 0)), (EJECT + 4, (-2.0, 0.5, 2.8)), (CHUTE, (-3.8, 0.8, 3.8)), (CHUTE + 8, (-4.6, 1.0, 3.9)), (FRAMES, (-5.6, 1.2, 3.2))):
        key(seat, f, location=tuple(p0 + Vector(d)))
    key(seat, EJECT - 1, rotation_euler=world0.to_euler())
    key(seat, CHUTE, rotation_euler=(0.2, 0, 0.3))
    key(seat, FRAMES, rotation_euler=(0.05, 0, 0.1))
    # Ракета кресла.
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.05, radius2=0.25, depth=1.4, location=(0, 0.1, -0.7))
    jet = bpy.context.object
    jet.data.materials.append(mat('seatJet', emit=(1.0, 0.6, 0.25), strength=10))
    jet.parent = seat
    for f in range(1, FRAMES + 1):
        key(jet, f, hide_render=not (EJECT - 1 <= f <= EJECT + 6))
    # Парашют: купол из оранжево-белых клиньев, стропы к креслу; раскрывается за 6 кадров.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=2.8, location=(0, 0, 0))
    dome = bpy.context.object
    for v in dome.data.vertices:
        if v.co.z < 0:
            v.co.z = 0
    dome.scale = (1, 1, 0.55)
    cm = mat('canopy', (0.9, 0.4, 0.1))
    nt = cm.node_tree
    tc = nt.nodes.new('ShaderNodeTexCoord')
    gr = nt.nodes.new('ShaderNodeTexGradient')
    gr.gradient_type = 'RADIAL'
    nt.links.new(tc.outputs['Object'], gr.inputs['Vector'])
    k = nt.nodes.new('ShaderNodeMath')
    k.operation = 'MULTIPLY'
    k.inputs[1].default_value = 12
    nt.links.new(gr.outputs['Fac'], k.inputs[0])
    fr = nt.nodes.new('ShaderNodeMath')
    fr.operation = 'FRACT'
    nt.links.new(k.outputs['Value'], fr.inputs[0])
    rp = nt.nodes.new('ShaderNodeValToRGB')
    rp.color_ramp.interpolation = 'CONSTANT'
    rp.color_ramp.elements[0].color = (0.95, 0.35, 0.08, 1)
    rp.color_ramp.elements[1].position = 0.5
    rp.color_ramp.elements[1].color = (0.92, 0.9, 0.86, 1)
    nt.links.new(fr.outputs['Value'], rp.inputs['Fac'])
    b = nt.nodes['Principled BSDF']
    nt.links.new(rp.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Emission Color'].default_value = (1.0, 0.5, 0.2, 1)
    b.inputs['Emission Strength'].default_value = 0.15
    dome.data.materials.append(cm)
    bpy.ops.object.shade_smooth()
    lines = [rod('line', (2.6 * math.cos(a), 2.6 * math.sin(a), 0.2), (0, 0, -3.4), 0.012, mat('cord', emit=(0.9, 0.9, 0.85), strength=1.0))
             for a in np.linspace(0, 2 * math.pi, 9)[:-1]]
    chute = empty('chute')
    parent([dome] + lines, chute)
    outline([dome], width=0.04)
    chute.parent = seat
    chute.location = (0, 0, 4.2)
    for f in range(1, FRAMES + 1):
        t = min(1.0, max(0.0, (f - CHUTE) / 6))
        s = 0.001 if f < CHUTE else 0.25 + 0.75 * (1 - (1 - t) ** 3)
        key(chute, f, scale=(s, s, s * (1.6 - 0.6 * t)))
    # Взрыв: огненные шары, дым, обломки, вспышка; до удара их нет.
    fire = mat('fire', (0.3, 0.05, 0.0))
    nt = fire.node_tree
    n = nt.nodes.new('ShaderNodeTexNoise')
    n.inputs['Scale'].default_value = 4.5
    n.inputs['Detail'].default_value = 3
    rp = nt.nodes.new('ShaderNodeValToRGB')
    rp.color_ramp.elements[0].color = (0.35, 0.03, 0.0, 1)
    rp.color_ramp.elements[0].position = 0.35
    rp.color_ramp.elements[1].color = (1.0, 0.62, 0.12, 1)
    rp.color_ramp.elements[1].position = 0.7
    nt.links.new(n.outputs['Fac'], rp.inputs['Fac'])
    b = nt.nodes['Principled BSDF']
    nt.links.new(rp.outputs['Color'], b.inputs['Emission Color'])
    b.inputs['Emission Strength'].default_value = 2.4
    smoke = mat('smoke', (0.03, 0.03, 0.035))
    tex = bpy.data.textures.new('lumps', 'CLOUDS')
    tex.noise_scale = 0.6
    hit = Vector((3.5, 0, 0.5))
    balls = []
    for i in range(14):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1, location=hit)
        o = bpy.context.object
        d = o.modifiers.new('lumps', 'DISPLACE')
        d.texture, d.strength = tex, 0.8
        isfire = i < 8
        o.data.materials.append(fire if isfire else smoke)
        bpy.ops.object.shade_smooth()
        dirv = Vector((random.uniform(-1, 1), random.uniform(-0.6, 0.6), random.uniform(0.2, 1.2))).normalized()
        start = HIT + (0 if isfire else 3) + random.randint(0, 3)
        for f in range(1, FRAMES + 1):
            if f < start:
                key(o, f, scale=(0.001,) * 3, location=tuple(hit))
                continue
            t = (f - start) / 24
            r = (0.6 + (2.0 if isfire else 3.2) * (1 - math.exp(-3 * t))) * (0.6 + 0.6 * random.random() if f == start else 1)
            pos = hit + dirv * (2.5 + 7 * t) * min(1, t * 3) + Vector((0, 0, (2.5 if isfire else 6) * t))
            key(o, f, scale=(r, r, r * 0.9), location=tuple(pos))
        balls.append(o)
    deb = mat('debris', (0.2, 0.2, 0.22), emit=(1.0, 0.5, 0.2), strength=2.5)
    for i in range(24):
        o = box('chunk', tuple(hit), (random.uniform(0.1, 0.4), random.uniform(0.05, 0.2), random.uniform(0.05, 0.3)), deb)
        v = Vector((random.uniform(-1, 1), random.uniform(-0.7, 0.7), random.uniform(0.3, 1.5))) * random.uniform(9, 18)
        for f in range(1, FRAMES + 1):
            t = max(0, f - HIT) / 30
            key(o, f, location=tuple(hit + v * t + Vector((0, 0, -9.8 * t * t * 2))), hide_render=f < HIT,
                rotation_euler=(t * 9 * (i % 3 + 1), t * 7, t * 5))
    bpy.ops.object.light_add(type='POINT', location=tuple(hit + Vector((0, -2, 3))))
    flash = bpy.context.object
    flash.data.color = (1.0, 0.6, 0.3)
    for f in range(1, FRAMES + 1):
        flash.data.energy = 0 if f < HIT else 30000 * math.exp(-(f - HIT) / 8) + 5000
        flash.data.keyframe_insert('energy', frame=f)
    # Пламя двигателя гаснет на катапульте, двигатель уже не держит.
    for f in range(1, FRAMES + 1):
        key(flame, f, hide_render=f > EJECT + 6)
        burn.data.energy = 1800 if f <= EJECT + 6 else 0
        burn.data.keyframe_insert('energy', frame=f)
    aim = empty('aim')
    for f, z, x in ((1, 11.5, 0.3), (EJECT, 11.2, 0), (HIT, 9.6, -0.5), (FRAMES, 9.8, -0.8)):
        key(aim, f, location=(x, 0, z))
    cam = camera((-2, -30, 1.6), aim, lens=27)
    cam.data.clip_end = 3000
    for f in range(1, FRAMES + 1):
        sh = 0.35 * math.exp(-(f - HIT) / 6) if f >= HIT else 0.0
        key(cam, f, location=(-2 + sh * math.sin(f * 2.1), -30 + 1.2 * f / FRAMES, 1.6 + sh * math.cos(f * 2.7)))

still_or_anim(sc, out, still)
