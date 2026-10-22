# Geometry and materials

A MeshInstance has one geometry and one material.
The geometry catalog is `GEOMETRY_CATALOG` in `src/editor/geometry.ts`.
Materials are TSL scripts.
Read [[TSL]] for the script language.

## Geometry types

| Type | Three.js class |
| --- | --- |
| `box` | `BoxGeometry` |
| `sphere` | `SphereGeometry` |
| `plane` | `PlaneGeometry` |
| `circle` | `CircleGeometry` |
| `cylinder` | `CylinderGeometry` |
| `cone` | `ConeGeometry` |
| `capsule` | `CapsuleGeometry` |
| `torus` | `TorusGeometry` |
| `torusKnot` | `TorusKnotGeometry` |
| `ring` | `RingGeometry` |
| `icosahedron` | `IcosahedronGeometry` |
| `octahedron` | `OctahedronGeometry` |
| `dodecahedron` | `DodecahedronGeometry` |
| `tetrahedron` | `TetrahedronGeometry` |

Change the type in the Geometry section.
Each type has its own parameters.
Size parameters run from 0.05 to 20.
Segment counts are integers.

The File system lists geometries under `res://meshes/Name.tres`.
That path is a label.
The bytes live in the scene file, not in a `.tres` file on disk.

## Shared geometry

Two meshes can use one geometry id.
The Inspector shows `Shared by {n} nodes.` when `users` is greater than 1.
Edit a parameter and every user changes.
Make Unique copies the geometry for this mesh only.
You can also assign another geometry from the picker.

A missing geometry id on load becomes a box.

## Materials

The Material section edits the name, the preset, the side, transparency, and wireframe.

| Flag | Stored value | Three.js result |
| --- | --- | --- |
| Side Front | `front` | `FrontSide` |
| Side Back | `back` | `BackSide` |
| Side Double | `double` | `DoubleSide` |
| Transparent | `true` | Transparent, and depth write turns off. |
| Wireframe | `true` | Wireframe draw. |

The material name is the File system path `res://materials/Name.tsl`.
The source is the TSL text.
The bottom panel edits that text for the bound material.

## Shared materials

Two meshes can use one material id.
The users count works like geometry.
Make Unique copies the material.
`makeMaterialUnique` does that copy.
Assign another material from the picker.

A mesh with several Three.js materials keeps the first editable material on save.
The editor logs a warning.
A missing material id on load uses the Lit preset.

## Presets

Apply a preset from the Material section or from the AssetLib screen.
The preset replaces the source.
These are the preset names: Lit, Metal, UV, Checker, Fresnel, Stripes, Emissive Pulse, Vertex Wave, World Normal, and Marble.
The starter floor uses UV.

## See also

[[TSL]]
[[Inspector]]
[[Scene files]]
[[Scene file format]]
