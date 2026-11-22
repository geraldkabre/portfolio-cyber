# Cross-check renders in Blender (read-only on the source: imports a glTF, renders, never saves the .blend).
# Usage: blender -b --factory-startup --python blender_headshots.py -- <model.gltf|glb> <out_prefix> [headFraction]
import bpy, sys, math
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
src, prefix = argv[0], argv[1]
frac = float(argv[2]) if len(argv) > 2 else 0.16

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
sc = bpy.context.scene
dg = bpy.context.evaluated_depsgraph_get()

pts = []
for o in sc.objects:
    if o.type != 'MESH':
        continue
    ev = o.evaluated_get(dg)
    m = ev.to_mesh()
    mw = o.matrix_world
    pts += [mw @ v.co for v in m.vertices]
    ev.to_mesh_clear()
lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
h = hi.z - lo.z
print('BOUNDS', tuple(lo), tuple(hi), 'height', h)

# head region = top `frac` of the body, centred on the vertices found there
top = [p for p in pts if p.z > hi.z - h * frac]
c = sum(top, Vector()) / len(top)
size = h * frac * 1.25

sc.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE_NEXT'
sc.render.resolution_x = sc.render.resolution_y = 700
sc.render.film_transparent = False
world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.17, 0.18, 0.22, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = 1.0
for rot, energy in (((50, 0, 30), 3.0), ((60, 0, 200), 1.5)):
    ld = bpy.data.lights.new('sun', 'SUN'); ld.energy = energy
    lo_ = bpy.data.objects.new('sun', ld); sc.collection.objects.link(lo_)
    lo_.rotation_euler = [math.radians(a) for a in rot]

cam_d = bpy.data.cameras.new('cam'); cam_d.type = 'ORTHO'; cam_d.ortho_scale = size
cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
full = len(argv) > 3 and argv[3] == 'full'
if full:
    c = (lo + hi) / 2; cam_d.ortho_scale = h * 1.1
for name, d in (('front', Vector((0, -1, 0))), ('side', Vector((1, 0, 0))), ('back', Vector((0, 1, 0))), ('front_ry', Vector((0, 1, 0)))):
    if name == 'front_ry':
        continue
    for flip in (1,):
        cam.location = c + d * flip * (h * 2)
        cam.rotation_euler = (d * -1).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = f'{prefix}_{name}.png'
        bpy.ops.render.render(write_still=True)
print('BLENDER_DONE')
