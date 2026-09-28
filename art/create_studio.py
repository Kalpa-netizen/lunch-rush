"""Editable Blender art for the Lunch Rush lobby and phone garage."""
import bpy, math, os
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'art')
MODELS_OUT = os.path.join(OUT, 'models')
os.makedirs(OUT, exist_ok=True)
os.makedirs(MODELS_OUT, exist_ok=True)

# Clear existing data when running in Blender
bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, color, metallic=0, rough=.4, emission=None, emission_strength=1.0):
    m = bpy.data.materials.new('LR ' + name)
    m.diffuse_color = (*color[:3], 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color[:3], 1)
    bs.inputs['Metallic'].default_value = metallic
    bs.inputs['Roughness'].default_value = rough
    if emission:
        bs.inputs['Emission Color'].default_value = (*emission[:3], 1)
        bs.inputs['Emission Strength'].default_value = emission_strength
    return m

ink = material('Graphite', (.035,.06,.07))
rubber = material('Tire rubber', (.018,.023,.026), rough=.85)
chrome = material('Brushed aluminum', (.48,.61,.62), .75)
cream = material('Ivory', (.9,.86,.69))
orange = material('Papaya', (1,.19,.065), .25)
mint = material('Seafoam', (.19,.66,.54), .2)
blue = material('Glacier', (.31,.62,.82), .3)
glass = material('Smoked glass', (.035,.16,.20), .4, .18)
road = material('Asphalt', (.115,.17,.18), rough=.85)
ground = material('Concrete', (.56,.67,.62), rough=.8)
water = material('Canal water', (.025,.40,.45), .3, .23)
leaf = material('Trees', (.12,.37,.26), rough=.8)

# Emissive night materials
neon_orange = material('Neon Orange', (1.0, 0.25, 0.05), emission=(1.0, 0.35, 0.1), emission_strength=8.0)
neon_cyan = material('Neon Cyan', (0.1, 0.8, 1.0), emission=(0.1, 0.8, 1.0), emission_strength=7.0)
warm_light = material('Warm Window Glow', (1.0, 0.85, 0.5), emission=(1.0, 0.85, 0.5), emission_strength=5.0)
headlight_glow = material('Headlight Glow', (0.9, 0.95, 1.0), emission=(0.9, 0.95, 1.0), emission_strength=10.0)
taillight_glow = material('Taillight Glow', (1.0, 0.05, 0.05), emission=(1.0, 0.05, 0.05), emission_strength=8.0)

def finish(o, name, mat):
    o.name = 'LR ' + name
    if o.data and hasattr(o.data, 'materials'):
        o.data.materials.append(mat)
    return o

def box(name, loc, size, mat, bevel=.06):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = finish(bpy.context.object, name, mat)
    o.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        m = o.modifiers.new('Soft manufactured edges', 'BEVEL')
        m.width = bevel
        m.segments = 3
        o.modifiers.new('Corner normals', 'WEIGHTED_NORMAL')
    return o

def sphere(name, loc, size, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, location=loc)
    o = finish(bpy.context.object, name, mat)
    o.scale = size
    for p in o.data.polygons:
        p.use_smooth = True
    return o

def cylinder(name, a, b, radius, mat):
    d = Vector(b) - Vector(a)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius, depth=d.length, location=(Vector(a) + Vector(b)) / 2)
    o = finish(bpy.context.object, name, mat)
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    for p in o.data.polygons:
        p.use_smooth = True
    return o

def torus(name, loc, major, minor, mat, rotation=(math.pi/2, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_segments=40, minor_segments=12, location=loc, rotation=rotation, major_radius=major, minor_radius=minor)
    o = finish(bpy.context.object, name, mat)
    for p in o.data.polygons:
        p.use_smooth = True
    return o

def bike(kind, loc=(0, 0, 0), scale=1, night=False):
    before = set(bpy.context.scene.objects)
    paint = {'SPORT': orange, 'SCOOTER': mint, 'FUTURE': blue, 'RETRO': cream, 'CAFE': ink, 'DIRT': mint}[kind]
    
    for x in (-.98, 1.02):
        torus('Tire', (x, 0, .47), .34, .115, rubber)
        torus('Wheel rim', (x, 0, .47), .265, .035, chrome)
        cylinder('Axle', (x, -.22, .47), (x, .22, .47), .075, ink)
        for angle in range(0, 360, 60):
            a = math.radians(angle)
            cylinder('Spoke', (x, 0, .47), (x + math.cos(a) * .25, 0, .47 + math.sin(a) * .25), .025, chrome)
        for y in (-.19, .19):
            cylinder('Fork', (x, y, .48), (x - .25, y, 1.22 if x > 0 else .9), .055, chrome)
            
    box('Chassis', (-.1, 0, .74), (1.55, .34, .17), ink)
    box('Engine', (-.05, 0, .84), (.54, .53, .40), chrome)
    for z in (.75, .83, .91):
        box('Engine fin', (-.05, 0, z), (.58, .59, .03), ink, .01)
    cylinder('Exhaust', (-1.2, -.32, .61), (.05, -.32, .60), .065, chrome)
    box('Seat', (-.55, 0, 1.23), (.97, .54, .17), ink)
    
    # Rear taillight
    box('Taillight', (-1.15, 0, 1.22), (.04, .2, .06), taillight_glow if night else orange, .01)
    
    if kind == 'SCOOTER':
        box('Step-through deck', (.13, 0, .63), (1.3, .58, .16), paint)
        shield = box('Leg shield', (.59, 0, 1.08), (.19, .67, .91), paint, .12)
        shield.rotation_euler.y = -.18
        sphere('Rear cowling', (-.8, 0, .97), (.5, .36, .33), paint)
        cylinder('Round headlamp', (.78, 0, 1.57), (.9, 0, 1.57), .17, headlight_glow if night else cream)
        box('Delivery box', (-1.04, 0, 1.54), (.57, .62, .44), cream)
        box('Box stripe', (-1.04, -.315, 1.54), (.42, .015, .08), orange, .01)
    else:
        sphere('Fuel tank', (.05, 0, 1.18), (.64, .37, .34), paint)
        box('Tail fairing', (-.93, 0, 1.24), (.48, .51, .2), paint)
        face = box('Front fairing', (.71, 0, 1.29), (.39, .54, .49), paint, .12)
        face.rotation_euler.y = -.3
        if kind in ('SPORT', 'FUTURE'):
            wind = box('Windscreen', (.60, 0, 1.58), (.075, .44, .36), glass, .04)
            wind.rotation_euler.y = -.38
        if kind in ('RETRO', 'CAFE'):
            cylinder('Classic headlight', (.91, 0, 1.40), (1.02, 0, 1.40), .18, headlight_glow if night else cream)
            box('Heritage tank stripe', (.0, -.365, 1.23), (.65, .015, .08), chrome, .01)
        if kind == 'DIRT':
            box('High dirt fender', (.98, 0, 1.05), (.76, .33, .1), paint)
            for y in (-.19, .19):
                cylinder('Fork boot', (.98, y, .72), (.88, y, .98), .08, ink)
            plate = box('Number plate', (.96, 0, 1.38), (.06, .46, .4), cream)
        for y in (-.15, .15):
            box('LED headlight', (.93, y, 1.34), (.028, .19, .06), headlight_glow if night else cream, .02)
        if kind == 'FUTURE':
            for x in (-.98, 1.02):
                for y in (-.13, .13):
                    cylinder('Aero wheel cover', (x, y, .47), (x, y + .02, .47), .26, paint)
            for y in (-.3, .3):
                box('Aero fin', (.0, y, 1.01), (.95, .12, .12), cream)
                
    cylinder('Handlebar', (.61, -.52, 1.48), (.61, .52, 1.48), .045, chrome)
    for y in (-.49, .49):
        cylinder('Grip', (.61, y - .09, 1.48), (.61, y + .09, 1.48), .065, ink)
        cylinder('Mirror stem', (.63, y, 1.49), (.64, y * 1.2, 1.78), .018, chrome)
        sphere('Mirror', (.64, y * 1.2, 1.79), (.095, .07, .045), glass)
        
    created = set(bpy.context.scene.objects) - before
    for o in created:
        o.location = Vector(loc) + o.location * scale
        o.scale *= scale
    return created

def new_scene(name, night=False):
    s = bpy.data.scenes.new(name)
    bpy.context.window.scene = s
    s.world = bpy.data.worlds.new(name + ' World')
    s.world.use_nodes = True
    bg = s.world.node_tree.nodes['Background']
    if night:
        bg.inputs[0].default_value = (.01, .015, .035, 1)  # Midnight Navy
        bg.inputs[1].default_value = .2
    else:
        bg.inputs[0].default_value = (.65, .76, .76, 1)  # Daylight Studio Sky
        bg.inputs[1].default_value = .5
        
    s.render.engine = 'CYCLES'
    s.cycles.samples = 32
    s.cycles.use_denoising = True
    s.render.image_settings.file_format = 'PNG'
    s.render.image_settings.color_mode = 'RGBA'
    s.render.film_transparent = True
    s.view_settings.view_transform = 'AgX'
    return s

def light(loc, power, size, color=(1, 1, 1)):
    d = bpy.data.lights.new('LR softbox', 'AREA')
    d.energy = power
    d.shape = 'DISK'
    d.size = size
    d.color = color
    o = bpy.data.objects.new('LR softbox', d)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (-o.location).to_track_quat('-Z', 'Y').to_euler()
    return o

def camera(loc, target, ortho):
    d = bpy.data.cameras.new('LR camera')
    o = bpy.data.objects.new('LR camera', d)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector(target) - o.location).to_track_quat('-Z', 'Y').to_euler()
    d.type = 'ORTHO'
    d.ortho_scale = ortho
    bpy.context.scene.camera = o
    return o

def text_obj(label, loc, size, mat):
    d = bpy.data.curves.new('LR lettering', 'FONT')
    d.body = label
    d.align_x = 'CENTER'
    d.size = size
    d.extrude = .003
    o = bpy.data.objects.new('LR ' + label, d)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (math.pi / 2, 0, 0)
    d.materials.append(mat)
    return o

def export_current_scene_glb(filepath):
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_yup=True
    )

print("Rendering bike studio scenes...")
for kind in ('SPORT', 'SCOOTER', 'FUTURE', 'RETRO', 'CAFE', 'DIRT'):
    s = new_scene('Lunch Rush • ' + kind)
    bike(kind)
    camera((4.4, -6, 3.1), (0, 0, .86), 3.6)
    light((1, -4, 6), 650, 5)
    light((-3, 2, 4), 850, 4)
    s.render.resolution_x = 600
    s.render.resolution_y = 400
    s.render.resolution_percentage = 100
    s.render.filepath = os.path.join(OUT, kind.lower() + '.png')
    bpy.ops.render.render(write_still=True)
    export_current_scene_glb(os.path.join(MODELS_OUT, f"{kind.lower()}.glb"))

def build_city(night=False):
    box('Diorama foundation', (0, 0, -.35), (10, 7, .65), ink, .25)
    box('Sidewalk', (0, 1.65, .035), (9.9, 3.6, .22), ground, .12)
    box('Street', (0, -1.25, .015), (9.85, 2.3, .15), road)
    box('Canal', (0, -2.95, -.05), (9.85, .9, .22), water)
    for x in range(-4, 5):
        box('Lane marking', (x, -1.25, .1), (.5, .035, .015), cream, .005)
    for x in [-3.9, -3.55, -3.2, -2.85]:
        box('Crosswalk', (x, -1.25, .11), (.17, 1.5, .015), cream, .005)
    for x in [-4, -2, 0, 2, 4]:
        cylinder('Canal railing post', (x, -2.52, .13), (x, -2.52, .47), .025, chrome)
    cylinder('Canal handrail', (-4.8, -2.52, .47), (4.8, -2.52, .47), .03, chrome)
    
    # Office tower and stepped roofs.
    box('Office tower', (-2.4, 1.5, 1.85), (2.5, 2.35, 3.5), mint, .1)
    box('Office roof', (-2.4, 1.5, 3.68), (2.7, 2.5, .15), cream)
    for x in [-3.23, -2.67, -2.1, -1.54]:
        for z in [.7, 1.45, 2.2, 2.95]:
            win_mat = warm_light if (night and (x + z) % 0.5 > 0.1) else glass
            box('Office glazing', (x, .307, z), (.39, .035, .51), win_mat, .025)
    box('Office door', (-2.4, .27, .63), (.46, .05, 1.2), ink)
    text_obj('OFFICE', (-2.4, .23, 3.37), .24, neon_cyan if night else cream)
    box('Rooftop plant', (-2.1, 1.5, 3.91), (.95, .85, .4), ink)
    
    # Cafeteria, warm facade and striped awning.
    box('Cafeteria', (1.85, 1.48, .9), (3.25, 2.25, 1.75), cream)
    box('Cafe roof', (1.85, 1.48, 1.85), (3.5, 2.45, .19), orange)
    box('Cafe windows', (1.85, .33, .82), (2.9, .07, 1.05), warm_light if night else glass)
    for x in [.48, 1.17, 1.87, 2.57, 3.25]:
        box('Window mullion', (x, .28, .82), (.04, .04, 1.09), cream, .008)
    for i in range(12):
        aw = box('Awning stripe', (.35 + i * .275, .1, 1.53), (.274, .72, .11), orange if i % 2 else cream, .02)
        aw.rotation_euler.x = .13
    text_obj('CAFETERIA', (1.85, .26, 1.97), .28, neon_orange if night else ink)
    
    # Trees & Street furniture
    for x in [-4.2, 4.3]:
        cylinder('Tree trunk', (x, 1.2, .12), (x, 1.2, 1.05), .11, ink)
        sphere('Tree canopy', (x, 1.2, 1.45), (.65, .61, .8), leaf)
    for x in [.55, 2.6]:
        cylinder('Cafe table leg', (x, -.12, .13), (x, -.12, .54), .035, ink)
        cylinder('Cafe table', (x, -.12, .53), (x, -.12, .59), .28, orange)
        
    # Street light posts for night realism
    for x in [-3.5, 0.0, 3.5]:
        cylinder('Lamp pole', (x, .1, .1), (x, .1, 2.2), .03, ink)
        cylinder('Lamp arm', (x, .1, 2.2), (x, -.4, 2.4), .025, ink)
        box('Lamp head', (x, -.4, 2.4), (.15, .25, .08), warm_light if night else cream, .02)
        if night:
            # Add point light below lamp head
            pt = bpy.data.lights.new('Lamp point', 'POINT')
            pt.energy = 80
            pt.color = (1.0, 0.85, 0.6)
            pt.shadow_soft_size = 0.3
            pto = bpy.data.objects.new('Lamp point', pt)
            bpy.context.scene.collection.objects.link(pto)
            pto.location = (x, -.4, 2.2)

    # Bikes on the street
    for x, y, k in [(-1.0, -1.55, 'SPORT'), (1.75, -1.0, 'SCOOTER')]:
        bike(k, (x, y, .15), .8, night=night)
        
    for x in [3.8, 4.25]:
        bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=.13, radius2=.025, depth=.38, location=(x, -1.9, .31))
        finish(bpy.context.object, 'Traffic cone', orange)
        box('Cone base', (x, -1.9, .13), (.32, .32, .06), ink)

print("Rendering Day City Diorama...")
s_day = new_scene('Lunch Rush • City Day', night=False)
build_city(night=False)
camera((11, -16, 12), (0, 0, 1), 13.0)
light((-3, -7, 12), 2200, 8)
light((6, 3, 10), 1800, 7)
s_day.render.resolution_x = 1400
s_day.render.resolution_y = 1100
s_day.render.resolution_percentage = 100
s_day.render.filepath = os.path.join(OUT, 'city.png')
bpy.ops.render.render(write_still=True)
export_current_scene_glb(os.path.join(MODELS_OUT, 'city_day.glb'))

print("Rendering Night City Diorama...")
s_night = new_scene('Lunch Rush • City Night', night=True)
build_city(night=True)
camera((11, -16, 12), (0, 0, 1), 13.0)
light((-3, -7, 12), 400, 8, color=(0.4, 0.55, 0.9))  # Cool moonlight
light((6, 3, 10), 300, 7, color=(0.2, 0.3, 0.6))
s_night.render.resolution_x = 1400
s_night.render.resolution_y = 1100
s_night.render.resolution_percentage = 100
s_night.render.filepath = os.path.join(OUT, 'city_night.png')
bpy.ops.render.render(write_still=True)
export_current_scene_glb(os.path.join(MODELS_OUT, 'city_night.glb'))

# Save the master blend file
blend_file = os.path.join(ROOT, 'art', 'lunch-rush-studio.blend')
bpy.ops.wm.save_as_mainfile(filepath=blend_file)
print(f"Master Blender project saved to: {blend_file}")
