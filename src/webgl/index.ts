import * as THREE from "three/webgpu"
import { ThreeStart, addComponent } from "three-start"

import { AssetLoaderModule } from './modules/AssetLoader'
import { OrbitControlsModule } from './modules/OrbitControls'

import { NormalMaterial } from './materials/normal'
import { MatcapMaterial } from './materials/matcap'

import { Spin } from './behaviors/Spin'

//
// Setup
//
const starter = new ThreeStart()

starter.addModules({
  assetLoader: new AssetLoaderModule(),
  orbitControls: new OrbitControlsModule(),
})

const { scene, camera, modules } = starter.ctx

starter.mount(document.getElementById('app')! as HTMLDivElement)
starter.start()

await modules.assetLoader.loadTextures('/diamond-07.png')

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
await modules.assetLoader.loadModels('/suzanne.glb')
const suzanne = modules.assetLoader.models.get('suzanne')!.scene.getObjectByName('Suzanne') as THREE.Mesh
addComponent(suzanne, Spin, { axis: 'z' })
suzanne.position.x = 1
suzanne.scale.setScalar(1.3)
MatcapMaterial.matcap = modules.assetLoader.textures.get('diamond-07')!
suzanne.material = MatcapMaterial
scene.add(suzanne)

console.log(modules.assetLoader)
