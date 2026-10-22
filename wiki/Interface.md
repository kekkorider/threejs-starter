# Interface

The editor shell is `src/editor/pages/EditorPage.vue`.
The menu bar is `src/editor/components/TopBar.vue`.
Dock sizes are CSS variables on the shell.
Drag a splitter to change a dock size.
Drag the File system splitter up to make that dock taller.
Drag the Script splitter up to make that dock taller.

## Screens

The top bar switches the screen.
The store field is `screen`.

| Screen | What you see |
| --- | --- |
| `3d` | The viewport and the bottom panel. This is the default. |
| `script` | The script editor. The viewport hides. |
| `asset` | The material preset cards. |
| `game` | Play. The docks and the toolbar hide. |

The 2D screen is not in this editor.
Every view is 3D.

Distraction Free Mode is in the Editor menu.
That mode hides more of the chrome.

## Menus

The menu names are Scene, Project, Debug, Editor, and Help.
`MENUS` in `src/editor/stores/editor.ts` lists them.

| Menu | Commands |
| --- | --- |
| Scene | Undo, redo, save, instance, load, create, duplicate, rename, delete, focus. |
| Project | Project Settings. The editor disables the item. |
| Debug | Pause or resume the simulation. Toggle the Three.js profiler. |
| Editor | Open History. Toggle the bottom panel. Toggle distraction-free mode. |
| Help | Open the TSL reference. Open the shortcut list. |

Project Settings has `disabled: true`.
The command does nothing.

## Left docks

The Scene dock shows the node tree.
Read [[Scene tree]].

The File system lists saved resources.

| Group | Path shape |
| --- | --- |
| Scenes | `res://Name.tscn` |
| Meshes | `res://meshes/Name.tres` |
| Materials | `res://materials/Name.tsl` |
| Components | `res://components/Name.ts` |

Type in the filter to hide rows.
Click a saved scene to open it.
Drag a saved scene that is not open onto the tree to instance it.
Read [[Instancing]].

The empty File system text is `No resources yet. Create a MeshInstance.`

## Center

The scene tab shows the open scene label.
The viewport is `src/editor/components/Viewport.vue`.
The toolbar is `src/editor/components/ViewportToolbar.vue`.
Read [[Viewport]].

The bottom panel has three tabs.

| Tab | Role |
| --- | --- |
| TSL | The material script for the selected mesh. |
| Output | Messages from `EditorState.log`. |
| History | Undo steps. Read [[History]]. |

The Output empty text is `Output will list created nodes and shader errors.`
A log line has a time and a level.
Levels include info, warn, and error.

## Right docks

The Inspector edits the selection.
Read [[Inspector]].

The Node dock sits under the Inspector.
It has a Signals tab and a Groups tab.
Read [[Groups and signals]].

The Script dock follows the selected node.
Read [[Script editor]].

## Dialogs

These dialogs open over the shell.

| Dialog | File | When it opens |
| --- | --- | --- |
| Create Node | `CreateNodeDialog.vue` | Scene, then Create Node. |
| Create Component | `CreateComponentDialog.vue` | Scene, then Create Component. |
| Scene file | `SceneFileDialog.vue` | Save Scene As, or Instance Scene. |
| Connect signal | `ConnectSignalDialog.vue` | Connect on a signal row. |
| Component warning | `ComponentWarning.vue` | Delete a component that is in use. |
| Help | `HelpDialog.vue` | Help menu. |
| Popup menu | `PopupMenu.vue` | A right-click or a viewport list. |

Press `Esc` to close the top dialog.
A click outside a popup menu closes that menu.

## See also

[[Scene tree]]
[[Viewport]]
[[Inspector]]
[[Keyboard shortcuts]]
