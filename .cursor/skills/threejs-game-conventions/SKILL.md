---
name: threejs-game-conventions
description: >-
  Applies this repo's Three.js WebGPU game conventions: three-start modules and
  behaviours, TSL materials, crashcat, Koota beside three-start, and the library
  allow-list in ROADMAP.md. Use when adding or changing modules, behaviours,
  materials, physics, input, cameras, assets, audio, navigation, particles, HUD,
  or scene flow in threejs-starter.
---

# Three.js game conventions

Read [ROADMAP.md](../../../ROADMAP.md) before editing. Implement one phase per session. The out-of-scope list in that file is binding.

## Scene shell

three-start owns the renderer, the loop, modules, and behaviours. Koota, when phase 6 exists, owns simulation traits and syncs into `Object3D`. It does not replace three-start.

- Modules extend `ContextModule` from `three-start`. Lifecycle hooks already in use: `onAwake`, `onUpdate`, `onDestroy`. See [src/webgl/modules/Physics.ts](../../../src/webgl/modules/Physics.ts) and [src/webgl/modules/Input.ts](../../../src/webgl/modules/Input.ts).
- Register every module twice: `starter.addModules({ key: new Module() })` in [src/webgl/index.ts](../../../src/webgl/index.ts), and `ThreeStartRegister.modules` in [src/types.d.ts](../../../src/types.d.ts).
- Behaviours extend `Object3DBehaviour`. Attach with `addComponent(object, Behaviour, ...constructorArgs)` as in [src/webgl/index.ts](../../../src/webgl/index.ts).
- Import renderer and materials from `three/webgpu`. Import node helpers from `three/tsl`. Addons use `three/addons/...`.

## Physics behaviours

Rigid bodies live under [src/webgl/behaviors/physics/](../../../src/webgl/behaviors/physics/). `BodyBox`, `BodySphere`, `BodyTriangle`, and `BodyConvexHull` extend `Body`, which creates a crashcat `rigidBody` on `modules.physics.world`.

The character controller is a sibling class in that folder. It uses `kcc` from `crashcat` (`kcc.create`, `kcc.update`, `capsule.create`, `filter.forWorld`). It does not extend `Body`. Export it from [src/webgl/behaviors/physics/index.ts](../../../src/webgl/behaviors/physics/index.ts). Phase 5 in the roadmap has the exact calls.

`PhysicsModule` owns `world` and `settings`. Read gravity from `settings.gravity`. Leave `updateWorld` on the frame delta. A pause flag from the flow module may skip that call. Do not add a fixed timestep, raycast wrapper, sensor, or constraint while implementing another phase.

## Materials

Files in [src/webgl/materials/](../../../src/webgl/materials/) export one `Mesh*NodeMaterial`. Shared uniforms are module-scope exports, as `scale` is in `scale.ts`, so [src/webgl/modules/Inspector.ts](../../../src/webgl/modules/Inspector.ts) can bind them. Phase 13 aligns the three existing files. Leave `createPostProcessing` in `src/webgl/index.ts` as the debug MRT split.

## Events, tweens, time

- Module events (load progress, flow changes) use `eventemitter3`, already a dependency.
- GSAP tweens camera blends and HUD fades only. Per-frame simulation stays on `ctx.getDeltaTime()`.
- Input actions shipped by phase 3: `moveForward`, `moveBack`, `moveLeft`, `moveRight`, `jump`.

## Libraries

| Need                                                             | Use                                                                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| glTF Meshopt build                                               | `@gltf-transform/cli` and `meshoptimizer`                                                                     |
| glTF Meshopt runtime                                             | Three.js `MeshoptDecoder`, beside the existing Draco loader                                                   |
| KTX2 / Draco files already in the repo                           | Existing loaders and `/basis/`, `/draco/` paths                                                               |
| Character movement                                               | `crashcat` `kcc`                                                                                              |
| ECS                                                              | `koota`                                                                                                       |
| Music and UI audio                                               | `howler`                                                                                                      |
| Navmesh                                                          | `@recast-navigation/core`, plus `recast-navigation` for `init` and `@recast-navigation/generators` for baking |
| Frame time                                                       | `three-perf`, beside the Three.js inspector                                                                   |
| Particles, trails, HUD, scene flow, input actions, follow camera | Custom code in this repo                                                                                      |

Rejected packages and features are listed under "Out of scope" in [ROADMAP.md](../../../ROADMAP.md). Do not add them to finish a phase.
