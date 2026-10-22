# Cameras

A Camera node has kind `Camera3D`.
Settings live in `object.userData.camera`.
The type is `CameraSettings` in `src/editor/camera.ts`.
The Inspector is `CameraSection.vue`.

The editor camera is separate.
The editor camera is the orbit camera from the starter.
A Camera node does not replace that object until you preview it or press Play.

## Projection

The projection is Perspective or Orthographic.
Both sets of numbers stay in the settings.
A switch does not delete the other set.
`copyCameraSettings` keeps both.

## Perspective

| Field | Role |
| --- | --- |
| FOV | Vertical field of view in degrees. |
| Aspect | Width divided by height. |
| Focus | Focus distance. |
| Film Gauge | Film width in millimetres. |
| Film Offset | Horizontal film shift. |
| Focal Length | Derived from FOV and film size. You can edit it. |

The Inspector also shows Effective FOV, Film Width, and Film Height.
Those three values are readouts.
Effective FOV includes zoom.

## Orthographic

Left, right, top, and bottom are the frustum planes.
They are in camera space.
Near, far, and zoom still apply.

## Shared fields

| Field | Role |
| --- | --- |
| Near | Near clip distance. |
| Far | Far clip distance. |
| Zoom | Lens zoom. |
| Layers | `camera.layers.mask`. Bit 1 is layer 0. |
| Current | Play uses this camera. Only one camera is Current. |
| Sync Viewport | Fit the picture to the window while this camera is the view. |
| Preview | Look through this camera in the editor. Preview is not saved. |

`enforceSingleCurrent` clears Current on the other cameras.
`syncAspect` is the stored name of Sync Viewport.

View Offset matches Three.js `setViewOffset`.

| Field | Role |
| --- | --- |
| Enabled | Turn the offset on. |
| Full Width and Full Height | Size of the whole view. |
| Offset X and Offset Y | Start of this camera rectangle. |
| Width and Height | Size of this camera rectangle. |

When View Offset is on, aspect follows Full Width and Full Height.

## Preview and Play

Preview sets `previewCameraId`.
That id is not in the scene file.
Play uses the Current camera.
If no camera is Current, Play keeps the editor camera.

While preview or Play is active, orbit turns off.
`orbitAllowed` returns false in that state.
The Camera badge hides while you look through that camera.
The `CameraHelper` frustum also hides in that state.

Press `F` to frame the selection.
Focus clears preview and returns to the editor camera.

## Badge

`cameraIcons.ts` draws the Camera badge.
Click the badge to select the node.
The badge hides during Play.

## Reset

Reset on a camera field restores the creation settings.
Reset of Projection restores the original projection.

## See also

[[Viewport]]
[[Play mode]]
[[Inspector]]
[[Scene file format]]
