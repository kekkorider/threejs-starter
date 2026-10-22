# History

Undo and redo store full scene snapshots.
The class is `EditorHistory` in `src/editor/history.ts`.
The store methods are `record`, `undo`, `redo`, and `goToHistory`.

## Keys and buttons

| Control | Action |
| --- | --- |
| `Ctrl+Z` or `Cmd+Z` | Undo. |
| `Ctrl+Shift+Z` or `Cmd+Shift+Z` | Redo. |
| `Ctrl+Y` or `Cmd+Y` | Redo. |
| Scene menu | Undo and Redo. |
| Scene dock arrows | Undo and Redo. |
| History tab | Click a step to jump there. |

The first History row is `Scene`.
That row is the state before the steps.
Later rows use the action label.
A dim row is a redo step.
Click is `goToHistory`.

Open or load clears the list.
`EditorHistory.clear` drops past and future.

## What one step stores

A step is a `HistoryEntry`.

| Field | Meaning |
| --- | --- |
| `label` | The text in the History panel. |
| `before` | A `SceneFile` from before the edit. |
| `after` | A `SceneFile` from after the edit. |
| `beforeSelection` | Selection paths before the edit. |
| `afterSelection` | Selection paths after the edit. |
| `at` | The time in milliseconds. |

A selection path is child indexes from the root.
The last path is the active node.
`componentIndex` marks a selected component.

## Limits of the stack

The stack keeps 60 past steps.
`LIMIT` is 60.
A new step deletes the redo list.
The editor blocks undo during Play.
The editor blocks undo during a gizmo drag.
The editor blocks undo while a gesture is open.

## Merge

The same label inside 1000 ms becomes one step.
`MERGE_MS` is 1000.
A number scrub uses that merge.
A color drag uses that merge.
Some commands pass `merge: false` so they stay separate.

A no-op does not push a step.
`sameScene` compares fingerprints.
A number is rounded to 5 decimal places before compare.

## Gizmo drag

`beginGesture` stores the scene at mouse down.
`endGesture` stores the scene at mouse up.
That pair is one step.
The label is `Move`, `Rotate`, or `Scale`, plus the node name.
Several roots use `{count} nodes`.

Move and scale copy rotation from the end snapshot into the start snapshot.
That keeps a spinning mesh from landing in the undo step.
Rotate does not do that copy.
The comment in the store says a translate or scale drag should not rewind the cube spin.

## What is recorded

These edits call `record`.

- Transform fields, including a finished gizmo drag.
- Reparent, rename, duplicate, and delete.
- Create a node.
- Inspector edits for geometry, material, light, camera, environment, grid, and visibility.
- Group and signal edits.
- Instance and Make Local.
- Attach, move, or remove a component on a node.
- Component parameters and the enabled flag.
- TSL source edits.

## What is not recorded

These actions do not call `record`.

- Create a component resource.
- Apply in the Script dock or the Script screen.
- Delete a component file.
- Orbit the editor camera.
- Expand a tree row, change a filter, or switch a screen.
- Play, pause, and stop.

## Restore

Undo calls `restoreHistory`.
That loads the `before` snapshot.
`replaceGlobals` is true, so global groups follow the snapshot.
The dirty flag compares the scene with the last clean capture.

## See also

[[Scene files]]
[[Keyboard shortcuts]]
[[Components]]
[[Play mode]]
