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
- Create Node dialog, grouped as Node, Mesh, Camera, and Light.
- Right-click menus on the scene tree and on inspector values.

### Scene tree

- A World root.
- Node kinds: Node, MeshInstance, Camera, DirectionalLight, OmniLight, SpotLight, HemisphereLight. Visible names do not use a `3D` suffix.
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
- A camera draws its frustum and a Camera badge. The badge hides while you look through that camera.
- Directional and spot lights also draw an arrow along the direction they shine (local -Z). Omni and hemisphere lights have no single aim, so they do not get an arrow.
- Shaded draws the picture. Debug Split replaces it with four labeled quadrants: shaded color (top-left), camera distance (top-right, closer is darker and anything past about 32 m stays white), view-space normals (bottom-left), and motion since the previous frame (bottom-right, still pixels gray).

### Inspector

- Property filter.
- Transform. New meshes start at position `[0, 0, 0]`, rotation `[0, 0, 0]`, scale `[1, 1, 1]`.
- Geometry type and parameters, including shared geometry.
- Material name, TSL preset, cull mode, transparency, and wireframe. The name is the file-system path.
- Light color, energy, range, spot angle, penumbra, and Look at for directional and spot lights.
- Camera projection, Perspective or Orthographic. Perspective edits FOV, aspect, focus, film gauge, film offset, and focal length, and shows effective FOV, film width, and film height. Orthographic edits left, right, top, and bottom. Both edit near, far, zoom, layers, and view offset (enabled, full width, full height, offset, width, height). Sync Viewport fits the picture to the window while that camera is the view. Current is the camera Play uses. Preview looks through it in the editor.
- Visibility, cast shadow, and receive shadow.
- On World: background color and intensity, environment intensity, shadows on or off, shadow type (Basic, PCF, VSM), and the grid.
- Right-click a value and choose Reset to restore the value it was created with.

### Scene file

- Save Scene and Load Scene write the node tree, transforms, geometry, materials, light settings, camera settings, component parameters, and the World background, shadows, and grid. Ctrl+Shift+S saves the open scene, and Ctrl+Shift+L loads it. The scene tab shows `(*)` until that save.
- The File system lists saved scenes. The open scene uses that path (`res://World.tscn` until Save Scene As), and the scene tab shows the same file. Ctrl+Alt+S saves to another `res://` path. Click a scene file to open it. An unsaved scene asks before it is replaced.
- Drag a saved scene onto a node, or choose Scene → Instance Scene (Ctrl+Shift+A), to place it as a child. The instance stays linked to that scene. Make Local copies the nodes into the open scene. A scene cannot instance itself or a scene that instances it.

### Resources

- Primitive meshes under `res://meshes`.
- TSL materials under `res://materials`, with presets (Lit, Metal, UV, Checker, and the others in the create dialog).
- The starter floor uses the UV preset and sits at `[0, 0, 0]`. The starter cube sits at `[0, 1.5, 0]`.

### Lighting

- Default hemisphere fill and a directional light that looks at the origin and casts shadows.
- The floor is a lit standard material, so shadows are visible. The starter meshes cast shadows.
- Directional shadow coverage is wide enough for the floor. Spot and point lights cast shadows.
- Point and spot energy stays bright out to Range instead of falling off with inverse-square decay.

### Components

- Components are three-start behaviors (`Object3DBehaviour`) stored as TypeScript files under `res://components`.
- Create one from Scene → Create Component, Ctrl/Cmd+C, or a scene-tree right click → Add Component. The dialog matches Create New Node, lists components that already exist, and can add the selected one to the current object.
- A new component file includes `onAwake`, `onStart`, `onEnable`, `onDisable`, `onUpdate`, `onBeforeRender`, `onAfterRender`, and `onDestroy`.
- Drag a component from the File system, or from that dialog, onto any object in the scene tree to attach it. Drag it from one object onto another to move it.
- Delete a component from the create dialog or the File system. If any object uses it, a warning lists those components before it is removed.
- Double-click a component in the scene tree, or right-click it and choose Edit, to open it in the Script tab. Open scripts are listed on the left. Closing one removes it from that list and leaves the file in the project.
- Apply writes the open TypeScript file and stays disabled until the source changes. Enter keeps the current indentation. The Applied label fades out after a second.
- The inspector edits a component's parameters, such as Spin's axis and speed.

### History

- Undo and redo for inspector edits, transforms, create, delete, and reparent. Ctrl+Z undoes. Ctrl+Shift+Z and Ctrl+Y redo. Scene → Undo and Scene → Redo, and the back and forward buttons on the Scene dock, do the same.
- The History panel lists each step. Pick one to jump back or forward. A gizmo drag, a number scrub, or a color drag is a single step.
- Duplicate, instancing, Make Local, and adding, moving, or removing a component are steps too. Loading or opening a scene clears the list.

## Not yet

Build these in an order that keeps the editor usable. A half-wired Godot feature is worse than leaving it off.

### Nodes still missing

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

- TSL remains the material script. A Godot-style script dock for the selected node is not in place.

### Simulation

- Physics bodies are still available in `src/webgl/behaviors/physics`, but the starter scene no longer places any. A collision shape on a node, edited from the inspector, is the Godot-shaped version of that.
- Groups and signals.

## Conventions

- Editor UI lives in `src/editor/` as Vue single-file components, TypeScript, and plain CSS. Pinia is the store. The route `/editor` is the only editor page.
- Three.js objects stay in `EditorState`. The store keeps plain snapshots.
- Match Godot's names when the idea is the same (Energy, Look at, File system). Use the Three.js name when Godot has no equivalent (TSL, MeshStandardNodeMaterial).
