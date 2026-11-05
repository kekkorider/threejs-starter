# Node package plan

## 1. Technical names

Use each name in this list with only the meaning that the list gives.

- ThreejsEditor: the class of the editor element
- threejs-editor: the HTML tag for ThreejsEditor
- Vue: the library that shows the editor
- Pinia: the library that stores editor data
- Vite: the tool that builds the package
- npm: the tool that publishes the package
- Node.js: the program that runs the build
- TypeScript: the language of the source files
- Three.js: the library that draws the scene
- three-start: the library that runs the scene
- crashcat: the physics library
- Draco: the mesh decoder files
- Basis: the texture decoder files
- WebGPU: the graphics interface
- package.json: the file that describes the package
- localStorage: the browser store for a saved scene
- ThreeStart: the one scene object in a document
- ESM: the module format of the package
- CSS: the style rules for the editor
- HTML: the language of a host page
- DOM: the tree of a host page
- shadow root: a DOM tree that the page cannot see
- vue: the package name for Vue
- pinia: the package name for Pinia
- three: the package name for Three.js
- eventemitter3: the package that sends an event
- gsap: the package that changes a value over time
- sucrase: the package that compiles a script in the editor
- vue-router: the package that reads the page address
- dependency: a library that the package installs
- peer dependency: a library that the host page must install
- files: a field in package.json
- exports: a field in package.json
- private: a field in package.json

## 2. Requirement

The editor must be one element that a page can add.
The element must work without vue-router.
The class of the element must be ThreejsEditor.
A page must be able to import ThreejsEditor.
The page must be able to add the tag threejs-editor.
The element must have the same width as the window.
The element must have the same height as the window.

## 3. Current status

This project contains the element ThreejsEditor.
An npm package for the element does not exist.
The file package.json sets private to true.
Do not publish the package in this work.

## 4. Package requirements

The package must be public.
The package must use the ESM format.
The package must export the class ThreejsEditor.
An import of the package must register the tag threejs-editor.
The Vite build must compile each Vue file.
An import of the package must load the CSS.
The element must keep its contents in the page DOM.

You must declare each library in this list as a dependency or as a peer dependency.

- vue
- pinia
- three
- three-start
- crashcat
- eventemitter3
- gsap
- sucrase

Do not declare vue-router when the build does not import it.

The host must serve the Draco files at /draco/.
The host must serve the Basis files at /basis/.
The package build can copy those files to the host.
The package must contain TypeScript types for ThreejsEditor.
You must build the package with Node.js 24.
A document must contain only one threejs-editor element.
The element must move to the body of the document.

## 5. Plan

Do these steps in this order.

1. Add an entry file that exports ThreejsEditor.
2. Add a Vite build for that entry file.
3. Set the files field in package.json.
4. Set the exports field in package.json.
5. Remove the private field from package.json.
6. Make a package archive with npm pack.
7. Install that archive on a second page.
8. Open the second page in a browser.
9. Make sure that the tag covers the window.

## 6. Limits

WARNING: This project has one ThreeStart. A second tag uses that same object.

Do not use a shadow root.
Do not start a second ThreeStart.
Do not write a scene file to the disk.
Keep each saved scene in localStorage.
