# TSL

TSL is the material script.
The compiler is `compileTSLMaterial` in `src/editor/tsl.ts`.
The bottom panel editor is `TslEditor.vue`.
Help, then TSL Material Reference, shows `TSL_HELP`.

The material class is `MeshStandardNodeMaterial`.
You assign slots on `material`.
Every export from `three/tsl` is already in scope.
Do not write an import for `color`, `uv`, or `time`.

## Slots

| Slot | Role |
| --- | --- |
| `material.colorNode` | Albedo. |
| `material.roughnessNode` | Roughness from 0 to 1. |
| `material.metalnessNode` | Metalness from 0 to 1. |
| `material.emissiveNode` | Light added on top of the surface. |
| `material.opacityNode` | Opacity. Turn Transparent on. |
| `material.normalNode` | Tangent-space or object normal. |
| `material.positionNode` | Local vertex position. |
| `material.aoNode` | Ambient occlusion. |

## Inputs

| Input | Role |
| --- | --- |
| `uv()` | Texture coordinates. |
| `positionLocal` | Vertex position in object space. |
| `positionWorld` | World position. |
| `normalWorld` | World normal. |
| `normalView` | View normal. |
| `positionViewDirection` | View direction. |
| `time` | Time in seconds. |
| `cameraPosition` | Camera world position. |
| `checker(uv())` | A procedural checker. |
| `mx_noise_float(positionLocal)` | MaterialX noise. |

## Write and apply

1. Select a MeshInstance.
2. Open the TSL tab in the bottom panel.
3. Edit the source.
4. Press `Ctrl+S` or `Cmd+S` to compile.

`Ctrl+S` does not save the scene.
The editor compiles the material 380 ms after you stop typing.
A compile error goes to the Material section and to Output.
The status line in the panel shows the result.

The TSL editor highlights keywords, numbers, and known calls.
`highlightTSL` does that work.
The TSL editor stays off until a mesh material is bound.

## Presets

| Name | Id | What it does |
| --- | --- | --- |
| Lit | `lit` | Flat albedo, roughness 0.55, metalness 0.04. |
| Metal | `metal` | A conductor. It needs the environment map to read as metal. |
| UV | `uv` | Draws UV coordinates into the albedo. |
| Checker | `checker` | A checker from `uv()`, tiled six times. |
| Fresnel | `fresnel` | A rim from `normalView` and `positionViewDirection`. |
| Stripes | `stripes` | Bands from `uv()` and `time`. |
| Emissive Pulse | `pulse` | A dark surface with an emissive pulse. |
| Vertex Wave | `wave` | Moves `positionNode` with a sine wave. |
| World Normal | `normal` | Colors the surface from `normalWorld`. |
| Marble | `noise` | Perlin noise from `mx_noise_float`. |

AssetLib shows these presets as cards.
Create Mesh makes a mesh with that preset.
Apply writes the preset onto the selected material.
AssetLib does not import external files.

## Scope of the compiler

`compileBody` builds a function.
The first argument is `material`.
The other arguments are the TSL exports.
Reserved JavaScript words are not passed in as TSL names.
The source runs in strict mode.

Do not rely on a network import inside the script.
The function body only sees `material` and the TSL names.

## See also

[[Geometry and materials]]
[[Keyboard shortcuts]]
[[Interface]]
