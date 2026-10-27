# Limits

This page lists what the editor does not do.
The contributor list is also in [GODOT.md](https://github.com/kekkorider/threejs-starter/blob/game-engine/GODOT.md) under Not yet.

## Not yet

These nodes are not in `NODE_TYPES`.

- A skeleton, a bone, and an animation player.
- An audio listener and audio players.
- A 3D label, unless a later scene needs one.

These resource tools are not in the editor.

- A file tree on disk. The File system is a list in memory.
- Import settings for a model, a texture, or audio.
- Make Unique on every shared resource. Geometry and materials already have it.

These viewport and inspector tools are not in the editor.

- Animation keys on a property.
- A collision shape edited from the Inspector.

Physics behaviors still exist in `src/webgl/behaviors/physics`.
The starter scene does not place one.
The editor does not show a collision shape field.

## Storage limits

Scenes are in `localStorage`, not in a `.tscn` file on disk.
Clear the site data and the scenes are gone.
Component TypeScript source is only in memory.
Reload the page and a custom component source is gone.
The scene file still stores the component name.
Global groups use `threejs-starter.global-groups`.

## History limits

The stack keeps 60 steps.
Component create, script Apply, and component-file delete are not steps.
Orbit, filters, and screen changes are not steps.
Undo is off during Play and during a gizmo drag.

## Play limits

The editor blocks save, load, and instance during Play.
Stop after Pause does not call `setPaused(false)`.
The timescale can stay 0 until the next Play.

## Scene and instance limits

A mesh with several materials keeps the first material on save.
The editor warns.
A scene cannot instance itself.
A scene cannot instance a scene that instances it back.
You cannot edit an instanced child until you Make Local or open that scene.

## Signal limits

A custom signal has at most 8 arguments.
Nested `emitSignal` stops after 8 calls.
The log text is `Signal emit stopped after 8 nested calls.`
`connectSignal` from a script is not saved.
Scene load does not emit `ready` or `tree_entered`.

## UI that is present but idle

Project Settings is in the Project menu.
The editor disables that item.
Camera preview is not saved.
Script drafts are not saved.
The AssetLib screen only shows TSL presets.

## See also

[[Getting started]]
[[Components]]
[[History]]
[[Play mode]]
[[Home]]
