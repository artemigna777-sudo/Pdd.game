"""
Общее для 3D-кадров роликов в стиле «светящихся человечков»: чёрный мир, тёмные формы, белые контуры
(Freestyle) с мягким свечением, оранжевые акценты. Запуск — через render3d.sh (Blender без окна, EEVEE).
"""
import math

import bpy

ACCENT = (1.0, 0.478, 0.18)  # #ff7a2e
# Рендер в 720×1280 (на телефоне без видеокарты так в разы быстрее), ffmpeg увеличивает до 1080×1920.
W, H = 720, 1280


def reset(frames, fps=30):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE_NEXT'
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.fps = fps
    sc.frame_start, sc.frame_end = 1, frames
    sc.render.film_transparent = False
    sc.world = bpy.data.worlds.new('night')
    sc.world.use_nodes = True
    sc.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.004, 0.006, 0.012, 1)
    sc.eevee.taa_render_samples = 6
    sc.view_settings.view_transform = 'Standard'
    # Контуры.
    sc.render.use_freestyle = True
    sc.render.line_thickness_mode = 'ABSOLUTE'
    sc.render.line_thickness = 1.7
    fs = bpy.context.view_layer.freestyle_settings
    ls = fs.linesets[0] if len(fs.linesets) else fs.linesets.new('neon')
    if ls.linestyle is None:
        ls.linestyle = bpy.data.linestyles.new('neon')
    ls.select_by_visibility = True
    # Контуры — только у объектов из коллекции «lines» (машины, знаки); дорога светится сама — так в разы быстрее.
    lines = bpy.data.collections.new('lines')
    sc.collection.children.link(lines)
    ls.select_by_collection = True
    ls.collection = lines
    ls.select_silhouette = ls.select_border = ls.select_crease = True
    ls.select_external_contour = True
    ls.linestyle.color = (0.96, 0.96, 0.95)
    ls.linestyle.thickness = 1.7
    bpy.context.view_layer.freestyle_settings.crease_angle = math.radians(140)
    # Свечение контуров и акцентов.
    sc.use_nodes = True
    nt = sc.node_tree
    rl, comp = nt.nodes['Render Layers'], nt.nodes['Composite']
    glare = nt.nodes.new('CompositorNodeGlare')
    glare.glare_type = 'FOG_GLOW'
    glare.quality = 'MEDIUM'
    glare.threshold = 0.55
    glare.size = 8
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


def outline(objs):
    """Перенести объекты в коллекцию «lines» — у них будут контуры."""
    lines = bpy.data.collections['lines']
    for o in objs:
        for c in list(o.users_collection):
            c.objects.unlink(o)
        lines.objects.link(o)
