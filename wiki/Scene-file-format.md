# Scene file format

A saved scene is JSON.
The TypeScript type is `SceneFile` in `src/editor/sceneFile.ts`.
`version` is the number `1`.
`isSceneFile` drops an object that fails these checks.

## Top level

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `1` | Yes | Schema version. |
| `path` | string | Yes | `res://` path. |
| `scene` | `SceneSettings` | Yes | Legacy scene block plus the active environment. |
| `grid` | `GridSettings` | Yes | Editor grid. |
| `geometries` | array | Yes | Geometry resources. |
| `materials` | array | Yes | TSL materials. |
| `nodes` | array | Yes | Node records. |
| `groups` | array | No | Local groups. Old files omit it. |
| `globalGroups` | array | No | Global groups copied into the file. |
| `connections` | array | No | Saved signal links. |

The storage key is `threejs-starter.scene-files`.
The blob is `{ openPath, files }`.
`openPath` is the last open scene.

## Scene settings

| Field | Meaning |
| --- | --- |
| `background` | Legacy background color. |
| `backgroundIntensity` | Legacy background energy. |
| `environmentIntensity` | Legacy environment energy. |
| `shadows` | Legacy shadow switch. |
| `shadowType` | `basic`, `pcf`, or `vsm`. |
| `environment` | Active `EnvironmentSettings`, or null. Old files omit it. |

## Grid

| Field | Meaning |
| --- | --- |
| `visible` | Grid visibility. |
| `size` | Grid size. |
| `divisions` | Division count. |
| `center` | Center line color. |
| `color` | Cell line color. |
| `position` | `{ x, y, z }`. |

## Geometry record

| Field | Meaning |
| --- | --- |
| `id` | Id referenced by a node. |
| `name` | File system label. |
| `type` | A `GeometryType` from `geometry.ts`. |
| `params` | Number parameters for that type. |

## Material record

| Field | Meaning |
| --- | --- |
| `id` | Id referenced by a node. |
| `name` | File system label. |
| `source` | TSL source text. |
| `side` | `front`, `back`, or `double`. |
| `transparent` | Boolean. |
| `wireframe` | Boolean. |

## Node record

| Field | Meaning |
| --- | --- |
| `id` | Id inside this file. |
| `name` | Node name. |
| `kind` | A `NodeKind`. |
| `parentId` | Parent id, or null for the root. |
| `position` | `[x, y, z]`. |
| `rotation` | Euler degrees as `[x, y, z]`. |
| `scale` | `[x, y, z]`. |
| `visible` | Boolean. |
| `castShadow` | Boolean. |
| `receiveShadow` | Boolean. |
| `geometryId` | Geometry id, or null. |
| `materialId` | Material id, or null. |
| `light` | `LightDefaults`, or null. |
| `camera` | `CameraSettings`. Old files omit it. |
| `environment` | `EnvironmentSettings`. Old files omit it. |
| `components` | Array of component records. |
| `instance` | `res://` path of a linked scene, or null. |
| `groups` | Group names on this node. |
| `signals` | Custom signals only. |

Built-in signals are not in `signals`.
Children of an instance are not in `nodes`.
The holder keeps `instance`.

## Component record

| Field | Meaning |
| --- | --- |
| `name` | Component class name. |
| `enabled` | Boolean. |
| `parameters` | Map of number, string, or boolean. |

The source text is not in this record.

## Group record

| Field | Meaning |
| --- | --- |
| `name` | Group name. |
| `description` | Up to 120 characters. |

## Signal link

| Field | Meaning |
| --- | --- |
| `signal` | Signal name. |
| `fromId` | Emitter node id in this file. |
| `toId` | Receiver node id in this file. |
| `component` | Component name on the receiver. |
| `method` | Method name. |

Runtime listeners from `connectSignal` are not in `connections`.

## Environment settings

| Field | Values |
| --- | --- |
| `backgroundMode` | `color`, `sky`, or `canvas`. |
| `backgroundColor` | CSS color string. |
| `backgroundEnergy` | Number. |
| `ambientSource` | `background`, `disabled`, `color`, or `sky`. |
| `ambientColor` | CSS color string. |
| `ambientEnergy` | Number. |
| `ambientSkyContribution` | Number from 0 to 1. |
| `fogEnabled` | Boolean. |
| `fogMode` | `exponential` or `depth`. |
| `fogColor` | CSS color string. |
| `fogDensity` | Number. |
| `fogStart` | Number. |
| `fogEnd` | Number. |
| `shadows` | Boolean. |
| `shadowType` | `basic`, `pcf`, or `vsm`. |

## Camera settings

`CameraSettings` includes `projection`, `current`, and `syncAspect`.
It includes `near`, `far`, `zoom`, and `fov`.
It includes `aspect`, `focus`, `filmGauge`, and `filmOffset`.
It includes `left`, `right`, `top`, and `bottom`.
It includes `view` for the view offset.
It includes `layers` for the layer mask.
Preview is not a field in the file.

## Light defaults

| Field | Meaning |
| --- | --- |
| `color` | Light color. |
| `ground` | Hemisphere ground color, or null. |
| `intensity` | Energy. |
| `range` | Distance, or null when the light has no range. |
| `angle` | Spot angle, or null. |
| `penumbra` | Spot penumbra, or null. |
| `lookAt` | `{ enabled, x, y, z }`, or null. |

## See also

[[Scene files]]
[[Instancing]]
[[World environment and grid]]
[[Architecture]]
