# Nodes

A node is an `EditorNode` in `src/editor/state.ts`.
The kind union is `NodeKind`.
The create dialog reads `NODE_TYPES`.
The visible label drops the `3D` suffix.

| Kind | Label | Group | Three.js object |
| --- | --- | --- | --- |
| `Node3D` | Node | Node | `Group` or `Object3D` |
| `WorldEnvironment` | WorldEnvironment | Node | `Group` plus an Env badge |
| `MeshInstance3D` | MeshInstance | Mesh | `Mesh` |
| `Camera3D` | Camera | Camera | Perspective or orthographic camera |
| `DirectionalLight3D` | DirectionalLight | Light | `DirectionalLight` |
| `OmniLight3D` | OmniLight | Light | `PointLight` |
| `SpotLight3D` | SpotLight | Light | `SpotLight` |
| `HemisphereLight3D` | HemisphereLight | Light | `HemisphereLight` |

`kindOf` reads `userData.editorKind` first.
If that field is missing, it uses the Three.js type.

## Identity

Each node has a string id such as `node1`.
`object.userData.editorId` stores that id.
The parent link is `parentId`.
The child order is `childIds`.
Those fields match `object.parent` and `object.children`.

`imported` marks a node that came from the starter scene.
`isRoot` marks the World root.

## Create

1. Select a parent, or select nothing to use the root.
2. Press `Ctrl+A`.
3. Pick a group: Node, Mesh, Camera, or Light.
4. Pick a type.
5. Confirm the dialog.

The dialog text comes from `NODE_TYPES`.

| Label | Description in the dialog |
| --- | --- |
| Node | An empty node. Use it to group other nodes. It has a transform and nothing else. |
| WorldEnvironment | Background, ambient light, fog, and the shadow map. |
| MeshInstance | A mesh with a geometry and a TSL material. |
| Camera | A viewpoint. Perspective or orthographic. |
| DirectionalLight | Parallel rays. Aim with Look at, or rotate the node. |
| OmniLight | A point light out to a finite range. |
| SpotLight | A cone. Aim with Look at, or rotate the node. |
| HemisphereLight | Sky and ground colors. The dialog says it has no position. |

The Transform section still shows on a HemisphereLight.
The hide rule is only the root and a WorldEnvironment.

## Node

Use a Node to group children.
The node has a transform.
It has no geometry and no light.

## WorldEnvironment

Read [[World environment and grid]].
The node has no Transform section.
The viewport uses the WorldEnvironment closest to the root.

## MeshInstance

A MeshInstance stores `geometryId` and `materialId`.
Read [[Geometry and materials]].
The material script is TSL.
Read [[TSL]].

## Camera

Read [[Cameras]].
Settings live in `userData.camera`.

## Lights

Read [[Lights]].
Settings live in `userData` and in `LightDefaults`.

## Visibility

`object.visible` is the Visible property.
Ancestors that are hidden hide the node for picking.
Cast Shadow and Receive Shadow show when the object supports them.
A WorldEnvironment has no Visibility section.

## Names

Rename with `F2` or the Inspector name field.
`rename` trims the text.
`rename` ignores an empty name.
The root cannot be renamed.
Two nodes can share one name.
Duplicate copies the node.
The copy gets a name that is not already in use.
Signal `renamed` fires with the new name.
Read [[Groups and signals]].

## What is not a node

The grid is not a node.
The transform gizmo is not a node.
Selection boxes are not a node.
Badges and light arrows are not nodes.
They use `userData.editorHidden`.
The scene file does not store them as nodes.

## See also

[[Scene tree]]
[[Scene file format]]
[[Limits]]
