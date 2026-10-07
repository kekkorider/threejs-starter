# Game roadmap

This file is the working plan for turning the starter into a game-development base with a performance focus. Each phase is one later session. Finish the phase, check its done-when box, and stop. The next session starts at the first unchecked phase.

Conventions for every session live in:

- [.cursor/skills/threejs-game-conventions/SKILL.md](.cursor/skills/threejs-game-conventions/SKILL.md)
- [.cursor/skills/roadmap-phase/SKILL.md](.cursor/skills/roadmap-phase/SKILL.md)

Phase 1 ships with this file. The next implementation session starts at phase 2.

## Stack to keep

| Piece         | Choice                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| Renderer      | Three.js `0.186` via `three/webgpu` and `three/tsl`                                                    |
| Scene shell   | `three-start` modules and `Object3DBehaviour` components                                               |
| Physics       | `crashcat` `0.0.5`, world owned by [src/webgl/modules/Physics.ts](src/webgl/modules/Physics.ts)        |
| Tweens        | `gsap`, already installed, for camera and UI motion only                                               |
| Module events | `eventemitter3`, already installed                                                                     |
| Tooling       | Vite, TypeScript, pnpm, Node 24                                                                        |
| Debug view    | The MRT split in `createPostProcessing` inside [src/webgl/index.ts](src/webgl/index.ts) stays as it is |
| Debug camera  | [src/webgl/modules/OrbitControls.ts](src/webgl/modules/OrbitControls.ts) stays                         |

Every new module is registered on `ThreeStartRegister` in [src/types.d.ts](src/types.d.ts) and passed to `starter.addModules` in [src/webgl/index.ts](src/webgl/index.ts).

## Out of scope

These were considered and rejected. A session does not add them while doing an in-scope phase.

- Rendering toolkit: instancing helpers, `BatchedMesh`, `LOD`, object pooling, `three-mesh-bvh`
- Physics beyond a character controller: fixed timestep, interpolation, raycast wrappers, sensors, constraints
- Post-processing stack: bloom, SSAO, TAA, motion blur, or any replacement of the current debug MRT split
- glTF animation playback and `THREE.AnimationMixer`
- `bitECS` (simulation data uses Koota)
- `camera-controls`, and any new input library
- `three.quarks`, `three-nebula`, and other WebGL particle libraries
- `troika-three-text` as the default HUD (only if a later, explicit request needs text inside the scene)
- `XState`
- A GSAP ticker driving the simulation loop

## How a session runs

1. Read the two skills above and the single phase you are starting.
2. Touch only the files that phase names, plus [src/types.d.ts](src/types.d.ts) and [src/webgl/index.ts](src/webgl/index.ts) when the phase adds a module or a demo object.
3. Add the library that phase names. Where the phase says custom, add no dependency.
4. Stop when the done-when check is true. Leave the checkbox updated in this file.

## Status

- [x] Phase 1 — Conventions and skills
- [ ] Phase 2 — Asset loader and Meshopt pipeline
- [ ] Phase 3 — Input actions, gamepad, pointer lock
- [ ] Phase 4 — Follow camera
- [ ] Phase 5 — Character controller behaviour
- [ ] Phase 6 — Koota simulation
- [ ] Phase 7 — Howler audio
- [ ] Phase 8 — Recast navigation
- [ ] Phase 9 — TSL particles and trails
- [ ] Phase 10 — HTML HUD
- [ ] Phase 11 — Scene and level flow
- [ ] Phase 12 — three-perf beside the inspector
- [ ] Phase 13 — TSL material conventions

---

## Phase 1 — Conventions and skills

**Goal.** A later session can pick up any phase below without re-learning how modules, behaviours, and libraries fit together.

**Library.** Custom, no new dependency.

**Files.**

- [ROADMAP.md](ROADMAP.md)
- [.cursor/skills/threejs-game-conventions/SKILL.md](.cursor/skills/threejs-game-conventions/SKILL.md)
- [.cursor/skills/roadmap-phase/SKILL.md](.cursor/skills/roadmap-phase/SKILL.md)

**Steps.**

1. Keep three-start as the scene shell: modules extend `ContextModule`, behaviours extend `Object3DBehaviour`, and both are attached the way [src/webgl/index.ts](src/webgl/index.ts) already does.
2. Point the skills at this roadmap and at the real files: [src/webgl/modules/](src/webgl/modules/), [src/webgl/behaviors/](src/webgl/behaviors/), [src/webgl/materials/](src/webgl/materials/), [src/types.d.ts](src/types.d.ts).
3. Record the library allow-list and the out-of-scope list in the conventions skill so a session does not pull in a rejected package.
4. Record the material rule: node materials stay in `src/webgl/materials/` and import from `three/webgpu` and `three/tsl`. The tidy of those files is phase 13. The MRT debug view stays untouched.

**Done when.** Both skill files exist, name this roadmap, and a new session can implement phase 2 by following them. This phase ships with the roadmap, so the next session starts at phase 2 unless a convention in the skills is wrong.

---

## Phase 2 — Asset loader and Meshopt pipeline

**Goal.** Loading reports progress through events, assets can be released, and glTF can be compressed with Meshopt at build time while Draco and KTX2 still load.

**Library.** `@gltf-transform/cli` and `meshoptimizer` for the build step. Meshopt decodes faster than Draco on the models this pipeline produces. Runtime decoding stays on Three.js `MeshoptDecoder`, next to the existing `DRACOLoader`. Draco and KTX2 loaders stay for files that already use them.

**Files.**

- [src/webgl/modules/AssetLoader.ts](src/webgl/modules/AssetLoader.ts)
- [package.json](package.json) (devDependency and an `assets:optimize` script)
- A small script under [scripts/](scripts/) if the CLI needs a file list the npm script cannot express
- Existing public glTF, only as an input to the optimize command (keep a source copy)

**Steps.**

1. Give `AssetLoaderModule` an `eventemitter3` emitter. `LoadingManager.onProgress` emits `progress` with the url, loaded count, and total. Remove the `console.log` in that callback.
2. Add `unloadTexture`, `unloadModel`, `unloadHDR`, `unloadEXR`, and `unloadKTX` (or one `unload(kind, name)` if that stays clearer). Each one drops the map entry and calls `dispose()` on textures, and on geometries and materials the glTF loader created. Leave the shared materials in `src/webgl/materials/` alone; those are not owned by the loader.
3. After `setDRACOLoader`, call `setMeshoptDecoder` with Three.js `MeshoptDecoder` from `three/addons/libs/meshopt_decoder.module.js`. Keep `setDecoderPath('/draco/')` and the KTX2 transcoder path `/basis/`.
4. Add a pnpm script that runs `gltf-transform optimize` with Meshopt compression (`--compress meshopt`) from a source glTF to `public/`. Document the command in a comment at the top of the script or in the script's `--help` path, one line, so the next session knows which file is source and which is output.
5. Load one Meshopt-compressed glTF through the existing `loadModels` path and read it back with `getModel`.

**Done when.** Progress listeners fire without a console log, unloading a loaded texture or model removes it from the map and disposes it, a Meshopt glTF loads beside the existing Draco path, and `pnpm assets:optimize` produces that file. KTX2 loading still works.

---

## Phase 3 — Input actions, gamepad, pointer lock

**Goal.** Gameplay code asks for actions, not key codes. Keyboard, gamepad, and pointer lock all update the same module.

**Library.** Custom, no new dependency. Pointer lock uses Three.js `PointerLockControls` from `three/addons/controls/PointerLockControls.js`, the same addons path style as [src/webgl/modules/OrbitControls.ts](src/webgl/modules/OrbitControls.ts).

**Files.**

- [src/webgl/modules/Input.ts](src/webgl/modules/Input.ts)
- [src/webgl/index.ts](src/webgl/index.ts) only to bind a demo action and request lock on click

**Steps.**

1. Keep `isPressed(code)` working for the raw `KeyboardEvent.code` set.
2. Add an action map on the module. Ship these actions so later phases have a contract:
   - `moveForward`, `moveBack`, `moveLeft`, `moveRight` — `KeyW` `KeyS` `KeyA` `KeyD`, and gamepad axes from the left stick
   - `jump` — `Space` and gamepad button 0
3. Store the previous frame's action state. Expose `actionDown(name)`, `actionPressed(name)` (rose this frame), and `actionReleased(name)`. Poll `navigator.getGamepads()` inside `onUpdate` and fold buttons and sticks into that state. Treat a stick past a small deadzone as held.
4. Construct `PointerLockControls` with `ctx.camera` and `ctx.renderer.domElement`. Expose `lockPointer()` and `pointerLocked`. On unlock, clear look deltas. Remove the `window` listeners in `onDestroy`.
5. Expose look deltas accumulated while locked (`movementX` / `movementY`), then zero them after read or at the end of the frame so phase 4 can consume them once.
6. Leave `OrbitControls` enabled in this phase. Pointer lock here tracks the lock and the deltas. Phase 4 owns where the camera sits.

**Done when.** Holding W or pushing the left stick reports `moveForward`, a single space tap reports `actionPressed('jump')` for one frame only, click-to-lock sets `pointerLocked`, and leaving the page removes the key listeners.

---

## Phase 4 — Follow camera

**Goal.** A follow camera can track an `Object3D` while orbit controls remain available for debug.

**Library.** Custom, no new dependency. GSAP, already installed, is used only for the blend when follow mode turns on or off. The per-frame follow is a normal `onUpdate`.

**Files.**

- [src/webgl/modules/FollowCamera.ts](src/webgl/modules/FollowCamera.ts) (new)
- [src/types.d.ts](src/types.d.ts)
- [src/webgl/index.ts](src/webgl/index.ts)
- [src/webgl/modules/OrbitControls.ts](src/webgl/modules/OrbitControls.ts) only if a public `setEnabled` is needed; `controls.enabled` is already public and is enough

**Steps.**

1. Add `FollowCameraModule` with `setTarget(object)`, `setEnabled(on)`, an offset in target-local space, and a look-at height.
2. While enabled, set `modules.orbitControls.controls.enabled = false` and place the camera from the target position, the offset, and the yaw accumulated from phase 3 look deltas. While disabled, set orbit controls enabled again.
3. Use a short GSAP tween only when `setEnabled` flips, from the current camera pose toward the follow pose (or back toward the orbit pose). After the tween, `onUpdate` owns the camera.
4. Point the demo at an existing mesh (the cube or Suzanne) so follow mode can be toggled from the inspector or a key that is not in the move map.

**Done when.** Enabling follow frames the target and mouse-look yaws that frame while the pointer is locked. Disabling follow returns control to orbit. The simulation loop is still `ThreeStart`'s update, not a GSAP ticker.

---

## Phase 5 — Character controller behaviour

**Goal.** A mesh walks on the existing crashcat world through a three-start behaviour, using crashcat's kinematic character controller.

**Library.** `crashcat`, already installed. Use the `kcc` namespace (`import { capsule, filter, kcc } from 'crashcat'`). The `kcc` API is the engine's character controller: it slides on walls, steps stairs, and sticks to slopes. It is not a rigid body, so this behaviour does not extend [src/webgl/behaviors/physics/Body.ts](src/webgl/behaviors/physics/Body.ts). `Body` creates a `rigidBody` and syncs that. A character is a sibling behaviour with the same file layout and `addComponent` call shape as `BodyBox` and `BodySphere`.

**Files.**

- [src/webgl/behaviors/physics/CharacterController.ts](src/webgl/behaviors/physics/CharacterController.ts) (new)
- [src/webgl/behaviors/physics/index.ts](src/webgl/behaviors/physics/index.ts)
- [src/webgl/index.ts](src/webgl/index.ts) for one demo mesh on the existing floor

**Steps.**

1. Read `kcc.d.ts` in the installed `crashcat` package before coding. The calls this phase uses are `capsule.create`, `kcc.create`, `kcc.createDefaultUpdateSettings`, `filter.forWorld`, `kcc.update`, `kcc.isSupported`, and `kcc.remove` if an inner body was added. Confirm signatures there if the package has moved.
2. `class CharacterController extends Object3DBehaviour`. Constructor args follow the body behaviours: a small params object `{ radius, halfHeightOfCylinder, maxSlopeAngle? }`. Default radius and cylinder half-height match a person-sized capsule standing on the floor in the current scene.
3. `onAwake`: build the capsule with `capsule.create({ radius, halfHeightOfCylinder })`, then `kcc.create(settings, position, quaternion)` from the object's world transform. Build the filter with `filter.forWorld(modules.physics.world)`. Store `kcc.createDefaultUpdateSettings()`. Leave `innerRigidBody` unset. `kcc.add` is only for an inner body, and this phase does not need raycast or sensor visibility.
4. `onUpdate`: read `moveForward`, `moveBack`, `moveLeft`, `moveRight`, and `jump` from `modules.input`. Build a wish velocity on the XZ plane from the camera yaw when follow mode is on, otherwise from world axes. Write it to `character.linearVelocity`. When `jump` was pressed this frame and `kcc.isSupported(character)` is true, set an upward velocity. Call `kcc.update(world, character, dt, gravity, updateSettings, undefined, characterFilter)` with `dt` from `ctx.getDeltaTime()` and `gravity` from `modules.physics.settings.gravity`.
5. After `kcc.update`, copy `character.position` and `character.quaternion` onto the object, the same idea as `Body.onBeforeRender` for dynamic bodies. `onBeforeRender` is the right hook if `onUpdate` runs before the render, matching `Body`.
6. `onDestroy`: if `kcc.add` was ever called, call `kcc.remove`. Do not dispose the mesh geometry and do not `removeFromParent` the object. That cleanup belongs to whoever added the mesh. (`Body.onDestroy` currently does both; the character behaviour does not copy that.)
7. Demo: a capsule or box mesh, `addComponent(mesh, CharacterController, params)`, standing on the existing static floor. Bump a small static box so a step is visible.

**Done when.** WASD and the left stick move the mesh across the floor, the mesh steps onto a low box, walks down without floating off the slope, and falls when it leaves the floor. Jump works once per press while `kcc.isSupported` is true. No fixed timestep, raycast API, sensor, or constraint is added.

---

## Phase 6 — Koota simulation

**Goal.** A Koota world owns a bit of simulation data and copies it onto `Object3D`s. three-start still owns modules, behaviours, and the render loop.

**Library.** `koota`. It is the ECS chosen for this repo: simulation state lives in traits, and a sync pass writes Three.js objects. three-start behaviours such as `Spin`, `CharacterController`, and the physics bodies stay behaviours.

**Files.**

- [src/webgl/modules/Simulation.ts](src/webgl/modules/Simulation.ts) (new)
- [src/webgl/simulation/](src/webgl/simulation/) for traits and the one example system (new)
- [src/types.d.ts](src/types.d.ts)
- [src/webgl/index.ts](src/webgl/index.ts)

**Steps.**

1. Read the installed `koota` README before coding and use its current `createWorld`, `trait`, `spawn`, and `query` APIs. Do not add a second ECS.
2. `SimulationModule extends ContextModule`. Create the world in `onAwake`. Run scheduled systems from `onUpdate` with `ctx.getDeltaTime()`.
3. Define a `Position` trait and a `SpinSpeed` trait (plain numeric fields). Spawn one entity and keep a `Map` from entity id to the `Object3D` it drives.
4. One system updates `Position` from `SpinSpeed` and delta time. A second system, still inside this module's update, writes `Position` onto the mapped object's position. That second system is the only bridge to Three.js.
5. Demo with a mesh that is not the physics character and not a `Body*` component, so the example cannot be confused with crashcat sync.
6. Do not move `CharacterController`, `Body`, or `Spin` into Koota in this phase.

**Done when.** The demo mesh moves because a Koota system changed a trait and the sync system wrote the object. Removing the `SimulationModule` leaves physics, input, and the follow camera working.

---

## Phase 7 — Howler audio

**Goal.** Music and UI sounds play through one module, with separate volumes.

**Library.** `howler`. It is the audio dependency for this roadmap: one Web Audio graph for music and UI, with per-sound volume. Three.js `PositionalAudio` stays unused in this phase. Howler's own `pos()` is enough if a sound needs a world position.

**Files.**

- [src/webgl/modules/Audio.ts](src/webgl/modules/Audio.ts) (new)
- [src/types.d.ts](src/types.d.ts)
- [src/webgl/index.ts](src/webgl/index.ts)
- One short music file and one UI file under `public/` (generated tone or a tiny asset already allowed by the repo; do not commit a large pack)

**Steps.**

1. `AudioModule` holds two groups: `music` and `ui`. Each group has its own volume. `playMusic(name)` and `playUi(name)` return control enough to stop the sound.
2. Resume the audio context on the first pointer or key event. Browsers block playback until then. The input module can emit through `eventemitter3`, or the audio module can listen once for a pointerdown on the canvas.
3. Master mute and per-group volume are methods on the module. Phase 10's HUD will call them; expose them now.
4. Play the UI sound from the `jump` action press, and start music when the scene mounts, so both groups are exercised.

**Done when.** Music and the jump sound can be heard, each group volume changes independently, and mute silences both. No `THREE.Audio` or `PositionalAudio` node is created.

---

## Phase 8 — Recast navigation

**Goal.** A walkable navmesh can be built from a scene mesh, and a query can return a path.

**Library.** `@recast-navigation/core`, the navigation runtime from the same author as crashcat. WASM startup comes from the `recast-navigation` package (`init`). Baking a mesh uses `@recast-navigation/generators` (`generateSoloNavMesh`) when that function is not exported from core. Confirm those exports at the start of the session. Do not add `@recast-navigation/three` or a different navigation library.

**Files.**

- [src/webgl/modules/Navigation.ts](src/webgl/modules/Navigation.ts) (new)
- [src/types.d.ts](src/types.d.ts)
- [src/webgl/index.ts](src/webgl/index.ts)

**Steps.**

1. `await init()` once during module startup, before any bake. `ThreeStart` mount is already async in [src/webgl/index.ts](src/webgl/index.ts); expose `modules.navigation.ready` so the demo awaits it.
2. Bake a solo navmesh from the floor mesh positions and indices (`generateSoloNavMesh` or the core equivalent). Store the navmesh on the module.
3. Expose `findPath(from, to): Vector3[]` using the core query types. Return an empty array when the query fails.
4. Draw the path with a temporary `Line` in the demo, or log the waypoint count in the inspector. Do not move `CharacterController` along the path in this phase. A later session can connect them.
5. Dispose the navmesh when the module is destroyed.

**Done when.** A path between two points on the floor returns more than one waypoint, and a point off the floor fails cleanly. The character still moves only from input.

---

## Phase 9 — TSL particles and trails

**Goal.** A GPU particle burst and a trail, both written in TSL on the WebGPU renderer.

**Library.** Custom, no new dependency. `three/tsl` and `three/webgpu` already run on this renderer. WebGL particle libraries target a different renderer.

**Files.**

- [src/webgl/vfx/Particles.ts](src/webgl/vfx/Particles.ts) (new)
- [src/webgl/vfx/Trail.ts](src/webgl/vfx/Trail.ts) (new)
- [src/webgl/index.ts](src/webgl/index.ts) to spawn one burst and attach one trail

**Steps.**

1. Particles: one `InstancedMesh` or `Points` node material. Store age and seed per index in an instanced attribute or a storage buffer. The position node integrates a simple velocity from those attributes and a `time` uniform. Respawn when age exceeds life.
2. Trigger one burst from code (a function `emit(origin, count)`). Reuse the same geometry and material for later bursts.
3. Trail: a ribbon mesh whose positions follow an array of recent world positions sampled from a target object (the character, if phase 5 is done, otherwise the spinning cube). Update the buffer in `onUpdate` and mark `needsUpdate`.
4. Keep both effects free of post-processing. They render in the main scene pass, so the existing MRT debug view can show them.

**Done when.** A burst appears and dies, a second burst reuses the same mesh, and a trail follows a moving object. No particle package is added to `package.json`.

---

## Phase 10 — HTML HUD

**Goal.** A DOM overlay shows a few gameplay readouts over the canvas.

**Library.** Custom, no new dependency. HTML over the canvas is the HUD. `troika-three-text` is not part of this phase. Add it only if a future request explicitly needs glyphs inside the 3D scene. GSAP may fade the root element in and out.

**Files.**

- [index.html](index.html) for a root node, or create that node from the module
- [src/style.css](src/style.css)
- [src/webgl/modules/Hud.ts](src/webgl/modules/Hud.ts) (new)
- [src/types.d.ts](src/types.d.ts)
- [src/webgl/index.ts](src/webgl/index.ts)

**Steps.**

1. A single overlay element, `pointer-events: none`, positioned over `#app`. Children that are buttons (mute) set `pointer-events: auto` on themselves.
2. `HudModule` exposes `setStatus(text)`, `setPrompt(text)`, and `setMuted(on)` so phase 11 can drive it without querying the DOM.
3. Show a status line and a mute control. Mute calls `modules.audio.setMuted` when phase 7 is present. If audio is not loaded yet, the control still toggles local state and calls audio when the module exists.
4. Fade the overlay with GSAP when `setVisible` changes.

**Done when.** The overlay is visible over the canvas, status text changes from code, and the mute control is clickable without blocking orbit or pointer lock on the rest of the canvas.

---

## Phase 11 — Scene and level flow

**Goal.** The app can boot, play, and pause, and it can drop a level's assets.

**Library.** Custom, no new dependency. A small module is enough. XState is a larger machine than these three states need.

**Files.**

- [src/webgl/modules/Flow.ts](src/webgl/modules/Flow.ts) (new)
- [src/types.d.ts](src/types.d.ts)
- [src/webgl/index.ts](src/webgl/index.ts)
- [src/webgl/modules/Physics.ts](src/webgl/modules/Physics.ts) only to honor a pause flag
- [src/webgl/modules/Hud.ts](src/webgl/modules/Hud.ts) to show the state

**Steps.**

1. States are `boot`, `play`, and `pause`. `FlowModule` emits changes with `eventemitter3`.
2. `boot` waits until the assets for the current level have loaded, then enters `play`.
3. `pause` sets a flag `PhysicsModule` reads at the top of `onUpdate` and returns before `updateWorld`. The character behaviour reads the same flag and skips `kcc.update`. The renderer keeps drawing. Orbit and the HUD stay active.
4. `loadLevel(name)` / `unloadLevel()` call the asset loader's unload methods from phase 2 for that level's models and textures, then load the next set. One demo level is enough: the current scene contents.
5. Push the state string through `HudModule.setStatus`.

**Done when.** Pause freezes physics and the character and a second pause press resumes them. Unload removes the level's loaded assets from the loader maps. The HUD shows `boot`, `play`, or `pause`.

---

## Phase 12 — three-perf beside the inspector

**Goal.** CPU and GPU frame time are visible while the Three.js inspector still debugs passes.

**Library.** `three-perf`. It reads WebGPU timestamps as well as CPU time, which the DOM FPS counter in older stats builds does not. The inspector in [src/webgl/modules/Inspector.ts](src/webgl/modules/Inspector.ts) stays.

**Files.**

- [src/webgl/modules/Inspector.ts](src/webgl/modules/Inspector.ts) or a sibling [src/webgl/modules/Stats.ts](src/webgl/modules/Stats.ts) if keeping the inspector file to GUI parameters is cleaner
- [src/types.d.ts](src/types.d.ts) if a new module is added
- [src/webgl/index.ts](src/webgl/index.ts) only if the module must be registered there

**Steps.**

1. Confirm the current `three-perf` constructor against its README (`trackGPU`, `init(renderer)`, `update` per frame).
2. Add the panel on the opposite corner from the Three.js inspector so the two UIs do not stack.
3. Call `update` from the module `onUpdate` or from the render loop the module already has access to via `ctx`.
4. Leave renderer.info and the inspector parameter for `scale` in place. This phase does not add instancing, batching, LOD, or BVH work.

**Done when.** The stats panel shows CPU and GPU time while the inspector still opens and the MRT debug view is unchanged.

---

## Phase 13 — TSL material conventions

**Goal.** The existing node materials follow one file shape, so later materials match them.

**Library.** Custom, no new dependency. Materials stay on `three/tsl` and `three/webgpu`.

**Files.**

- [src/webgl/materials/normal.ts](src/webgl/materials/normal.ts)
- [src/webgl/materials/matcap.ts](src/webgl/materials/matcap.ts)
- [src/webgl/materials/scale.ts](src/webgl/materials/scale.ts)
- [.cursor/skills/threejs-game-conventions/SKILL.md](.cursor/skills/threejs-game-conventions/SKILL.md) if the written pattern changes

**Steps.**

1. One file per material. Export a single `Mesh*NodeMaterial` instance (the pattern already used by `NormalMaterial`, `MatcapMaterial`, and `ScaleMaterial`).
2. Shared uniforms and nodes are module-scope exports, as `scale` is today, so the inspector can bind them.
3. Align import quotes and the export name with the rest of `src/webgl/`. Do not introduce a material factory or a new lighting model in this phase.
4. Write the resulting pattern into the conventions skill in a few lines.
5. Leave `createPostProcessing` in [src/webgl/index.ts](src/webgl/index.ts) unchanged.

**Done when.** All three material files match the pattern in the skill, the cube, floor, and Suzanne still render, and no post-processing pass was added.
