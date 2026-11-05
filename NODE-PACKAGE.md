# Plan for the npm package

## 1. Scope

This file gives the requirements for the editor.
This file gives the plan to make the editor an npm package.
npm is the Node package manager.
`threejs-starter` is the name of the current package.
The current package is private.
`runEditor` is the function that starts the scene.
The file `src/webgl/index.ts` contains `runEditor`.
The file `src/ThreejsEditor.ts` contains the component class.
This change does not publish the package.

## 2. Editor requirements

The editor must be standalone.
The editor must be one web component.
The class name must be `ThreejsEditor`.
`ThreejsEditor` is the class of the web component.
A different page must import the component.
The page must use the element `threejs-editor`.
`threejs-editor` is the custom element tag.
The component must cover the full window.
The component width must be the window width.
The component height must be the window height.

## 3. Package requirements

The package must contain the `ThreejsEditor` component.
The package field `type` must be `module`.
The package must export the component from one entry point.
The import of the entry point must call `customElements.define`.
`customElements.define` is the browser function that registers the tag.
A bundler is a tool that combines JavaScript files.
The package field `sideEffects` must be true.
The `sideEffects` field tells the bundler that the import has an effect.
The package must include the TypeScript declaration files.
TypeScript is the language of the source files.
The package must declare `three` as a peer dependency.
The package must declare `three-start` as a peer dependency.
The package must declare `crashcat` as a peer dependency.
A peer dependency is a package that the host page installs.
Draco is the mesh decoder.
Basis is the texture transcoder.
`suzanne.glb` is the sample model file.
The JavaScript bundle must not contain the Draco files.
The JavaScript bundle must not contain the Basis files.
The JavaScript bundle must not contain the texture files.
The JavaScript bundle must not contain `suzanne.glb`.
A public path is a path that the browser can request.
The host page must serve the Draco files at a public path.
The host page must serve the Basis files at a public path.
The host page must serve the texture files at a public path.
The host page must serve `suzanne.glb` at a public path.
The published component must cover the full window.

## 4. Procedure

Vite is the build tool for this project.
Do these steps to make the npm package.
Do not publish the package in this change.

1. Set the package name to a name that npm does not use.
2. Set the package field `private` to false.
3. Set the package field `type` to `module`.
4. Add a Vite library build for the `ThreejsEditor` entry.
5. Set the package field `exports` to the build output.
6. Set the package field `sideEffects` to true.
7. Make TypeScript declaration files for the entry.
8. Move `three` into the peer dependency list.
9. Move `three-start` into the peer dependency list.
10. Move `crashcat` into the peer dependency list.
11. Keep the Draco files out of the JavaScript bundle.
12. Keep the Basis files out of the JavaScript bundle.
13. Keep the texture files out of the JavaScript bundle.
14. Keep `suzanne.glb` out of the JavaScript bundle.
15. Put this import example in the file `README.md`.

In the example, `package-name` is the npm package name.

```html
<script type="module">
  import 'package-name'
</script>
<threejs-editor></threejs-editor>
```
