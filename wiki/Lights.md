# Lights

A light is a node.
The kinds are DirectionalLight, OmniLight, SpotLight, and HemisphereLight.
The Inspector section is `LightSection.vue`.
The badges and the cone are in `src/editor/lightIcons.ts`.

## Common fields

| Field | Meaning |
| --- | --- |
| Color | The light color. |
| Energy | The Three.js intensity. |
| Range | How far an OmniLight or a SpotLight reaches. |
| Ground | The ground color on a HemisphereLight. |

Energy is the Godot name.
The stored field is `intensity`.

## DirectionalLight

Rays are parallel.
Turn Look at on and set a target.
The light aims at that point each frame.
`aimLight` does that work.
Turn Look at off and rotate the node to aim it.

A direction arrow follows local -Z.
The arrow is the direction the light shines.

The default directional light looks at the origin.
Its shadow coverage is wide enough for the floor.

## OmniLight

An OmniLight is a Three.js `PointLight`.
It shines in every direction.
Range is `light.distance`.
A range of 0 does not cut the light off at a short distance.
The shadow camera far plane uses at least 0.5.

Decay is 0.
Three.js normally uses decay 2.
Decay 2 is inverse-square falloff.
Decay 0 keeps Energy bright out to Range.
The comment in `state.ts` records that choice.

## SpotLight

A SpotLight is a cone.
Angle is the cone angle.
Penumbra softens the edge.
Look at works the same way as on a directional light.

The gizmo draws three parts.

| Part | What it shows |
| --- | --- |
| Ring | The circle where Angle meets Range. |
| Spokes | Eight lines from the ring back to the light. |
| Center line | The ray out to Range. |

The direction arrow stays in the cone.
A Range of 0 has no end.
The cone then uses length 10.
`UNLIMITED_SPOT_RANGE` in `lightIcons.ts` is `10`.

The cone material uses `depthTest = false`.
The ring stays visible through the scene.

Spot shadows use a far plane of at least 20.

## HemisphereLight

A HemisphereLight mixes a sky color and a ground color.
The Color field is the sky.
The Ground field is the ground.
The dialog says this light has no position.
The Transform section still shows, because only the root and WorldEnvironment hide it.

## Badges

Each light has a labeled badge.
The labels are Directional, Omni, Spot, and Hemisphere.
Click the badge to select the light.
Badges hide during Play.
Badges hide on the `/` route.

## Preview sun

When the scene has no DirectionalLight, the viewport can show an editor-only preview sun.
The toolbar sun button toggles it.
The settings menu sets color, energy, altitude, azimuth, and shadows.
Add Sun to Scene creates a DirectionalLight from those settings.
Read [[Viewport]].

## Shadows

Cast Shadow and Receive Shadow are on the Visibility section.
The floor receives shadows.
The starter meshes cast shadows.
The shadow map type is on the WorldEnvironment.
Read [[World environment and grid]].

## Reset

Reset on a light field restores `LightDefaults`.
Those defaults are captured when the light is created.

## See also

[[Nodes]]
[[Viewport]]
[[Inspector]]
[[World environment and grid]]
