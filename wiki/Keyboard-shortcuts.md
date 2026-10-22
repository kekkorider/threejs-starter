# Keyboard shortcuts

The handler is `onKeyDown` in `src/editor/stores/editor.ts`.
`EditorPage.vue` listens on `window`.
Help, then Editor Shortcuts, shows the same list in `HelpDialog.vue`.

`Ctrl` and `Cmd` both match.
The menu labels print `Ctrl`.

## When keys do nothing

The editor ignores most keys while you type.
A target is typing when it is `INPUT`, `TEXTAREA`, or `contentEditable`.

These shortcuts still run while you type:

| Keys | Action |
| --- | --- |
| `Ctrl+Alt+S` | Save Scene As. |
| `Ctrl+Shift+S` | Save Scene. |
| `Ctrl+Shift+L` | Load Scene. |
| `Ctrl+S` | Apply the TSL material. |

Other shortcuts wait until the dialogs are closed.
Those dialogs are Create Node, Create Component, Help, and the scene file dialog.

## Scene commands

| Keys | Action |
| --- | --- |
| `Ctrl+Z` | Undo. |
| `Ctrl+Shift+Z` | Redo. |
| `Ctrl+Y` | Redo. |
| `Ctrl+Shift+S` | Save the open scene. |
| `Ctrl+Alt+S` | Save the scene to another path. |
| `Ctrl+Shift+L` | Load the open scene from storage. |
| `Ctrl+Shift+A` | Instance a saved scene. |
| `Ctrl+A` | Create a node. |
| `Ctrl+C` | Create a component. |
| `Ctrl+D` | Duplicate the selection. |
| `Delete` or `Backspace` | Delete the selected component, or delete the selected nodes. |
| `F2` | Rename the active node. |
| `F` | Frame the selection. |

`Ctrl+S` compiles the bound TSL material.
It does not save the scene.
Use `Ctrl+Shift+S` to save the scene.

## Viewport tools

| Keys | Action |
| --- | --- |
| `Q` | Select. |
| `W` | Move. |
| `E` | Rotate. |
| `R` | Scale. |
| `Y` | Toggle snap. |
| `F5` | Play. |
| `F8` | Stop. |
| `Esc` | Close a dialog, a menu, or Help. |
| `Esc` on the Game screen | Stop Play. |

`Y` toggles snap only when Ctrl and Cmd are up.
`Ctrl+Y` is redo.

## Pointer shortcuts

| Pointer | Action |
| --- | --- |
| Shift+click | Add to the selection. |
| Ctrl+click or Cmd+click | Toggle a node. |
| Drag in Select mode | Draw a selection rectangle after 5 pixels. |
| Right-drag in Select or List | Orbit. |
| Alt+right-click | List the nodes under the cursor. |

Drag a scene-tree row onto a node to reparent it.
Drag a saved scene from the File system onto a node to instance it.
Drag a component onto an object to attach it.
Double-click a component to edit it in the Script screen.

## Not on the keyboard

Pause is in the Debug menu.
It has no shortcut key.
The Three.js profiler has no shortcut key.
The editor disables Project Settings.

## See also

[[Viewport]]
[[History]]
[[Play mode]]
[[TSL]]
