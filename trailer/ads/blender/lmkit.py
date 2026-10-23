"""
Лунный модуль «Аполлона» в стиле роликов: посадочная ступень в золотой фольге, ноги с опорами и лестницей,
взлётная ступень с окнами, баками, антеннами и двигателями ориентации; белые неоновые контуры.
Нос — по −Y. Используется в moon.py (посадка) и boot.py (след на заднем плане).
"""
import math

import bpy
import numpy as np
from mathutils import Vector

from neon import box, cyl, empty, foil, mat, metal, outline, parent


def build_lm(name='lm'):
    """Собрать модуль; возвращает (пустышка-родитель, детали)."""
    gold = foil()
    silver = metal('ascent', (0.5, 0.51, 0.54), 0.5)
    silver.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = 0.0  # матовая краска: в космосе металл отражал бы чёрное
    darkm = metal('darkm', (0.05, 0.05, 0.06), 0.5)
    glass = mat('glass', (0.01, 0.015, 0.02), emit=(0.25, 0.6, 0.75), strength=0.6)
    def rod(name, a, b, r, m):
        a, b = np.array(a, float), np.array(b, float)
        d = b - a
        ln = float(np.linalg.norm(d))
        o = cyl(name, tuple((a + b) / 2), r, ln, m, rot=(0, 0, 0), verts=12)
        o.rotation_mode = 'QUATERNION'
        o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(Vector(tuple(d)))
        return o


    lm = empty(name)
    parts = []
    ds = cyl('descent', (0, 0, 2.35), 2.15, 1.65, gold, rot=(0, 0, math.pi / 8), verts=8)
    parts.append(ds)
    parts.append(cyl('dsTop', (0, 0, 3.2), 2.05, 0.06, darkm, rot=(0, 0, math.pi / 8), verts=8))
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.78, radius2=0.36, depth=1.0, location=(0, 0, 1.05))
    bell = bpy.context.object
    bell.data.materials.append(darkm)
    parts.append(bell)
    for i in range(4):
        a = i * math.pi / 2 - math.pi / 2  # первая нога — к камере (−Y)
        c, s = math.cos(a), math.sin(a)
        pad = cyl('pad', (4.3 * c, 4.3 * s, 0.09), 0.46, 0.18, silver, rot=(0, 0, 0), verts=28)
        parts += [pad,
                  rod('strut', (1.95 * c, 1.95 * s, 2.7), (4.25 * c, 4.25 * s, 0.3), 0.09, gold),
                  rod('sec1', (1.9 * c - 0.9 * s, 1.9 * s + 0.9 * c, 1.6), (3.3 * c, 3.3 * s, 1.15), 0.05, silver),
                  rod('sec2', (1.9 * c + 0.9 * s, 1.9 * s - 0.9 * c, 1.6), (3.3 * c, 3.3 * s, 1.15), 0.05, silver),
                  rod('probe', (4.3 * c, 4.3 * s, 0.05), (4.6 * c, 4.6 * s, -0.25), 0.02, silver)]
    # Лестница на передней ноге.
    for j in range(8):
        t = 0.12 + j * 0.1
        z = 2.7 + (0.3 - 2.7) * t
        r0 = 1.95 + (4.25 - 1.95) * t
        parts.append(box('rung', (0, -r0, z), (0.5, 0.04, 0.04), silver))
    # Взлётная ступень: кабина, окна, люк, баки, антенны, двигатели ориентации.
    parts += [
        box('cabin', (0, 0, 4.35), (2.5, 2.3, 2.1), silver, bevel=0.12),
        box('cabFront', (0, -1.25, 4.6), (1.7, 0.3, 1.2), silver, bevel=0.08),
        box('winL', (-0.45, -1.42, 4.95), (0.55, 0.04, 0.45), glass, rot=(0.25, 0, 0.35)),
        box('winR', (0.45, -1.42, 4.95), (0.55, 0.04, 0.45), glass, rot=(0.25, 0, -0.35)),
        box('hatch', (0, -1.42, 3.95), (0.8, 0.05, 0.75), darkm),
        box('panelL', (-1.27, 0, 4.4), (0.04, 1.6, 1.4), darkm),
        box('panelR', (1.27, 0, 4.4), (0.04, 1.6, 1.4), darkm),
        cyl('tankL', (-1.5, 0.45, 4.0), 0.55, 1.3, silver),
        cyl('tankR', (1.5, 0.45, 4.0), 0.55, 1.3, silver),
        cyl('dock', (0, 0.2, 5.6), 0.55, 0.45, silver, rot=(0, 0, 0), verts=24),
        rod('mast', (-0.9, 0.6, 5.3), (-1.2, 0.8, 6.4), 0.04, silver),
        rod('mast2', (0.9, 0.5, 5.3), (1.1, 0.4, 6.0), 0.04, silver),
    ]
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.5, radius2=0.08, depth=0.22, location=(-1.2, 0.8, 6.5), rotation=(0.5, 0, 0.6))
    dish = bpy.context.object
    dish.data.materials.append(silver)
    parts.append(dish)
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.32, radius2=0.05, depth=0.14, location=(1.1, 0.4, 6.05), rotation=(-0.4, 0.3, 0))
    dish2 = bpy.context.object
    dish2.data.materials.append(silver)
    parts.append(dish2)
    for x in (-1.45, 1.45):
        for y in (-1.3, 1.3):
            parts.append(box('rcs', (x, y, 5.0), (0.28, 0.28, 0.28), darkm))
            for dx, dy, dz in ((0.25 * (1 if x > 0 else -1), 0, 0), (0, 0, 0.25), (0, 0, -0.25)):
                parts.append(cyl('jet', (x + dx, y + dy, 5.0 + dz), 0.06, 0.18, darkm, rot=(0, math.pi / 2, 0) if dx else (0, 0, 0), verts=10))
    parent(parts, lm)
    outline([p for p in parts if p.type == 'MESH' and not p.name.startswith(('win', 'rung', 'jet', 'probe'))], width=0.035)


    return lm, parts
