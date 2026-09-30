"""Blender script to procedurally create and render 3D game interface assets for Lunch Rush."""
import bpy, math, os
from mathutils import Vector, Euler

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'art', 'ui')
os.makedirs(OUT, exist_ok=True)

def get_mat(name, color, metallic=0.0, rough=0.3, emission=None, emission_strength=1.0, clearcoat=0.0):
    mat_name = 'UI_' + name
    if mat_name in bpy.data.materials:
        return bpy.data.materials[mat_name]
    m = bpy.data.materials.new(mat_name)
    m.diffuse_color = (*color[:3], 1)
    bs = m.node_tree.nodes.get('Principled BSDF')
    if bs:
        bs.inputs['Base Color'].default_value = (*color[:3], 1)
        bs.inputs['Metallic'].default_value = metallic
        bs.inputs['Roughness'].default_value = rough
        if 'Coat Weight' in bs.inputs:
            bs.inputs['Coat Weight'].default_value = clearcoat
        elif 'Clearcoat' in bs.inputs:
            bs.inputs['Clearcoat'].default_value = clearcoat
            
        if emission:
            bs.inputs['Emission Color'].default_value = (*emission[:3], 1)
            bs.inputs['Emission Strength'].default_value = emission_strength
    return m

def reset_scene(name="RenderScene"):
    s = bpy.data.scenes.new(name)
    bpy.context.window.scene = s
    
    # World lighting
    w = bpy.data.worlds.new(name + ' World')
    bg = w.node_tree.nodes.get('Background')
    if bg:
        bg.inputs[0].default_value = (0.05, 0.07, 0.1, 1)
        bg.inputs[1].default_value = 0.8
    s.world = w
    
    # Cycles Render Engine Setup
    s.render.engine = 'CYCLES'
    s.cycles.samples = 24
    s.cycles.use_denoising = True
    s.render.film_transparent = True
    s.render.image_settings.file_format = 'PNG'
    s.render.image_settings.color_mode = 'RGBA'
    s.view_settings.view_transform = 'AgX'
    return s

def setup_studio_lighting(key_pos=(3, -3, 4), fill_pos=(-4, -2, 2), rim_pos=(0, 4, 3), key_pwr=400, fill_pwr=200, rim_pwr=350):
    # Key Light
    d1 = bpy.data.lights.new('KeyLight', 'AREA')
    d1.energy = key_pwr
    d1.size = 2.5
    d1.color = (1.0, 0.96, 0.9)
    o1 = bpy.data.objects.new('KeyLight', d1)
    bpy.context.scene.collection.objects.link(o1)
    o1.location = key_pos
    o1.rotation_euler = (-o1.location).to_track_quat('-Z', 'Y').to_euler()
    
    # Fill Light (Cool tint)
    d2 = bpy.data.lights.new('FillLight', 'AREA')
    d2.energy = fill_pwr
    d2.size = 3.0
    d2.color = (0.75, 0.88, 1.0)
    o2 = bpy.data.objects.new('FillLight', d2)
    bpy.context.scene.collection.objects.link(o2)
    o2.location = fill_pos
    o2.rotation_euler = (-o2.location).to_track_quat('-Z', 'Y').to_euler()
    
    # Rim / Accent Light
    d3 = bpy.data.lights.new('RimLight', 'AREA')
    d3.energy = rim_pwr
    d3.size = 2.0
    d3.color = (1.0, 0.85, 0.6)
    o3 = bpy.data.objects.new('RimLight', d3)
    bpy.context.scene.collection.objects.link(o3)
    o3.location = rim_pos
    o3.rotation_euler = (-o3.location).to_track_quat('-Z', 'Y').to_euler()

def add_camera(loc=(0, -3.5, 1.2), target=(0, 0, 0.3), ortho_scale=2.0):
    d = bpy.data.cameras.new('UICam')
    d.type = 'ORTHO'
    d.ortho_scale = ortho_scale
    o = bpy.data.objects.new('UICam', d)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = o
    return o

def render_to(filename, res=512):
    s = bpy.context.scene
    s.render.resolution_x = res
    s.render.resolution_y = res
    s.render.resolution_percentage = 100
    filepath = os.path.join(OUT, filename)
    s.render.filepath = filepath
    bpy.ops.render.render(write_still=True)
    print(f"Rendered: {filepath}")

# ----------------------------------------------------
# 1. TROPHIES: Golden, Silver, Bronze Bento Lunchbox
# ----------------------------------------------------
def build_trophy(tier="gold"):
    mat_gold = get_mat('Gold', (1.0, 0.78, 0.18), metallic=0.92, rough=0.18, clearcoat=0.5)
    mat_gold_dark = get_mat('GoldDark', (0.8, 0.55, 0.1), metallic=0.9, rough=0.25)
    mat_silver = get_mat('Silver', (0.88, 0.92, 0.95), metallic=0.95, rough=0.15, clearcoat=0.5)
    mat_bronze = get_mat('Bronze', (0.82, 0.48, 0.28), metallic=0.88, rough=0.25)
    mat_chrome = get_mat('Chrome', (0.75, 0.82, 0.85), metallic=0.98, rough=0.1)
    mat_dark_metal = get_mat('DarkMetal', (0.12, 0.14, 0.16), metallic=0.8, rough=0.35)
    mat_white_glow = get_mat('WhiteGlow', (1.0, 1.0, 1.0), emission=(1.0, 1.0, 1.0), emission_strength=5.0)

    main_mat = mat_gold if tier == "gold" else (mat_silver if tier == "silver" else mat_bronze)
    accent_mat = mat_gold_dark if tier == "gold" else (mat_chrome if tier == "silver" else mat_dark_metal)
    
    # Trophy Plinth / Pedestal
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.75, depth=0.18, location=(0, 0, -0.4))
    pedestal_base = bpy.context.object
    pedestal_base.data.materials.append(mat_dark_metal)
    
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.6, depth=0.15, location=(0, 0, -0.25))
    pedestal_top = bpy.context.object
    pedestal_top.data.materials.append(accent_mat)
    
    # Trophy Stem / Columns
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.16, depth=0.4, location=(0, 0, -0.05))
    stem = bpy.context.object
    stem.data.materials.append(main_mat)
    
    # Main Bento Lunchbox Body
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.45))
    bento = bpy.context.object
    bento.dimensions = (0.9, 0.65, 0.5)
    bento.rotation_euler = (0.1, -0.15, 0.35)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bento.data.materials.append(main_mat)
    m = bento.modifiers.new('Bevel', 'BEVEL')
    m.width = 0.04
    m.segments = 3
    
    # Bento Lid Rim
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.72))
    lid = bpy.context.object
    lid.dimensions = (0.94, 0.69, 0.08)
    lid.rotation_euler = (0.1, -0.15, 0.35)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    lid.data.materials.append(accent_mat)
    
    # Bento Handle (Arch)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.25, minor_radius=0.035, location=(0, 0, 0.85), rotation=(math.pi/2, 0.1, 0.35))
    handle = bpy.context.object
    handle.data.materials.append(accent_mat)
    
    # Star Badge on Front
    bpy.ops.mesh.primitive_cylinder_add(vertices=5, radius=0.16, depth=0.04, location=(0.18, -0.32, 0.45), rotation=(math.pi/2 + 0.1, 0.35, 0))
    star = bpy.context.object
    star.data.materials.append(mat_white_glow if tier == "gold" else mat_chrome)

for tier in ["gold", "silver", "bronze"]:
    reset_scene(f"Trophy_{tier}")
    build_trophy(tier)
    setup_studio_lighting()
    add_camera(loc=(0, -3.2, 0.8), target=(0, 0, 0.25), ortho_scale=2.1)
    render_to(f"trophy_{tier}.png", 512)

# ----------------------------------------------------
# 2. NITRO BOOST CANISTER (HUD / UI)
# ----------------------------------------------------
reset_scene("NitroCanister")
setup_studio_lighting(key_pos=(3, -3, 3), rim_pos=(-2, 3, 3), key_pwr=500, rim_pwr=400)

mat_cyan = get_mat('CyanGlow', (0.1, 0.85, 1.0), emission=(0.1, 0.85, 1.0), emission_strength=6.0)
mat_chrome = get_mat('Chrome', (0.75, 0.82, 0.85), metallic=0.98, rough=0.1)
mat_dark_metal = get_mat('DarkMetal', (0.12, 0.14, 0.16), metallic=0.8, rough=0.35)
mat_orange_glow = get_mat('OrangeGlow', (1.0, 0.35, 0.05), emission=(1.0, 0.35, 0.05), emission_strength=6.0)

# Tank Body
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.36, depth=1.1, location=(0, 0, 0))
tank = bpy.context.object
tank.data.materials.append(mat_cyan)

# Tank Top Dome & Bottom Dome
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.36, location=(0, 0, 0.55))
top_dome = bpy.context.object
top_dome.scale = (1, 1, 0.5)
top_dome.data.materials.append(mat_cyan)

bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.36, location=(0, 0, -0.55))
bot_dome = bpy.context.object
bot_dome.scale = (1, 1, 0.5)
bot_dome.data.materials.append(mat_cyan)

# Chrome Collar & Valve Assembly
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.18, depth=0.22, location=(0, 0, 0.8))
valve_neck = bpy.context.object
valve_neck.data.materials.append(mat_chrome)

bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.12, depth=0.25, location=(0.15, 0, 0.95), rotation=(0, math.pi/2, 0))
nozzle = bpy.context.object
nozzle.data.materials.append(mat_chrome)

# Round Pressure Gauge on Tank
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.16, depth=0.08, location=(0, -0.36, 0.2), rotation=(math.pi/2, 0, 0))
gauge_bezel = bpy.context.object
gauge_bezel.data.materials.append(mat_chrome)

bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.13, depth=0.02, location=(0, -0.41, 0.2), rotation=(math.pi/2, 0, 0))
gauge_face = bpy.context.object
gauge_face.data.materials.append(mat_orange_glow)

# Dark Racing Bands
for z in [-0.25, 0.25]:
    bpy.ops.mesh.primitive_torus_add(major_radius=0.37, minor_radius=0.025, location=(0, 0, z))
    band = bpy.context.object
    band.data.materials.append(mat_dark_metal)

add_camera(loc=(0, -3.2, 0.2), target=(0, 0, 0.15), ortho_scale=2.3)
render_to("hud_nitro.png", 512)

# ----------------------------------------------------
# 3. SPEEDOMETER / TACHOMETER GAUGE BEZEL
# ----------------------------------------------------
reset_scene("SpeedoGauge")
setup_studio_lighting(key_pos=(2, -3, 4), rim_pos=(0, 3, 2), key_pwr=600, rim_pwr=300)

# Outer Bezel Ring
bpy.ops.mesh.primitive_torus_add(major_radius=0.85, minor_radius=0.09, location=(0, 0, 0), rotation=(math.pi/2, 0, 0))
bezel = bpy.context.object
bezel.data.materials.append(mat_chrome)

# Dial Plate
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.82, depth=0.05, location=(0, 0.02, 0), rotation=(math.pi/2, 0, 0))
dial = bpy.context.object
dial.data.materials.append(mat_dark_metal)

# Gauge Arch Glow (Speed band)
bpy.ops.mesh.primitive_torus_add(major_radius=0.68, minor_radius=0.03, location=(0, -0.02, 0), rotation=(math.pi/2, 0, 0))
speed_band = bpy.context.object
speed_band.data.materials.append(mat_cyan)

# Center Hub
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.18, depth=0.12, location=(0, -0.06, 0), rotation=(math.pi/2, 0, 0))
hub = bpy.context.object
hub.data.materials.append(mat_chrome)

# Glowing Orange Needle
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.25, -0.08, 0.25))
needle = bpy.context.object
needle.dimensions = (0.55, 0.03, 0.04)
needle.rotation_euler = (0, -math.pi/4, 0)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
needle.data.materials.append(mat_orange_glow)

add_camera(loc=(0, -3.0, 0), target=(0, 0, 0), ortho_scale=2.2)
render_to("hud_gauge.png", 512)

# ----------------------------------------------------
# 4. HAZARD HUD ICONS: Warning Cone, Jump Ramp, Pothole, Speedbreaker
# ----------------------------------------------------
mat_papaya = get_mat('Papaya', (1.0, 0.25, 0.08), metallic=0.2, rough=0.2, clearcoat=0.6)
mat_white_glow = get_mat('WhiteGlow', (1.0, 1.0, 1.0), emission=(1.0, 1.0, 1.0), emission_strength=5.0)
mat_yellow_glow = get_mat('YellowGlow', (1.0, 0.85, 0.1), emission=(1.0, 0.85, 0.1), emission_strength=6.0)

# (A) Hazard Cone
reset_scene("HazardCone")
setup_studio_lighting()
bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.45, radius2=0.06, depth=1.0, location=(0, 0, 0.2))
cone = bpy.context.object
cone.data.materials.append(mat_papaya)

# Reflective Stripe
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.26, depth=0.22, location=(0, 0, 0.25))
stripe = bpy.context.object
stripe.data.materials.append(mat_white_glow)

# Base
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, -0.28))
base = bpy.context.object
base.dimensions = (1.05, 1.05, 0.12)
base.rotation_euler = (0.15, -0.1, 0.4)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
base.data.materials.append(mat_dark_metal)

add_camera(loc=(0, -3.0, 0.6), target=(0, 0, 0.15), ortho_scale=2.0)
render_to("hud_cone.png", 512)

# (B) Jump Ramp Icon (Glowing Chevrons)
reset_scene("HazardRamp")
setup_studio_lighting(key_pwr=300, fill_pwr=200, rim_pwr=500)

# Inclined Wedge Platform
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0))
wedge = bpy.context.object
wedge.dimensions = (0.9, 1.1, 0.3)
wedge.rotation_euler = (0.4, 0.1, -0.3)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
wedge.data.materials.append(mat_dark_metal)

# Glowing Upward Chevron Arrows
for y, z in [(-0.15, 0.15), (0.15, 0.35)]:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, y, z))
    chev = bpy.context.object
    chev.dimensions = (0.6, 0.1, 0.08)
    chev.rotation_euler = (0.4, 0.1, -0.3)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    chev.data.materials.append(mat_cyan)

add_camera(loc=(0, -3.0, 0.6), target=(0, 0, 0.1), ortho_scale=2.0)
render_to("hud_ramp.png", 512)

# (C) Pothole Warning (3D Hazard Disc)
reset_scene("HazardPothole")
setup_studio_lighting()

# Hazard Rim Disc
bpy.ops.mesh.primitive_torus_add(major_radius=0.7, minor_radius=0.08, location=(0, 0, 0), rotation=(math.pi/2, 0, 0))
rim = bpy.context.object
rim.data.materials.append(mat_yellow_glow)

# Crater
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.65, depth=0.1, location=(0, 0, 0), rotation=(math.pi/2, 0, 0))
crater = bpy.context.object
crater.data.materials.append(mat_dark_metal)

# Exclamation Mark
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.08, 0.15))
exc_bar = bpy.context.object
exc_bar.dimensions = (0.12, 0.05, 0.45)
exc_bar.data.materials.append(mat_yellow_glow)

bpy.ops.mesh.primitive_uv_sphere_add(radius=0.08, location=(0, -0.08, -0.22))
exc_dot = bpy.context.object
exc_dot.data.materials.append(mat_yellow_glow)

add_camera(loc=(0, -3.0, 0), target=(0, 0, 0), ortho_scale=2.0)
render_to("hud_pothole.png", 512)

# (D) Speed Breaker Warning
reset_scene("HazardBreaker")
setup_studio_lighting()

bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0))
diamond = bpy.context.object
diamond.dimensions = (0.9, 0.08, 0.9)
diamond.rotation_euler = (0, 0, math.pi/4)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
diamond.data.materials.append(mat_orange_glow)

bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.35, depth=0.1, location=(0, -0.06, -0.05), rotation=(0, math.pi/2, 0))
bump = bpy.context.object
bump.scale = (1, 0.4, 0.5)
bump.data.materials.append(mat_dark_metal)

add_camera(loc=(0, -3.0, 0), target=(0, 0, 0), ortho_scale=2.0)
render_to("hud_breaker.png", 512)

# ----------------------------------------------------
# 5. PHONE CONTROLLER TACTILE 3D BUTTONS
# ----------------------------------------------------
mat_mint = get_mat('Mint', (0.2, 0.82, 0.65), metallic=0.2, rough=0.25)
mat_rubber = get_mat('Rubber', (0.05, 0.05, 0.06), metallic=0.0, rough=0.8)
mat_red_glow = get_mat('RedGlow', (1.0, 0.05, 0.15), emission=(1.0, 0.05, 0.15), emission_strength=7.0)

# (A) Throttle / Gas Pedal
reset_scene("CtrlGas")
setup_studio_lighting(key_pos=(3, -3, 3), key_pwr=500, rim_pwr=400)

bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, -0.05))
pedal_base = bpy.context.object
pedal_base.dimensions = (0.85, 1.3, 0.15)
pedal_base.data.materials.append(mat_dark_metal)

bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.08))
pedal_plate = bpy.context.object
pedal_plate.dimensions = (0.75, 1.15, 0.12)
pedal_plate.data.materials.append(mat_mint)

for y in [-0.4, -0.2, 0.0, 0.2, 0.4]:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, y, 0.16))
    rib = bpy.context.object
    rib.dimensions = (0.6, 0.08, 0.06)
    rib.data.materials.append(mat_rubber)

add_camera(loc=(1.4, -3.0, 4.5), target=(0, 0, 0), ortho_scale=1.9)
render_to("ctrl_gas.png", 512)

# (B) Brake Pedal
reset_scene("CtrlBrake")
setup_studio_lighting(key_pos=(3, -3, 3), key_pwr=500, rim_pwr=400)

bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, -0.05))
bpedal_base = bpy.context.object
bpedal_base.dimensions = (0.85, 1.3, 0.15)
bpedal_base.data.materials.append(mat_dark_metal)

bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.08))
bpedal_plate = bpy.context.object
bpedal_plate.dimensions = (0.75, 1.15, 0.12)
bpedal_plate.data.materials.append(mat_papaya)

for y in [-0.4, -0.2, 0.0, 0.2, 0.4]:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, y, 0.16))
    brib = bpy.context.object
    brib.dimensions = (0.6, 0.08, 0.06)
    brib.data.materials.append(mat_rubber)

add_camera(loc=(1.4, -3.0, 4.5), target=(0, 0, 0), ortho_scale=1.9)
render_to("ctrl_brake.png", 512)

# (C) Arcade Nitro Boost Button
reset_scene("CtrlBoost")
setup_studio_lighting(key_pos=(2, -3, 4), rim_pos=(0, 3, 3), key_pwr=600, rim_pwr=500)

bpy.ops.mesh.primitive_cylinder_add(vertices=36, radius=0.75, depth=0.2, location=(0, 0, -0.05))
btn_bezel = bpy.context.object
btn_bezel.data.materials.append(mat_chrome)

bpy.ops.mesh.primitive_torus_add(major_radius=0.6, minor_radius=0.05, location=(0, 0, 0.08))
btn_ring = bpy.context.object
btn_ring.data.materials.append(mat_cyan)

bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.55, location=(0, 0, 0.05))
btn_dome = bpy.context.object
btn_dome.scale = (1, 1, 0.45)
btn_dome.data.materials.append(mat_red_glow)

bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.26))
bolt = bpy.context.object
bolt.dimensions = (0.15, 0.4, 0.04)
bolt.rotation_euler = (0, 0, math.pi/6)
bolt.data.materials.append(mat_yellow_glow)

add_camera(loc=(1.2, -3.0, 4.5), target=(0, 0, 0.05), ortho_scale=2.0)
render_to("ctrl_boost.png", 512)

# (D) Steering Left & Right Controls
reset_scene("CtrlSteer")
setup_studio_lighting(key_pwr=450, fill_pwr=250, rim_pwr=350)

bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.72, depth=0.15, location=(0, 0, -0.05))
steer_base = bpy.context.object
steer_base.data.materials.append(mat_dark_metal)

bpy.ops.mesh.primitive_torus_add(major_radius=0.65, minor_radius=0.04, location=(0, 0, 0.04))
steer_ring = bpy.context.object
steer_ring.data.materials.append(mat_cyan)

bpy.ops.mesh.primitive_cylinder_add(vertices=3, radius=0.48, depth=0.12, location=(0, 0, 0.1), rotation=(0, 0, math.pi/2))
steer_arrow = bpy.context.object
steer_arrow.data.materials.append(mat_white_glow)

add_camera(loc=(0, -2.0, 5), target=(0, 0, 0), ortho_scale=1.9)
render_to("ctrl_steer.png", 512)

# (E) Star Badge for Leaderboard / Podium
reset_scene("StarBadge")
setup_studio_lighting(key_pwr=500, rim_pwr=400)

bpy.ops.mesh.primitive_cylinder_add(vertices=5, radius=0.75, depth=0.18, location=(0, 0, 0), rotation=(math.pi/2, 0, 0))
star_3d = bpy.context.object
star_3d.data.materials.append(get_mat('Gold', (1.0, 0.78, 0.18), metallic=0.92, rough=0.18, clearcoat=0.5))

add_camera(loc=(0, -3.0, 0), target=(0, 0, 0), ortho_scale=2.0)
render_to("badge_star.png", 512)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'art', 'lunch-rush-ui.blend'), copy=True)
print("All Blender UI Assets generated successfully!")
