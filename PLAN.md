# Editor frontend

The editor UI is a Vue application. The Three.js scene stays in the same JavaScript realm as that UI. An iframe is the wrong boundary for this editor.

## Why an iframe does not fit

The editor does not look at a picture of the scene. It mutates the live Three.js graph:

- TransformControls, OrbitControls, and raycasting all need the canvas, the camera, and the pointer events in one document.
- TSL materials are compiled and assigned onto meshes that already exist in that scene.
- The grid, selection box, and gizmo are objects in the same scene, shown only while editing.
- Resize, play/pause timescale, and viewport shading talk to the one `ThreeStart` instance.

An iframe would put the scene in a second document. Every pick, gizmo drag, material compile, and resize would have to be reimplemented across `postMessage`, and the page would boot the singleton scene twice. That replaces the editor instead of hosting it.

## What we do instead

One Vite app, one Vue Router history:

| Route | What it shows |
| --- | --- |
| `/` | The scene, full window, with a link to the editor. No docks, gizmos, or grid. |
| `/editor` | The Godot-style editor. The same canvas is mounted into the 3D viewport. |

`bootScene()` builds the world once. Later calls move that canvas with `unmount()` / `mount()` on the same `ThreeStart` instance. Leaving a route releases the canvas only if that route still owns it, so a fast navigation cannot tear down the page that just took over.

The first visit to `/editor` wraps the existing objects in a `World` group and adds the editor lights, grid, and gizmo. Leaving `/editor` hides that chrome and keeps every mesh the user created. Coming back shows the same world. `/` after a visit to the editor is the edited scene, not a second copy.

`EditorState` remains the non-reactive Three.js engine. The Pinia store is the facade Vue reads: it keeps plain snapshots, calls into `EditorState`, and bumps a revision after mutations. Three.js objects are never placed in reactive state. Transform fields refresh from a frame tick and skip the input that is focused.

## Layout

- `src/main.ts` mounts Vue, Pinia, and the router.
- `src/editor/App.vue` is the router outlet.
- `src/editor/pages/ScenePage.vue` and `EditorPage.vue` are the two routes.
- `src/editor/stores/editor.ts` is the Pinia store.
- `src/editor/components/` holds the docks, viewport, inspector, dialogs, and the TSL code editor. Each file is an SFC with a TypeScript script. Shared chrome lives in `src/editor/editor.css` (plain CSS). A component adds a `<style>` block only for rules that belong to it.
- `src/editor/state.ts`, `geometry.ts`, `tsl.ts`, and `icons.ts` stay the engine behind the components.
- `src/webgl/` is unchanged apart from making `bootScene()` safe to call from both routes.
