# Getting started

This page tells you how to run the editor.
It also tells you where a scene is stored.

## Requirements

Use Node.js 24.
The package manager is pnpm.

## Install

1. Clone the repository.
2. Run `pnpm install` in the repository root.
3. Run `pnpm dev`.
4. Open `http://localhost:5173`.

`pnpm build` makes a production build.
`pnpm preview` serves that build.

## Open the editor

`http://localhost:5173/` shows the scene.
`http://localhost:5173/editor` shows the editor.

The scene page has a link to the editor.
Use that link when you are already on `/`.

## First scene

The open path is `res://World.tscn` until you save another path.
`OPEN_SCENE_PATH` in `src/editor/sceneFile.ts` holds that string.
The editor loads the last open saved scene when one exists.
`preferredOpenPath()` makes that choice.

The scene tab shows the file name.
The tab shows `(*)` while the scene is dirty.

## Where files live

The editor does not write a `.tscn` file to disk.
Saved scenes live in `localStorage`.
The key is `threejs-starter.scene-files`.
Global groups live in `localStorage` under `threejs-starter.global-groups`.

A path still looks like `res://World.tscn`.
That path is a key inside the browser store.
Clear the site data and the saved scenes are gone.

Component TypeScript source is not in that store.
Read [[Components]] before you rely on a reload.

## First edits

1. Open `/editor`.
2. Press `Ctrl+A` or `Cmd+A` to create a node.
3. Choose MeshInstance.
4. Press `W` and drag the gizmo.
5. Press `Ctrl+Shift+S` or `Cmd+Shift+S` to save.

`Ctrl` and `Cmd` do the same action.
The menus print `Ctrl`.

## Stop

Press `F8` to stop Play.
Press `Esc` to close a dialog.
Press `Esc` during Play to stop when the Game screen is open.

## See also

[[Interface]]
[[Scene files]]
[[Keyboard shortcuts]]
[[Limits]]
