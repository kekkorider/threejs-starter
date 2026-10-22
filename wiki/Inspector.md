# Inspector

The Inspector is `src/editor/components/InspectorDock.vue`.
Select a node to edit it.
The empty text is `Select a node to edit its properties.`

The head shows the icon, the name, and the inherits line.
The root name cannot be edited.
A linked scene shows `Instance of` plus the path, and a Make Local button.

## Many nodes

The active node is the last selected node.
The note text is `{count} nodes selected. Editing {name}.`
Property edits apply to that active node.
Move, rotate, scale, duplicate, and delete use the whole selection.

## Filter

The filter box is `Filter properties`.
A section stays visible when its title or a row matches the text.
Clear the filter to show every section for that node.

## Sections

Sections live in `src/editor/components/inspector/`.
A section hides when the node kind does not use it.

| Section | Shows when |
| --- | --- |
| Background, Ambient Light, Fog, Shadows | The node is a WorldEnvironment. |
| Grid | The World root is selected. |
| Transform | The node is not the root and not a WorldEnvironment. |
| Camera, Perspective or Orthographic, View Offset | The node is a Camera. |
| Geometry and Material | The node has a geometry. |
| Light | The node is a light. |
| Visibility | The node is not a WorldEnvironment. |
| Component | A component is selected, not a node. |

New mesh values are position `[0, 0, 0]`, rotation `[0, 0, 0]`, and scale `[1, 1, 1]`.
Rotation in the fields is degrees.

## Reset

Right-click a value and choose Reset.
Reset restores the value from node creation.
`PropRow.vue` draws that control.
The defaults live on `EditorNode.defaults`.

## Numbers

Drag the colored X, Y, or Z label to scrub a number.
`src/editor/lib/scrub.ts` handles that drag.
You can also type in the field.

## Component selection

Select a component on the node.
The Inspector head then shows the component name.
The inherits line is `Object3DBehaviour`.
`ComponentSection.vue` edits Enabled and the parameters.
A parameter can be a number, a string, or a boolean.
A parameter string `x`, `y`, or `z` uses a select control.

Read [[Components]] for parameter rules.

## See also

[[Nodes]]
[[Lights]]
[[Cameras]]
[[World environment and grid]]
[[Geometry and materials]]
[[TSL]]
