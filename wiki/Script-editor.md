# Script editor

The editor has two script surfaces.
The Script dock follows the selected node.
The Script screen is the full editor.
TSL stays in the bottom panel.
Read [[TSL]].

## Script dock

The dock is `src/editor/components/ScriptDock.vue`.
It shows the scripts on the selected node.
An empty node shows `[empty]`.

The slot menu can attach a script.
It can switch among the scripts on that node.
It can open one in the Script screen.
It can detach the current script.

Edit the source under the slot.
Press Apply to write it.
Apply stays disabled until the source changes.
The status text `Applied` clears after 1400 ms.

Drop a component from the File system onto the dock to attach it.

## Script screen

The screen is `src/editor/components/ScriptScreen.vue`.
The text control is `CodeEditor.vue`.
Open scripts are tabs on the left.
Close a tab to remove it from the list.
The component file stays in the project.

Double-click a component in the tree to open this screen.
Right-click the node and choose Open Script to open the dock instead.
Click the script icon on the row to open the dock and keep the Inspector on the node.

Enter in the code editor keeps the current indent.
Apply calls `saveActiveScript`.
The status text `Applied` clears after 1400 ms.

## Names in scope

A component script does not import the scene API.
`compileComponent` injects these names.

| Name | Role |
| --- | --- |
| `isInGroup(element, group, scope?)` | True when the node is in the group. `scope` is optional. |
| `isInLocalGroup(element, group)` | True for a local group only. |
| `isInGlobalGroup(element, group)` | True for a global group only. |
| `nodesInGroup(group, scope?)` | The nodes in that group. Each item has `name`. |
| `emitSignal(element, signal, ...args)` | Emit a signal on a node. |
| `connectSignal(element, signal, listener)` | Listen at runtime. |
| `disconnectSignal(element, signal, listener)` | Remove that listener. |
| `isSignalConnected(element, signal, listener?)` | True when the listener is connected. |

`element` can be a node id, an editor node, or a Three.js object with `userData.editorId`.

`connectSignal` from a script is not saved.
Reload drops those listeners.
Connect a method in the Node dock when the link must survive a save.
Read [[Groups and signals]].

## Methods for the connect dialog

The connect dialog lists methods on the target component.
`componentMethodNames` merges the live behavior and the source text.
The source text includes edits you have not applied yet.

## Drafts

Open drafts stay in the store for this session.
They are not in the scene file.
Apply writes the in-memory component.
It does not write `localStorage`.

## See also

[[Components]]
[[Groups and signals]]
[[Interface]]
[[History]]
