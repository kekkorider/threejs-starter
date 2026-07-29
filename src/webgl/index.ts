import * as THREE from "three/webgpu"
import { ThreeStart, addComponent } from "three-start"

import { AssetLoaderModule } from './modules/AssetLoader'

import { NormalMaterial } from './materials/normal'

import { Spin } from './behaviors/Spin'

//
// Setup
//
const starter = new ThreeStart()

starter.addModules({
  assetLoader: new AssetLoaderModule(),
})

const { scene, camera, modules } = starter.ctx

starter.mount(document.getElementById('app')! as HTMLDivElement)
starter.start()

//
// Camera
//
camera.position.z = 5

//
// Cube
//
const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), NormalMaterial)
addComponent(cube, Spin, { axis: 'y', speed: 1 })
addComponent(cube, Spin, { axis: 'z', speed: 0.87 })
cube.position.x = -1
scene.add(cube)

//
// Suzanne GLB model
//
const glb = await modules.assetLoader.loadModels('/suzanne.glb')
const suzanne = glb.scene.getObjectByName('Suzanne')
addComponent(suzanne, Spin, { axis: 'z' })
suzanne.position.x = 1
suzanne.scale.setScalar(1.3)
suzanne.material = NormalMaterial
scene.add(suzanne)
