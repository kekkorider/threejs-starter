# Viewport

The viewport hosts the shared canvas.
`Viewport.vue` is the host.
`useMountedScene` mounts the canvas.
The first ready event calls `store.attach(starter)`.
`EditorState.attach` runs one time.
A later visit only shows the chrome again.

The toolbar is `ViewportToolbar.vue`.
Pointer logic is `bindViewport` in `src/editor/stores/editor.ts`.

## Tools

| Key | Tool | Effect |
| --- | --- | --- |
| `Q` | Select | Click to pick. Drag a rectangle to select many nodes. |
| List button | List | Click to open the nodes under the cursor. |
| `W` | Move | Translate gizmo. |
| `E` | Rotate | Rotate gizmo. |
| `R` | Scale | Scale gizmo. |

`Y` toggles snap.
Snap steps are 0.5 m, 15 degrees, and 0.1.
The code sets translation snap to `0.5`.
The code sets rotation snap to `π / 12`.
The code sets scale snap to `0.1`.

The space toggle is World or Local.
World space uses the scene axes.
Local space uses the node axes.

## Camera views

The view buttons are Perspective, Top, Front, and Right.
`setView` moves the editor camera.
Top, Front, and Right are orthographic views of that camera.
They are not a Camera node.
Read [[Cameras]] for a Camera node.

## Select one node

Click a mesh to select it.
The pick ray hits meshes.
The ray also hits a light badge, a camera badge, and an environment badge.
`pick` returns the closest hit.
The editor walks up to the object that has `userData.editorId`.

Shift+click adds the node.
Ctrl+click or Cmd+click toggles the node.
The active node is the last one in `selectedIds`.

## Selection rectangle

In Select mode, drag more than 5 pixels.
The editor draws a rectangle above the canvas.
Release the pointer to select the nodes inside it.

| Modifier | Result |
| --- | --- |
| None | Replace the selection. |
| Shift | Add the nodes in the rectangle. |
| Ctrl or Cmd | Remove the nodes in the rectangle. |

`nodesInRect` tests the rectangle.
A mesh uses its world bounds.
A light, a camera, or an empty node uses its origin on screen.

Each selected node draws a box.
The active node uses a stronger color.
The boxes hide during Play.

## Nodes under the cursor

Use the List tool and click.
If one node is under the cursor, that node is selected.
If several nodes are under the cursor, a menu opens.
Alt+right-click does the same from any tool.
The pointer must move 5 pixels or less.

A menu row shows the node name.
The tooltip shows the type and the path.
Two nodes with one name show the parent in the row.

`nodesAt` uses ray hits.
It also picks a non-mesh node when the cursor is near its origin.

## Orbit

In Select or List, the left button picks or draws the rectangle.
The right button orbits.
The middle button pans.
In Move, Rotate, or Scale, the left button uses the gizmo.
A gizmo drag turns orbit off until you release the pointer.

The orbit target starts at `[0, 0, 0]`.
Press `F` to frame the selection.
Focus turns camera preview off.

## Gizmo

The gizmo is `TransformControls`.
It attaches to the active node.
It does not attach to the root.
It does not attach to a WorldEnvironment.
It does not attach in Select, List, or Play.

A multi-selection moves the selection roots with the active node.
A parent in the selection hides its children for that drag.
The root can sit in the selection and does not hide its children.

One drag is one history step.
Read [[History]].

## Preview sun and environment

The toolbar has three controls after the shading menu.

| Control | Effect |
| --- | --- |
| Sun button | Toggle the preview DirectionalLight when the scene has none. |
| Environment button | Toggle the preview environment when the scene has no WorldEnvironment. |
| Menu (three lines) | Edit preview sun and environment settings. |

The preview sun draws a direction arrow like a DirectionalLight.
It is not a scene-tree node.
Omni, Spot, and Hemisphere lights do not turn the preview sun off.
A DirectionalLight in the tree disables the sun toggle.
A WorldEnvironment in the tree disables the environment toggle.

Settings are project-wide in `localStorage` under `threejs-starter.preview-sun-env`.
They are not stored in the scene file.

Play hides the preview sun and the preview environment.
Leaving `/editor` does the same.
Stop and return to the editor restore them when their toggles are on.

The settings menu has Add Sun to Scene and Add Environment to Scene.
Each button creates a real node from the current preview settings and turns that preview off.
Hold Shift on either button to add both.

An empty scene with no saved file starts with both previews on.
It does not bake a default DirectionalLight or WorldEnvironment into the tree.

## Shading

Shaded shows the color picture.
Debug Split shows four quadrants.

| Quadrant | Picture |
| --- | --- |
| Top left | Shaded color. |
| Top right | Camera distance. Near is darker. About 32 m and beyond stays white. |
| Bottom left | View-space normals. |
| Bottom right | Motion since the last frame. A still pixel is gray. |

`setViewportShading` in `src/webgl/index.ts` switches the output.
Distance uses view Z divided by 32.
Motion multiplies the velocity buffer by 48.

## On-screen text

The viewport meta line shows the active name.
It shows the selection count when many nodes are selected.
It shows the triangle count for a mesh.

## Chrome

The grid is a `GridHelper`.
Its `raycast` is empty, so you cannot pick it.
`userData.editorHidden` marks editor-only objects.
Those objects hide outside the editor and during Play.

## See also

[[Cameras]]
[[Lights]]
[[World environment and grid]]
[[Keyboard shortcuts]]
[[History]]
