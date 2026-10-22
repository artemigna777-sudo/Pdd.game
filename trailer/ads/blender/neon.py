"""
Общее для 3D-кадров роликов в стиле «светящихся человечков»: чёрный мир, тёмные формы, белые контуры
(обратная оболочка) с мягким свечением, оранжевые акценты. Запуск — через render3d.sh (Blender без окна, EEVEE).
"""
import math
import os

import bpy

ACCENT = (1.0, 0.478, 0.18)  # #ff7a2e
# Сразу 1080×1920: при рендере в 720×1280 и увеличении кадр выходил мыльным и зернистым.
W, H = 1080, 1920


def reset(frames, fps=30, reflections=False, blur=False):
    """Пустая сцена в стиле роликов. NEON_DRAFT=1 — черновик: 540×960 и мало сэмплов, чтобы быстро проверить
    движение и ракурс. `reflections` — отражения (мокрый асфальт), `blur` — размытие в движении."""
    draft = os.environ.get('NEON_DRAFT') == '1'
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE_NEXT'
    sc.render.resolution_x, sc.render.resolution_y = (W // 2, H // 2) if draft else (W, H)
    sc.render.fps = fps
    sc.frame_start, sc.frame_end = 1, frames
    sc.render.film_transparent = False
    sc.world = bpy.data.worlds.new('night')
    sc.world.use_nodes = True
    sc.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.004, 0.006, 0.012, 1)
    sc.eevee.taa_render_samples = int(os.environ.get('NEON_SAMPLES') or (4 if draft else 12))
    sc.view_settings.view_transform = 'Standard'
    if reflections:
        sc.eevee.use_raytracing = True
        sc.eevee.ray_tracing_method = 'SCREEN'
        sc.eevee.ray_tracing_options.resolution_scale = '1'
    if blur:
        sc.render.use_motion_blur = True
        sc.render.motion_blur_shutter = 0.3
    # Свечение контуров и акцентов.
    sc.use_nodes = True
    nt = sc.node_tree
    rl, comp = nt.nodes['Render Layers'], nt.nodes['Composite']
    glare = nt.nodes.new('CompositorNodeGlare')
    glare.glare_type = 'FOG_GLOW'
    glare.quality = 'MEDIUM' if draft else 'HIGH'
    # Порог выше: светятся только контуры и акценты, а тусклые огни фона — нет (иначе сливаются с контурами).
    glare.threshold = 0.8
    glare.size = 8 if draft else 9
    if reflections:
        # Отражения при малом числе сэмплов шумят — шумоподавление (OIDN) до свечения.
        dn = nt.nodes.new('CompositorNodeDenoise')
        dn.prefilter = 'FAST'
        nt.links.new(rl.outputs['Image'], dn.inputs['Image'])
        nt.links.new(dn.outputs['Image'], glare.inputs['Image'])
    else:
        nt.links.new(rl.outputs['Image'], glare.inputs['Image'])
    nt.links.new(glare.outputs['Image'], comp.inputs['Image'])
    return sc


def mat(name, color=(0.012, 0.014, 0.02), emit=None, strength=6.0):
    """Тёмный матовый материал; `emit` — светящийся цвет (акценты)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = 0.8
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = strength
    return m


def box(name, loc, size, material, rot=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        mod = o.modifiers.new('bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
    o.data.materials.append(material)
    return o


def cyl(name, loc, r, depth, material, rot=(math.pi / 2, 0, 0), verts=40):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(material)
    return o


def parent(children, to):
    for c in children:
        c.parent = to
        c.matrix_parent_inverse = to.matrix_world.inverted()


def empty(name, loc=(0, 0, 0)):
    bpy.ops.object.empty_add(location=loc)
    o = bpy.context.object
    o.name = name
    return o


def camera(loc, target=None, lens=35):
    bpy.ops.object.camera_add(location=loc)
    cam = bpy.context.object
    cam.data.lens = lens
    cam.data.sensor_fit = 'VERTICAL'
    bpy.context.scene.camera = cam
    if target is not None:
        t = cam.constraints.new('TRACK_TO')
        t.target = target
        t.track_axis = 'TRACK_NEGATIVE_Z'
        t.up_axis = 'UP_Y'
    return cam


def key(obj, frame, **props):
    for k, v in props.items():
        setattr(obj, k, v)
        obj.keyframe_insert(data_path=k, frame=frame)


def linear(obj):
    if obj.animation_data and obj.animation_data.action:
        for fc in obj.animation_data.action.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = 'LINEAR'


def outline(objs, width=0.025, line=None):
    """Белый светящийся контур по силуэту («обратная оболочка»): копия формы чуть больше, вывернутая наизнанку,
    видна только по краям. Раньше контуры рисовал Freestyle — он съедал ~3/4 времени кадра.
    `line` — свой материал контура (например, `dim_line()` для фона)."""
    if line is None:
        line = bpy.data.materials.get('neon-line')
    if line is None:
        line = mat('neon-line', (1, 1, 1), emit=(0.97, 0.97, 0.96), strength=3.8)
        line.use_backface_culling = True
    for o in objs:
        if o.type != 'MESH':
            continue
        o.data.materials.append(line)
        m = o.modifiers.new('neon-line', 'SOLIDIFY')
        m.thickness = width
        m.offset = 1
        m.use_even_offset = True
        m.use_flip_normals = True
        m.use_rim = False
        m.material_offset = len(o.data.materials) - 1


def wet(name, color=(0.006, 0.007, 0.01)):
    """Мокрый асфальт: лужи блестят и отражают огни (нужен reset(..., reflections=True))."""
    m = mat(name, color)
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 0.35
    noise.inputs['Detail'].default_value = 4
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position, ramp.color_ramp.elements[0].color = 0.42, (0.03, 0.03, 0.03, 1)
    ramp.color_ramp.elements[1].position, ramp.color_ramp.elements[1].color = 0.62, (0.4, 0.4, 0.4, 1)
    nt.links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], b.inputs['Roughness'])
    b.inputs['Specular IOR Level'].default_value = 0.8
    return m


def smooth(objs, levels=2):
    """Сгладить формы (кузов болида и т. п.) — до контуров, чтобы контур шёл по гладкому силуэту."""
    for o in objs:
        o.modifiers.new('smooth', 'SUBSURF').levels = levels
        o.modifiers['smooth'].render_levels = levels
        for p in o.data.polygons:
            p.use_smooth = True


def dim_line():
    """Контур фона: тусклый и холодный (сине-серый), чтобы белые контуры героя не сливались с окружением."""
    line = bpy.data.materials.get('dim-line')
    if line is None:
        line = mat('dim-line', (0.1, 0.12, 0.16), emit=(0.36, 0.48, 0.7), strength=0.55)
        line.use_backface_culling = True
    return line


def windows(name, color=(1.0, 0.62, 0.32), strength=0.5, axis='y', cell=(1.6, 1.2), lit=0.35, wall=(0.006, 0.008, 0.013)):
    """Тёмный фасад со светящимися окнами (часть окон горит). `axis` — куда смотрит фасад: 'y' (окна по x и z)
    или 'x' (по y и z). `cell` — шаг окон в метрах, `lit` — доля горящих окон."""
    m = mat(name, wall)
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    comb = nt.nodes.new('ShaderNodeCombineXYZ')
    nt.links.new(tc.outputs['Object'], sep.inputs['Vector'])
    nt.links.new(sep.outputs['X' if axis == 'y' else 'Y'], comb.inputs['X'])
    nt.links.new(sep.outputs['Z'], comb.inputs['Y'])
    br = nt.nodes.new('ShaderNodeTexBrick')
    br.offset = 0.0
    br.inputs['Color1'].default_value = (1, 1, 1, 1)
    br.inputs['Color2'].default_value = (0, 0, 0, 1)
    br.inputs['Scale'].default_value = 1.0
    br.inputs['Mortar Size'].default_value = min(cell) * 0.32
    br.inputs['Brick Width'].default_value = cell[0]
    br.inputs['Row Height'].default_value = cell[1]
    nt.links.new(comb.outputs['Vector'], br.inputs['Vector'])
    bw = nt.nodes.new('ShaderNodeRGBToBW')
    nt.links.new(br.outputs['Color'], bw.inputs['Color'])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    ramp.color_ramp.elements[1].position = 1 - lit
    nt.links.new(bw.outputs['Val'], ramp.inputs['Fac'])
    inv = nt.nodes.new('ShaderNodeMath')
    inv.operation = 'SUBTRACT'
    inv.inputs[0].default_value = 1.0
    nt.links.new(br.outputs['Fac'], inv.inputs[1])
    mul = nt.nodes.new('ShaderNodeMath')
    mul.operation = 'MULTIPLY'
    nt.links.new(ramp.outputs['Color'], mul.inputs[0])
    nt.links.new(inv.outputs['Value'], mul.inputs[1])
    k = nt.nodes.new('ShaderNodeMath')
    k.operation = 'MULTIPLY'
    k.inputs[1].default_value = strength
    nt.links.new(mul.outputs['Value'], k.inputs[0])
    b.inputs['Emission Color'].default_value = (*color, 1)
    nt.links.new(k.outputs['Value'], b.inputs['Emission Strength'])
    return m


def stripes(name, colors, strength=0.7, axis='y', period=1.4):
    """Светящийся щит без надписей и марок: косые полосы двух цветов на тёмном."""
    m = mat(name)
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Object'], sep.inputs['Vector'])
    add = nt.nodes.new('ShaderNodeMath')
    add.operation = 'ADD'
    nt.links.new(sep.outputs['X' if axis == 'y' else 'Y'], add.inputs[0])
    nt.links.new(sep.outputs['Z'], add.inputs[1])
    div = nt.nodes.new('ShaderNodeMath')
    div.operation = 'DIVIDE'
    div.inputs[1].default_value = period
    nt.links.new(add.outputs['Value'], div.inputs[0])
    fr = nt.nodes.new('ShaderNodeMath')
    fr.operation = 'FRACT'
    nt.links.new(div.outputs['Value'], fr.inputs[0])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    e = ramp.color_ramp.elements
    e[0].position, e[0].color = 0.0, (*colors[0], 1)
    e[1].position, e[1].color = 0.45, (0.0, 0.0, 0.0, 1)
    e3 = e.new(0.6)
    e3.color = (*colors[1], 1)
    nt.links.new(fr.outputs['Value'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], b.inputs['Emission Color'])
    b.inputs['Emission Strength'].default_value = strength
    return m


def haze(sc, color=(0.022, 0.032, 0.06), start=15.0, depth=220.0, amount=0.85):
    """Дымка для глубины: даль уходит в тёмно-синий, огни вдали тускнеют (проход «туман», до свечения)."""
    sc.view_layers[0].use_pass_mist = True
    ms = sc.world.mist_settings
    ms.start, ms.depth, ms.falloff = start, depth, 'QUADRATIC'
    nt = sc.node_tree
    glare = next(n for n in nt.nodes if n.bl_idname == 'CompositorNodeGlare')
    src = glare.inputs['Image'].links[0].from_socket
    rl = nt.nodes['Render Layers']
    k = nt.nodes.new('CompositorNodeMath')
    k.operation = 'MULTIPLY'
    k.inputs[1].default_value = amount
    nt.links.new(rl.outputs['Mist'], k.inputs[0])
    mix = nt.nodes.new('CompositorNodeMixRGB')
    mix.inputs[2].default_value = (*color, 1)
    nt.links.new(k.outputs['Value'], mix.inputs['Fac'])
    nt.links.new(src, mix.inputs[1])
    nt.links.new(mix.outputs['Image'], glare.inputs['Image'])
