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
    glare.threshold = 0.55
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


def outline(objs, width=0.025):
    """Белый светящийся контур по силуэту («обратная оболочка»): копия формы чуть больше, вывернутая наизнанку,
    видна только по краям. Раньше контуры рисовал Freestyle — он съедал ~3/4 времени кадра."""
    line = bpy.data.materials.get('neon-line')
    if line is None:
        line = mat('neon-line', (1, 1, 1), emit=(0.96, 0.96, 0.95), strength=2.6)
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
