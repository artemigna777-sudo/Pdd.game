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
    # Сэмплы: чем больше, тем меньше шума в отражениях, размытии и боке (32 — чисто, 12 — заметное «зерно»).
    sc.eevee.taa_render_samples = int(os.environ.get('NEON_SAMPLES') or (4 if draft else 32))
    sc.render.filter_size = 1.15  # чуть резче стандартных 1,5 px
    sc.view_settings.view_transform = 'Standard'
    if reflections:
        sc.eevee.use_raytracing = True
        sc.eevee.ray_tracing_method = 'SCREEN'
        rt = sc.eevee.ray_tracing_options
        rt.resolution_scale = '1'
        rt.screen_trace_quality = 1.0
        rt.trace_max_roughness = 0.45
        rt.use_denoise = rt.denoise_spatial = rt.denoise_temporal = rt.denoise_bilateral = True
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
    # Лужи — почти зеркальные (чёткие отражения), сухой асфальт — матовее; переход резкий, без «мыла».
    ramp.color_ramp.elements[0].position, ramp.color_ramp.elements[0].color = 0.46, (0.015, 0.015, 0.015, 1)
    ramp.color_ramp.elements[1].position, ramp.color_ramp.elements[1].color = 0.56, (0.32, 0.32, 0.32, 1)
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


# ─── Освещённые сцены (ролик 41): небо, звёзды, рельеф, солнце ────────────────

def look(sc, transform='AgX', exposure=0.0):
    """Сцены с настоящим светом мягче держат яркие блики в AgX (неон в Standard выгорал бы в белое пятно)."""
    sc.view_settings.view_transform = transform
    sc.view_settings.exposure = exposure


def sky(sc, zenith=(0.0, 0.0, 0.0), horizon=(0.0, 0.0, 0.0), stars=0.0, strength=1.0):
    """Небо: градиент от горизонта к зениту и звёзды (точки Вороного по направлению взгляда)."""
    nt = sc.world.node_tree
    bg = nt.nodes['Background']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Generated'], sep.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    e = ramp.color_ramp.elements
    e[0].position, e[0].color = 0.0, (*horizon, 1)
    e[1].position, e[1].color = 0.45, (*zenith, 1)
    mp = nt.nodes.new('ShaderNodeMapRange')
    mp.inputs['From Min'].default_value = 0.0
    mp.inputs['From Max'].default_value = 1.0
    nt.links.new(sep.outputs['Z'], mp.inputs['Value'])
    nt.links.new(mp.outputs['Result'], ramp.inputs['Fac'])
    col = ramp.outputs['Color']
    if stars:
        vor = nt.nodes.new('ShaderNodeTexVoronoi')
        vor.inputs['Scale'].default_value = 260
        nt.links.new(tc.outputs['Generated'], vor.inputs['Vector'])
        lt = nt.nodes.new('ShaderNodeMath')
        lt.operation = 'LESS_THAN'
        lt.inputs[1].default_value = 0.045
        nt.links.new(vor.outputs['Distance'], lt.inputs[0])
        br = nt.nodes.new('ShaderNodeMath')
        br.operation = 'MULTIPLY'
        nt.links.new(lt.outputs['Value'], br.inputs[0])
        nt.links.new(vor.outputs['Color'], br.inputs[1])
        k = nt.nodes.new('ShaderNodeMath')
        k.operation = 'MULTIPLY'
        k.inputs[1].default_value = stars
        nt.links.new(br.outputs['Value'], k.inputs[0])
        add = nt.nodes.new('ShaderNodeMixRGB')
        add.blend_type = 'ADD'
        add.inputs['Fac'].default_value = 1.0
        nt.links.new(col, add.inputs[1])
        nt.links.new(k.outputs['Value'], add.inputs[2])
        col = add.outputs['Color']
    nt.links.new(col, bg.inputs['Color'])
    bg.inputs['Strength'].default_value = strength


def sun(rot, strength=4.0, color=(1, 0.98, 0.94), angle=0.6):
    """Солнце: rot — (наклон, 0, азимут) в радианах; angle — размытие тени в градусах."""
    bpy.ops.object.light_add(type='SUN', rotation=rot)
    s = bpy.context.object
    s.data.energy = strength
    s.data.color = color
    s.data.angle = math.radians(angle)
    s.data.shadow_maximum_resolution = 0.01  # тени чуть грубее: на процессоре самые мелкие — самые дорогие
    return s


def terrain(name, size, res, height, material, loc=(0, 0, 0)):
    """Рельеф: сетка res×res на квадрате size; height(x, y) получает массивы numpy (мировые координаты)."""
    import numpy as np
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=res, y_subdivisions=res, size=size, location=loc)
    o = bpy.context.object
    o.name = name
    me = o.data
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    co[:, 2] = height(co[:, 0] + loc[0], co[:, 1] + loc[1])
    me.vertices.foreach_set('co', co.ravel())
    me.update()
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    me.materials.append(material)
    return o


def craters(seed, n, area, rmin, rmax, keep=None):
    """Кратеры: список (x, y, радиус, глубина) и функция высоты (numpy): чаша, вал вокруг и пологие волны.
    keep — (x, y, радиус): ровная площадка без кратеров (место посадки, след)."""
    import random as _r
    import numpy as np
    rnd = _r.Random(seed)
    cs = []
    while len(cs) < n:
        r = rmin * (rmax / rmin) ** (rnd.random() ** 2.4)
        x, y = rnd.uniform(area[0], area[1]), rnd.uniform(area[2], area[3])
        if keep and ((x - keep[0]) ** 2 + (y - keep[1]) ** 2) ** 0.5 < keep[2] + 2.2 * r:
            continue
        cs.append((x, y, r, r * rnd.uniform(0.12, 0.2)))

    def h(x, y):
        z = 0.22 * np.sin(x * 0.13 + 1.0) * np.cos(y * 0.11) + 0.12 * np.sin(x * 0.37 + y * 0.29) + 0.05 * np.sin(x * 1.3) * np.sin(y * 1.1)
        for cx, cy, r, d in cs:
            q = np.hypot(x - cx, y - cy) / r
            z = z - np.where(q < 1.0, d * (1 - q * q), 0.0) + d * 0.35 * np.exp(-((q - 1.0) / 0.28) ** 2)
        return z
    return cs, h


def regolith(name='regolith', base=0.13, grit=0.25, grain=60):
    """Лунный грунт: серый, матовый, с пятнами и мелкой «крупой» (рельеф только у матового грунта — без бликов)."""
    m = mat(name, (base, base, base * 0.97))
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = 1.0
    b.inputs['Specular IOR Level'].default_value = 0.1
    n1 = nt.nodes.new('ShaderNodeTexNoise')
    n1.inputs['Scale'].default_value = 0.6
    n1.inputs['Detail'].default_value = 3  # больше октав шума на процессоре дорого, а на глаз не видно
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (base * 0.6, base * 0.6, base * 0.6, 1)
    ramp.color_ramp.elements[1].color = (base * 1.35, base * 1.33, base * 1.3, 1)
    nt.links.new(n1.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    n2 = nt.nodes.new('ShaderNodeTexNoise')
    n2.inputs['Scale'].default_value = grain  # для крупного плана (след) — мельче
    n2.inputs['Detail'].default_value = 1
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = grit
    nt.links.new(n2.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def foil(name='foil', color=(1.0, 0.6, 0.18)):
    """Мятая золотая фольга (оранжевый акцент стиля): металл с крупным рельефом — блики дробятся."""
    m = mat(name, color)
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    # Полуметалл: в космосе чистый металл отражает чёрное небо и выглядит тёмным. Лёгкое свечение — акцент стиля.
    b.inputs['Metallic'].default_value = 0.55
    b.inputs['Roughness'].default_value = 0.38
    b.inputs['Emission Color'].default_value = (*color, 1)
    b.inputs['Emission Strength'].default_value = 0.12
    n = nt.nodes.new('ShaderNodeTexNoise')
    n.inputs['Scale'].default_value = 7
    n.inputs['Detail'].default_value = 3
    n.inputs['Distortion'].default_value = 1.5
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.55
    nt.links.new(n.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def metal(name, color=(0.5, 0.52, 0.55), rough=0.35):
    m = mat(name, color)
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Metallic'].default_value = 1.0
    b.inputs['Roughness'].default_value = rough
    return m


def glow_cone(name, loc, r1, r2, depth, color, strength=2.0, alpha=0.35, rot=(0, 0, 0)):
    """Полупрозрачное свечение (струя двигателя): излучение, смешанное с прозрачностью."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes['Principled BSDF'])
    out = nt.nodes['Material Output']
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (*color, 1)
    em.inputs['Strength'].default_value = strength
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    lw = nt.nodes.new('ShaderNodeLayerWeight')
    lw.inputs['Blend'].default_value = 0.6
    inv = nt.nodes.new('ShaderNodeMath')
    inv.operation = 'MULTIPLY_ADD'
    inv.inputs[1].default_value = -alpha
    inv.inputs[2].default_value = alpha
    nt.links.new(lw.outputs['Facing'], inv.inputs[0])
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(inv.outputs['Value'], mix.inputs['Fac'])
    nt.links.new(tr.outputs['BSDF'], mix.inputs[1])
    nt.links.new(em.outputs['Emission'], mix.inputs[2])
    nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])
    m.surface_render_method = 'DITHERED'  # «смешивание» (BLENDED) на процессоре втрое медленнее
    bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot, end_fill_type='NOTHING')
    o = bpy.context.object
    o.name = name
    o.data.materials.append(m)
    return o


def still_or_anim(sc, out, still):
    """Кадр для пробы (по порядку от первого кадра — частицам нужна история) или вся анимация в PNG."""
    sc.render.image_settings.file_format = 'PNG'
    if still:
        for f in range(sc.frame_start, still + 1):
            sc.frame_set(f)
        sc.render.filepath = os.path.join(out, f'still_{still:04d}.png')
        bpy.ops.render.render(write_still=True)
    else:
        sc.render.filepath = os.path.join(out, '')
        bpy.ops.render.render(animation=True)
    print('DONE')
