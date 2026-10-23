---
name: translate-godot
description: >-
  Translates a Godot 4 editor feature into this Three.js editor and matches
  Godot's layout, names, shortcuts, defaults, and saved data as far as the
  editor can use them. Use when porting, translating, or adding a Godot
  feature, dock, node, inspector property, shortcut, signal, or scene-tree
  action in threejs-starter.
---

# Translate a Godot feature

When the agent translates a Godot feature to ThreeJS, it tries to match as much as it can.

Read [GODOT.md](../../../GODOT.md) before editing. It lists what already exists and what is still missing. [PLAN.md](../../../PLAN.md) is why the scene and the editor share one canvas.

## Match

1. Name the Godot 4 feature. List its pieces: where it sits, what it is called, the shortcut, the default value, what the scene file stores, and what changes while playing.
2. Implement every piece this editor can host. Reuse the dock, dialog, inspector, scene file, history, and signals that already exist.
3. A control Godot shows is a control this editor shows. A shortcut Godot binds is a shortcut this editor binds. A value Godot saves is a value the scene file saves. A step Godot can undo is a history step.
4. Stop at a piece the editor cannot use. Name that piece and why. Leave it under **Not yet**. Do not ship a stand-in for it.

A half-wired feature stays off. Do not add a Godot feature the editor cannot actually use.

## Names

Match Godot's names when the idea is the same (Energy, Look at, File system). Use the Three.js name when Godot has no equivalent (TSL, MeshStandardNodeMaterial). Visible node names do not use a `3D` suffix.

## Where it goes

Editor UI is Vue single-file components, TypeScript, and plain CSS. Pinia is the store. `/editor` is the only editor page.

| Concern | File |
| --- | --- |
| Live Three.js graph | `src/editor/state.ts` |
| Vue snapshots, menus, history | `src/editor/stores/editor.ts` |
| Docks and inspector | `src/editor/components/` |
| Shared chrome | `src/editor/editor.css` |

Three.js objects stay in `EditorState`. The store keeps plain snapshots. Scene runtime changes still follow [threejs-game-conventions](../threejs-game-conventions/SKILL.md).

## After it works

Move the feature from **Not yet** to **Already in place** in [GODOT.md](../../../GODOT.md). Write only the behavior the editor has. Exercise that behavior in `/editor` before treating the port as done.
