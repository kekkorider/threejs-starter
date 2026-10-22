# Scene files

A scene file is a `SceneFile` with `version` 1.
The code is `src/editor/sceneFile.ts`.
The bytes live in `localStorage` under `threejs-starter.scene-files`.
Read [[Scene file format]] for every field.

## Paths

A path matches this pattern:

```text
res://(?:[A-Za-z0-9_-]+/)*[A-Za-z0-9_-]+.tscn
```

`normalizeScenePath` accepts three inputs.

| You type | Result |
| --- | --- |
| `Name` | `res://Name.tscn` |
| `Name.tscn` | `res://Name.tscn` |
| `res://folder/Name.tscn` | The same path. |

`normalizeScenePath` rejects a path that contains `..`.
Backslashes become slashes.

The first open path is `res://World.tscn`.
`OPEN_SCENE_PATH` holds that string.

## Save

1. Choose Scene, then Save Scene.
2. Or press `Ctrl+Shift+S` or `Cmd+Shift+S`.

`saveOpenScene` writes the current tree.
The editor blocks save during Play.
The scene tab drops `(*)` after a successful save.

Save Scene As uses `Ctrl+Alt+S`.
The dialog asks for a `res://` path.
`saveSceneAs` writes that path and opens it.

## Load

Choose Scene, then Load Scene.
Or press `Ctrl+Shift+L` or `Cmd+Shift+L`.
Load reads the open path from storage.
The menu disables the command until that path has a saved file.
The editor blocks load during Play.
Load clears the history list.

## Open another scene

Click a scene row in the File system.
If the open scene is dirty, the editor asks you to save, discard, or cancel.
Discard drops the unsaved edits.
Cancel leaves the open scene in place.

The open row shows `(*)` while it is dirty.
A scene that was never saved can appear in the list before `saved` is true.

## Delete a scene file

Use the delete control on a saved row that is not open.
The open scene cannot be removed.
The message is `The open scene stays in the File system.`
A path that is instanced cannot be removed.
The message is `{path} is instanced by {users}. Remove those instances first.`

## What save includes

`captureScene` writes the node tree.
It writes transforms, visibility, and shadows.
It writes geometries and materials.
It writes light, camera, and environment settings.
It writes component name, enabled, and parameters.
It writes the grid, local groups, global groups, and signal links.

## What save skips

The grid mesh object is not a node.
The gizmo, the selection boxes, and the badges are not nodes.
The editor does not save camera preview.
The editor does not save script drafts.
The editor does not save component TypeScript source.
The editor does not save a `connectSignal` listener from code.
Read [[Components]] and [[Groups and signals]].

`captureScene` does not write a node that has `instanceOwnerId` into the parent file.
The parent stores the instance path on the holder only.
Read [[Instancing]].

## Invalid files

`isSceneFile` checks the schema.
A bad entry is dropped when the library is read.
The other files stay.

## See also

[[Scene file format]]
[[Instancing]]
[[History]]
[[Getting started]]
