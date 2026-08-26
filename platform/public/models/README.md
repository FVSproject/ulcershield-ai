# 3D body model

The dashboard's **Digital Tissue Twin · 3D body** card renders an anatomical
mannequin by default — a neutral, matte-skinned medical body laid supine on
the hospital bed with pressure hotspots at the six vulnerable regions.

## Overriding with a custom GLB

If you want a photoreal or patient-specific mesh, drop a glTF/GLB at:

```
public/models/body.glb
```

The Body3D component probes for this file at runtime; if present, it is
loaded and rendered in place of the mannequin.

### Requirements for a drop-in GLB

The loader expects a **standing** mesh at Y-up in T-pose or A-pose (the
standard export from MakeHuman, Blender, DAZ, MetaHuman, etc.). The
component then rotates it into supine position:

- Inner rotation `X = -π/2` — tips the standing mesh onto its back (face-up).
- Outer rotation `Y = +π/2` — turns the head to viewer's left (world −X).
- Position `(0.82, -0.5, 0)` — centers on the mattress top.
- Scale `1.05` — fits a ~1.7 m mesh on the bed.

If your model uses different conventions, edit `GLBBody` in
`src/components/dashboard/body-3d.tsx` — the rotation and position values
are documented inline.

### Sources for a medical-grade GLB

| Source | License | Notes |
| --- | --- | --- |
| [BodyParts3D](https://lifesciencedb.jp/bp3d/) | CC-BY-SA (Japan) | 3,000+ anatomical models in OBJ; convert to glTF via Blender's `File → Export → glTF 2.0`. |
| [NIH 3D Print Exchange](https://3d.nih.gov/) | Various open licenses | Search "human body" / "anatomy". Download STL, convert to glTF. |
| [MakeHuman](http://www.makehumancommunity.org/) | AGPL | Free desktop app that generates anatomically-neutral humans; export via Blender's glTF exporter. |
| [Blender Studio · Human Base Meshes](https://studio.blender.org/characters/human-base-meshes/) | CC0 | Blender file — open, apply a T-pose, `File → Export → glTF 2.0`. |
| [Sketchfab — CC0 anatomy](https://sketchfab.com/search?q=anatomy+body&features=downloadable&licenses=322a749bcfa841b29dff1e8a1bb74b0b) | CC0 | Filter "downloadable" + "CC0". Auto-download as glTF. |

## Hotspot positions

The six pressure-point coordinates live in `HOTSPOT_POS` at the bottom of
`body-3d.tsx`. If you swap models, tune those `[x, y, z]` values so the
glowing spheres land on the correct anatomical landmarks:

- `shoulders` — scapula region, mid-torso Z
- `sacrum` — lower back midline
- `leftHip` / `rightHip` — greater trochanters, lateral pelvis
- `leftHeel` / `rightHeel` — calcaneus, at the foot end

## Performance

Keep the model under ~5 MB and ~50 k triangles for smooth playback on
tablets. Bake textures at 1024² or 2048² max; higher wastes bandwidth for
no visible benefit at the dashboard's view distance.
