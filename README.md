# ThreeJS starter

This is a general template for ThreeJS applications.
It uses the following packages:

- [ViteJS](https://vitejs.dev/) v8
- [ThreeJS](https://threejs.org/) v0.185.1
- [TypeScript](https://www.typescriptlang.org/) v7.0.2
- [Crashcat](https://crashcat.dev/) v0.0.5

# Before we start

This has been developed with NodeJS `24`.

## Setup

```shell
$ pnpm install
```

## Develop

Run

```shell
$ pnpm dev
```

then open a new browser window and navigate to `http://localhost:5173`

## Build

```shell
$ pnpm build
```

## Project structure

The WebGL entry files is located in `/src/webgl/index.ts`. It initializes a basic scene with a few meshes and all the basic stuff needed to run the scene.

## Materials

All materials are located in `/src/webgl/materials`. All the pre-existing materials are `THREE.NodeMaterial` instances to take advantage of their node architecture, but feel free to use a regular `THREE.Material` instance if you prefer.

## Components

All meshes have assigned multiple three-start components, which are located in `/src/webgl/behaviors`.

Check the [three-start documentation](https://three-start.com/docs/core-guides/components) for more information on how to create a new component.

## Modules

The starter is intialized with a few pre-defined modules, which are located in `/src/webgl/modules`.
Such modules are:

- `AssetLoaderModule`: loads assets from the filesystem
- `OrbitControlsModule`: adds orbit controls to the camera
- `PhysicsModule`: adds physics to the scene
- `InspectorModule`: adds a GUI to the scene

When creating a new module remember to add it to the `ThreeStartRegister` interface in `/src/types.d.ts`.

Check the [three-start documentation](https://three-start.com/docs/core-guides/writing-modules) for more information on how to create a new module.

## Inspector

This starter uses the built-in Inspector from ThreeJS to add a GUI to the scene and inspect all the render passes.

It is initialized in its own module, which is located in `/src/webgl/modules/Inspector.ts`.

Check the many [ThreeJS examples](https://threejs.org/examples/) for more examples on how to add new fields to the GUI.

## Physics (crashcat)

Physics is managed by the `PhysicsModule`, which is located in `/src/webgl/modules/Physics.ts`. It uses the `crashcat` physics engine.

The whole simulation is inizialized by the `PhysicsModule`. If you don't need physics, just remove it from the modules list in `/src/webgl/index.ts`.

The available rigid body types are located in `/src/webgl/behaviors/physics/` and are:

- `Box`
- `Sphere`
- `Triangle` (ideal for static meshes, i.e. terrains)
- `ConvexHull` (ideal for dynamic/kinematic meshes)

A body type can be assigned to a mesh as a three-start component

```ts
import { addComponent } from 'three-start'
import { BodyBox } from './behaviors/physics'

import type { RigidBodySettings } from 'crashcat'

// ...

const cube = new THREE.Mesh(
	new THREE.BoxGeometry(1, 1, 1),
	new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
)

addComponent(cube, BodyBox, {
	motionType: MotionType.DYNAMIC,
	restitution: 0.2,
	friction: 0.3,
	mass: 1,
} as RigidBodySettings)
scene.add(cube)
```

The third argument passed to `addComponent` is the [crashcat's rigid body settings](https://crashcat.dev/docs/types/crashcat.RigidBodySettings.html).

## Assets

Assets are loaded by the `AssetLoaderModule`, which is located in `/src/webgl/modules/AssetLoader.ts`.

The module can load both textures and models. when loaded, each file is stored in an internal map by its filename.

```ts
const { modules } = starter.ctx

// ...

// Load modules and textures
await modules.assetLoader.loadTexture('path/to/my-texture.png')
await modules.assetLoader.loadModel('path/to/my-model.glb')

// ...

// Get a specific model or texture by filename
const texture = modules.assetLoader.getTexture('my-texture')
const model = modules.assetLoader.getModel('my-model')
```
