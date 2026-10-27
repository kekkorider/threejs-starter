# World environment and grid

The viewport environment is a WorldEnvironment node.
The code is `src/editor/environment.ts`.
The Inspector is `EnvironmentSection.vue`.
The grid is editor chrome.
The grid settings are on the World root.

## Which environment is active

The viewport uses the WorldEnvironment closest to the root.
`closestEnvironment` walks the tree in breadth-first order.
If several nodes exist, the Inspector says which one is active.
You can still edit an inactive node.
The viewport does not use it.

Remove every WorldEnvironment and the viewport uses the preview environment when that preview is on.
Turn the preview off and the viewport uses a bare clear with no ambient fill.
The scene block in the file stores the active environment.
An old file with no environment node gains one on load.
`shouldSynthesizeEnvironment` and `environmentFromLegacy` do that.

## Preview environment

When the scene has no WorldEnvironment, the toolbar environment button can show a project-wide preview.
The settings menu edits background, ambient, and shadows for that preview.
Add Environment to Scene creates a WorldEnvironment from those settings.
Play and leaving the editor hide the preview.
Read [[Viewport]].

## Background

| Mode | Result |
| --- | --- |
| Color | A flat color. Energy scales it. The default color is `#3a3a3a`. |
| Sky | A sky behind the scene. Energy scales it. |
| Canvas | No 3D background. The panel behind the viewport shows through. |

The sky colors are a blue zenith `#62748c`, a pale horizon `#a5a7ab`, and a brown ground `#332b22`.
The environment map still lights the scene in Sky mode.
The map is also what reflections show.
Three.js uses one map for sky ambient and for reflections together.

## Ambient Light

| Source | Result |
| --- | --- |
| Background | Ambient follows the background. |
| Disabled | No extra ambient fill. |
| Color | A fill light uses Ambient Color and Energy. |
| Sky | The environment map supplies the ambient light. |

Sky Contribution goes from 0 to 1.
0 keeps the ambient color.
1 gives the whole energy to the environment map.
The default ambient source is Sky.
The default ambient energy is 0.55.
The default sky contribution is 1.

## Fog

Turn fog on in the Fog section.
Exponential fog uses Density.
The default density is 0.05.
Depth fog uses Fog Start and Fog End.
The defaults are 10 and 40.
The default fog color is `#c8c8c8`.
Fog is off in a new environment.

## Shadows

Shadows are on or off.
The type is Basic, PCF, or VSM.
The default is PCF.
The stored names are `basic`, `pcf`, and `vsm`.
They map to `BasicShadowMap`, `PCFShadowMap`, and `VSMShadowMap`.

These fields used to live on the scene.
They now live on the WorldEnvironment node.

## No transform

A WorldEnvironment has no Transform section.
It has no Visibility section.
Select it from the tree or from the Env badge.
The badge hides during Play.

## Grid

Select the World root to edit the grid.
`GridSection.vue` shows that section.
The defaults are in `GRID_DEFAULTS`.

| Field | Default |
| --- | --- |
| Visible | On |
| Size | 40 |
| Divisions | 40 |
| Center color | `#8a8a8a` |
| Cell color | `#2a2a2a` |
| Position | `[0, 0, 0]` |

The grid is a `GridHelper`.
You cannot pick it.
It hides when you leave the editor.
It hides during Play.
The scene file stores `grid` even though the grid is not a node.

## See also

[[Nodes]]
[[Lights]]
[[Scene file format]]
[[Play mode]]
