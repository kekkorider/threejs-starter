# Play mode

Play runs the scene and hides the editor chrome.
The top bar buttons are Play and Stop.
Play is `F5`.
Stop is `F8`.
The Game screen is the same mode.

## What Play changes

`setPlaying(true)` runs in `EditorState`.
The store then sets `screen` to `game`.

| Item | During Play |
| --- | --- |
| Docks and toolbar | Hidden. |
| Grid | Hidden. |
| Gizmo | Detached. |
| Selection boxes | Hidden. |
| Light, camera, and environment badges | Hidden. |
| Current camera | Becomes the view when one camera is Current. |
| Orbit | Off while a scene camera is the view. |

`setPlaying` emits `ready` on every node when Play starts.
Scene load does not emit `ready`.
Read [[Groups and signals]].

## Pause

Debug, then Pause Simulation, sets the timescale to 0.
`setPaused(true)` calls `starter.ctx.setTimescale(0)`.
Resume sets the timescale to 1.
Play also clears Pause when Play starts and Pause was on.

Pause has no shortcut key.
Stop sets the store pause flag to off.
Stop does not call `setPaused(false)`.
If you pause and then stop, the timescale can stay 0 until the next Play.

## Stop

`setPlaying(false)` shows the chrome again.
The gizmo returns when the tool is Move, Rotate, or Scale.
The screen returns to `3d` when it was `game`.
`Esc` also stops when the screen is `game`.

## What you cannot do during Play

The editor blocks save, load, and instance.
The editor blocks undo and redo.
The History panel disables its rows.
The editor does not record a new history step.

## Profiler

Debug, then Three.js Profiler, toggles the Three.js inspector.
`toggleProfiler` calls `inspector.setVisible`.
The profiler is the starter inspector module.
It is not a dock in this editor.

## See also

[[Cameras]]
[[Viewport]]
[[History]]
[[Keyboard shortcuts]]
