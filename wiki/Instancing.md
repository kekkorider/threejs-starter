# Instancing

An instance is a saved scene placed under a node.
The child stays linked to that file.
Make Local copies the nodes into the open scene and breaks the link.

## Place an instance

Use one of these actions.

1. Drag a saved scene from the File system onto a tree row.
2. Choose Scene, then Instance Scene.
3. Press `Ctrl+Shift+A` or `Cmd+Shift+A`.

The drag MIME type is `text/x-scene-path`.
`SCENE_DRAG_TYPE` holds that string.
`text/plain` also carries `scene:` plus the path.
Only a saved scene that is not the open scene can be dragged.

The dialog lists saved scenes other than the open one.
The menu disables the command when that list is empty.

## What is stored

The holder is a Node.
`instancePath` on that node is the `res://` path.
Children loaded from the file get `instanceOwnerId`.
`captureScene` skips nodes that have `instanceOwnerId`.
The parent file stores the holder and the path.
It does not store a second copy of the children.

`expandInstance` loads the nested file under the holder.
Nested signal links are rebound.
A loop check uses a set of paths.

## Limits

Stop Play before you instance.
The message is `Stop the scene before instancing.`

A scene cannot instance itself.
The message is `A scene cannot instance itself.`

A scene cannot instance a scene that instances it.
The message is `{path} instances {open path}, so it cannot be placed here.`

A missing file logs `No saved scene at {path}.`

You cannot edit a node that has `instanceOwnerId` from the parent scene.
Open that scene, or choose Make Local.

The editor rejects a user signal connection into an instanced node.
The message is `Make the instanced scene local before you connect this signal.`
Restore from history may pass `allowInstance` so a saved link can return.

## Make Local

Select the holder.
Press Make Local in the Inspector.
Or use the context menu.
`makeLocal` clears `instancePath` and the owner flags.
The children become normal nodes in the open scene.
The next save writes those nodes into this file.

## Delete

You cannot delete a scene file that an instance still uses.
Remove the instances first.
Read [[Scene files]].

## See also

[[Scene files]]
[[Scene tree]]
[[Groups and signals]]
[[History]]
