---
name: roadmap-phase
description: >-
  Implements exactly one phase from ROADMAP.md in threejs-starter and stops at
  that phase's done-when check. Use when the user asks to start, continue, or
  implement a roadmap phase, or names a phase such as assets, input, follow
  camera, character controller, Koota, Howler, recast, particles, HUD, scene
  flow, three-perf, or TSL materials.
---

# One roadmap phase

## Start

1. Read [ROADMAP.md](../../../ROADMAP.md) and [threejs-game-conventions](../threejs-game-conventions/SKILL.md).
2. Pick the first unchecked phase, unless the user named a phase.
3. If an earlier phase's files are missing and this phase calls them, stop and say which phase has to land first. Do not implement the missing phase in the same session.

Phase 1 (skills) already ships with the roadmap. The next session starts at phase 2.

## During the session

- Follow that phase's steps. Touch the files it names. Update [src/types.d.ts](../../../src/types.d.ts) and [src/webgl/index.ts](../../../src/webgl/index.ts) when the phase adds a module or a demo object.
- Add only the library that phase names. "Custom, no new dependency" means `package.json` gains no packages.
- Match existing style: `ContextModule` and `Object3DBehaviour`, imports from `three/webgpu`, `three/tsl`, and `three/addons/...`.
- Confirm third-party signatures against the installed package at the start of the phase (`koota`, `kcc` types, `three-perf`, recast exports). The roadmap names the intended calls; the installed types win if they differ.
- Leave rejected work undone. The out-of-scope list in the roadmap includes a rendering toolkit, physics features other than the character controller, a post-processing stack, and glTF animation.

## Finish

1. Run the phase's done-when check. Exercise the behaviour in the running app when the phase changes what the user sees (input, camera, character, audio, HUD, particles, pause).
2. Mark that phase's checkbox in [ROADMAP.md](../../../ROADMAP.md).
3. Stop. Do not start the next phase.

## Phase index

| Phase | One-line scope                                                             |
| ----- | -------------------------------------------------------------------------- |
| 1     | Skills and conventions. Already in `.cursor/skills/`                       |
| 2     | Asset progress events, unload, Meshopt decoder, `gltf-transform` script    |
| 3     | Action map, gamepad, `PointerLockControls` on `InputModule`                |
| 4     | `FollowCameraModule`. Orbit stays the debug camera                         |
| 5     | `CharacterController` behaviour via crashcat `kcc`. Does not extend `Body` |
| 6     | `SimulationModule` with Koota traits and one Object3D sync system          |
| 7     | `AudioModule` with Howler music and UI groups                              |
| 8     | `NavigationModule` with `@recast-navigation/core` path queries             |
| 9     | TSL particles and a trail under `src/webgl/vfx/`                           |
| 10    | HTML `HudModule`. DOM overlay, not troika                                  |
| 11    | `FlowModule`: boot, play, pause, level unload                              |
| 12    | `three-perf` beside `InspectorModule`                                      |
| 13    | Align `src/webgl/materials/` to one node-material file shape               |
