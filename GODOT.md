# Godot-style editor

The editor should feel like Godot 4: the same docks, the same way a node is created and inspected, and the same idea that a scene is a tree of nodes with resources beside it. It is a Three.js editor, so names and materials follow Three.js. Behavior and layout follow Godot.

`PLAN.md` records why the scene and the editor share one canvas. This file records which Godot features already exist and which ones are still missing.

When a feature lands, move it from **Not yet** into **Already in place**. Do not add a Godot feature that the editor cannot actually use.

## Already in place

### Shell

- Top menus: Scene, Project, Debug, Editor, Help.
- Docks: Scene tree, File system, Inspector, and a bottom panel with TSL and Output.
- Screens: 3D, Script, Game, AssetLib. The 2D screen was removed on purpose. Everything in this editor is 3D.
- Draggable splitters. Dragging the File system splitter upward makes that dock taller.
- Create Node dialog, grouped as Node, Mesh, and Light.
- Right-click menus on the scene tree and on inspector values.

### Scene tree

- A World root.
- Node kinds: Node, MeshInstance, DirectionalLight, OmniLight, SpotLight, HemisphereLight. Visible names do not use a `3D` suffix.
- Add, rename, duplicate, delete, and reparent.
- Nodes created in the editor stay in the scene when you leave `/editor`.

### Viewport

- `/` is the scene. `/editor` mounts the same canvas into the viewport.
- Grid at an editable position, with visibility, size, divisions, center color, and cell color. It hides outside the editor and while playing.
- Move, rotate, and scale gizmos, in world or local space, with optional snapping.
- Camera views: Perspective, Top, Front, Right.
- Click to select. Focus frames the selection.
- Play, pause, and stop. Play hides the grid, gizmos, and light badges.
- Orbit controls start aimed at `[0, 0, 0]`.
- Each light has a labeled badge: Directional, Omni, Spot, Hemisphere.
- Directional and spot lights also draw an arrow along the direction they shine (local -Z). Omni and hemisphere lights have no single aim, so they do not get an arrow.
- Shaded draws the picture. Debug Split replaces it with four quadrants: color, depth, normals, and velocity. The quadrants are labeled while that mode is on.

### Inspector

- Property filter.
- Transform. New meshes start at position `[0, 0, 0]`, rotation `[0, 0, 0]`, scale `[1, 1, 1]`.
- Geometry type and parameters, including shared geometry.
- Material name, TSL preset, cull mode, transparency, and wireframe. The name is the file-system path.
- Light color, energy, range, spot angle, penumbra, and Look at for directional and spot lights.
- Visibility, cast shadow, and receive shadow.
- On World: background color and intensity, environment intensity, shadows on or off, shadow type (Basic, PCF, VSM), and the grid.
- Right-click a value and choose Reset to restore the value it was created with.

### Resources

- Primitive meshes under `res://meshes`.
- TSL materials under `res://materials`, with presets (Lit, Metal, UV, Checker, and the others in the create dialog).
- The starter floor uses the UV preset and sits at `[0, 0, 0]`. The starter cube sits at `[0, 1.5, 0]`.

### Lighting

- Default hemisphere fill and a directional light that looks at the origin and casts shadows.
- The floor is a lit standard material, so shadows are visible. The starter meshes cast shadows.
- Directional shadow coverage is wide enough for the floor. Spot and point lights cast shadows.
- Point and spot energy stays bright out to Range instead of falling off with inverse-square decay.

## Not yet

Build these in an order that keeps the editor usable. A half-wired Godot feature is worse than leaving it off.

### Scene file

- Save and load the node tree, transforms, geometry, materials, and light settings.
- A scene path that matches the File system (`res://World.tscn` is only a label today).
- Instancing one scene inside another.

### History

- Undo and redo for inspector edits, transforms, create, delete, and reparent.

### Nodes still missing

- Camera.
- WorldEnvironment as its own node, instead of scene fields on World.
- Skeleton, bone, and animation player.
- Audio listener and players.
- Labels and other 3D UI, only if a scene needs them.

### Resources and import

- A real file tree, not a list built from memory.
- Import settings for models, textures, and audio.
- Make Unique already exists for geometry and materials. Extend that pattern to every shared resource.

### Viewport

- A spot-light cone gizmo, in addition to the direction arrow.
- Multi-select and a selection box drag.
- Viewport menus on a node (Godot's right-click in the 3D view).
- Preview sun and environment from the viewport, the way Godot previews a DirectionalLight.

### Inspector

- Property groups that match Godot sections more closely, including resource slots you can drag from the File system.
- Keying a property for animation, once an animation player exists.

### Scripts

- TSL is the material script. Node behavior scripts are not in place.
- A script dock that edits the script attached to the selected node, with the same open-and-save habits as Godot.

### Simulation

- Physics bodies are still available in `src/webgl/behaviors/physics`, but the starter scene no longer places any. A collision shape on a node, edited from the inspector, is the Godot-shaped version of that.
- Groups and signals.

## Conventions

- Editor UI lives in `src/editor/` as Vue single-file components, TypeScript, and plain CSS. Pinia is the store. The route `/editor` is the only editor page.
- Three.js objects stay in `EditorState`. The store keeps plain snapshots.
- Match Godot's names when the idea is the same (Energy, Look at, File system). Use the Three.js name when Godot has no equivalent (TSL, MeshStandardNodeMaterial).
