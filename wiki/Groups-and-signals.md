# Groups and signals

The Node dock is `src/editor/components/NodeDock.vue`.
It sits under the Inspector.
The Groups tab edits membership.
The Signals tab connects methods.
Group rules are in `src/editor/groups.ts`.
Signal rules are in `src/editor/signals.ts`.

## Groups

A group is Local or Global.
A local group belongs to the open scene.
The scene file stores local groups in `groups`.
A global group belongs to the project.
The browser stores global groups under `threejs-starter.global-groups`.
Save also copies global groups into `globalGroups` on the scene file.
Another machine can restore them from that copy.

| Rule | Limit |
| --- | --- |
| Name | A letter, then up to 47 letters, digits, spaces, `_`, or `-`. |
| Spaces | Repeated spaces become one space. |
| Description | At most 120 characters. The editor rejects a newline. |

A global name wins over a local name.
`replaceLocal` skips a local group that collides with a global name.
`replaceGlobal` removes a local group that collides with a global name.

Check a group to put the selected node in it.
Uncheck it to remove the node.
A node inside an instance is locked.
The message is `Change groups on this node in its scene.`
Create the group before you assign it.
The message is `Create the group first.`

The dock prints `isInGroup`, `isInLocalGroup`, and `isInGlobalGroup` for the selected node.

## Signals that always exist

These signals are not stored on the node.
Every node has them.

| Signal | Argument | When it fires |
| --- | --- | --- |
| `ready` | none | Play starts. |
| `tree_entered` | none | The node is added. |
| `tree_exiting` | none | The node is deleted. |
| `renamed` | `name` | The node is renamed. |
| `visibility_changed` | none | Visible changes. |

Scene load does not emit these signals.
Load rebuilds the tree with `restoring` set.
`enterTree` returns immediately while `restoring` is set.
`ready` runs from `emitReady` when Play starts.

You cannot remove a built-in signal.
The message is `Built-in signals stay on every node.`

## Custom signals

Add a signal on the selected node.
The name matches `^[A-Za-z][A-Za-z0-9_]{0,47}$`.
A bad name returns `Use a signal name that starts with a letter.`
A duplicate returns `Signal {name} already exists.`

Arguments are a comma-separated list.
An empty list is allowed.
The editor rejects more than 8 arguments.
Each argument uses the same name rule.
The error text is `Argument names start with a letter. Separate them with commas.`

Remove deletes the custom signal and its saved links.

## Connect

Press Connect on a signal row.
`ConnectSignalDialog.vue` lists target nodes.
Nodes inside an instance are not targets.
Pick a component on the target.
Pick a method.

The saved record is `SignalLinkRecord`.

| Field | Meaning |
| --- | --- |
| `signal` | The signal name. |
| `fromId` | The node that emits. The file stores the file id. |
| `toId` | The node that receives. |
| `component` | The component name. |
| `method` | The method name. |

A duplicate link returns `That connection already exists.`
A missing method returns `Choose a component method.`
An instanced endpoint returns `Make the instanced scene local before you connect this signal.`

Disconnect removes one link.
A missing link returns `That connection is already gone.`

## Delivery

`SignalBus` uses eventemitter3.
One bus entry exists per node.
A saved link calls the component method with the emit arguments.
Output logs the delivery.

Nested emits stop after 8 calls.
The log text is `Signal emit stopped after 8 nested calls.`

`emitSignal` from a script uses the same bus.
`connectSignal` from a script adds a listener that is not saved.

## See also

[[Script editor]]
[[Components]]
[[Instancing]]
[[Scene file format]]
