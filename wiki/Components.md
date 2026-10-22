# Components

A component is a three-start behavior.
The class extends `Object3DBehaviour`.
The code is `src/editor/behaviors.ts`.
The built-in component is `Spin` from `src/webgl/behaviors/Spin.ts`.

## Create

1. Choose Scene, then Create Component.
2. Or press `Ctrl+C` or `Cmd+C`.
3. Or right-click a node and choose Add Component.

The dialog lists components that already exist.
Create writes a new TypeScript class.
Add attaches the selected component to the current node.
Save in that dialog writes the source.

A new class name comes from `identifierName`.
Letters, digits, and `_` stay.
Other characters are removed.
An empty name becomes `Component`.
A name that starts with a digit gets the prefix `Component`.

## Template

`componentTemplate` writes this shape:

```ts
import { Object3DBehaviour } from "three-start"

export class Name extends Object3DBehaviour {
  onAwake(): void {
  }

  onStart(): void {
  }

  onEnable(): void {
  }

  onDisable(): void {
  }

  onUpdate(): void {
  }

  onBeforeRender(): void {
  }

  onAfterRender(): void {
  }

  onDestroy(): void {
  }
}
```

The compile step removes import lines.
The class line must stay.
If it is missing, compile throws this error:

```text
A component must declare class Name extends Object3DBehaviour.
```

## Compile

Sucrase strips TypeScript.
`new Function` runs the result.
The function receives `Object3DBehaviour` and the script API.
The script API names are in `SCRIPT_API` in `src/editor/sceneApi.ts`.
You do not import those names.
Read [[Script editor]] for the list.

The compiler stores a compile error on the component as `error`.
Output shows the message.

## Attach, move, and delete

Drag a component from the File system onto a node.
The path label is `res://components/Name.ts`.
The drag payload uses `component:` plus the id.

Drag a component from one node to another to move it.
That payload uses `instance:` plus the instance id.

Delete a component from the dialog or the File system.
If a node uses it, `ComponentWarning.vue` lists those uses.
Confirm to remove the component and those instances.

## Parameters

`readParameters` reads own fields on the behavior.
A field can be a number, a boolean, or a string.
The Inspector hides a field that starts with `_`.
These names are also hidden: `object`, `ctx`, `modules`, `enabled`, and `isObject3DBehaviour`.
`enabled` is a separate Inspector checkbox.

The Inspector edits the visible fields.
Spin exposes axis and speed that way.

## What the scene file stores

A node stores `SceneComponentRecord`.
The fields are `name`, `enabled`, and `parameters`.
The TypeScript source is not in the record.

The source lives in the `components` map in memory.
Reload the page and custom sources are gone.
The scene still names the component.
Load logs a warning when that name is missing.
Built-in `Spin` is still there.
An unknown behavior that was already on an object can get a placeholder source.

Create, edit, and delete of the component file are not history steps.
Read [[History]].

## Recompile

Apply in the script editor calls `updateComponentSource`.
Every instance of that component is built again.
`retargetInstances` does that work.
A class rename updates signal links that name the component.

## See also

[[Script editor]]
[[Groups and signals]]
[[Scene file format]]
[[Limits]]
