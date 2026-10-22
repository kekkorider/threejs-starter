# Scene tree

The Scene dock is `src/editor/components/SceneDock.vue`.
Each row is `src/editor/components/SceneTreeNode.vue`.
The tree shows `EditorNode` records from `EditorState`.

## World root

The root name is World.
The root is a node.
You cannot rename the root.
You cannot delete the root.
The grid settings show when the root is selected.
Read [[World environment and grid]].

## Row contents

A row shows an icon, the node name, and optional marks.
A linked scene shows a scene icon.
A node with a component shows a script icon.
Click that icon to open the script in the Script dock.
Several components open a list.
The tooltip on a viewport list row shows the type and the path.

## Select

Click a row to select that node.
The last selected node is the active node.
The Inspector edits the active node.

| Pointer | Result |
| --- | --- |
| Click | Select that node. |
| Shift+click | Select the rows from the anchor to this row. |
| Ctrl+click or Cmd+click | Toggle that row. |

The same modifiers work in the viewport.
Read [[Viewport]].

## Change the tree

| Action | How |
| --- | --- |
| Create | Press `Ctrl+A`. Or use the row menu. |
| Rename | Press `F2`. Or edit the name in the Inspector. |
| Duplicate | Press `Ctrl+D`. |
| Delete | Press `Delete` or `Backspace`. |
| Reparent | Drag a row onto another node. |

Create puts the new node under the selection.
If nothing valid is selected, the new node goes under the root.

A node that you create stays in the scene when you leave `/editor`.
Only the editor chrome hides.

## Filter and folders

Type in the scene filter to hide names that do not match.
Expand or collapse a parent from its arrow.
The expand state is in the store.
That state is not saved in the scene file.

## Drop

Drop a scene path from the File system onto a row.
The editor instances that scene under the row.
Read [[Instancing]].

Drop a component onto a row to attach it.
Drop a component instance onto another row to move it.
Read [[Components]].

## Locked rows

A node inside a linked scene has `instanceOwnerId` set.
You do not edit that node in the parent scene.
Make the instance local first.
The error text for groups is `Change groups on this node in its scene.`
The error text for signals is `Change signals on this node in its scene.`

## Context menu

Right-click a row for the node menu.
The menu includes rename, duplicate, delete, and add component.
Open Script is on that menu when the node has a component.

## See also

[[Nodes]]
[[Instancing]]
[[Components]]
[[Inspector]]
