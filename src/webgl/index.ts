import * as THREE from "three/webgpu"
import { ThreeStart, addComponent } from "three-start"
import { MotionType } from 'crashcat'

import { AssetLoaderModule } from './modules/AssetLoader'
import { OrbitControlsModule } from './modules/OrbitControls'
import { PhysicsModule } from './modules/Physics'

import { NormalMaterial } from './materials/normal'
import { MatcapMaterial } from './materials/matcap'

import { Spin } from './behaviors/Spin'
import { BodyBox, BodySphere, BodyTriangle } from './behaviors/physics'

//
// Setup
//
const starter = new ThreeStart()

starter.addModules({
  assetLoader: new AssetLoaderModule(),
  orbitControls: new OrbitControlsModule(),
  physics: new PhysicsModule(true),
})

const { scene, camera, modules } = starter.ctx

starter.mount(document.getElementById('app')! as HTMLDivElement)
starter.start()

await modules.assetLoader.loadTextures('/diamond-07.png')
await modules.assetLoader.loadModels('/suzanne.glb')

//
// Camera
//
camera.position.z = 5

//
// Spinning cube
//
const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), NormalMaterial)
addComponent(cube, Spin, { axis: 'y', speed: 1 })
addComponent(cube, Spin, { axis: 'z', speed: 0.87 })
cube.position.x = -1.5
scene.add(cube)

//
// Floor
//
const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 10), NormalMaterial)
floor.position.y = -2

addComponent(floor, BodyBox, { motionType: MotionType.STATIC })

scene.add(floor)

//
// Suzanne GLB model
//
const suzanne = modules.assetLoader.models.get('suzanne')!.scene.getObjectByName('Suzanne') as THREE.Mesh
suzanne.position.x = 1.5
suzanne.geometry.scale(1.3, 1.3, 1.3)
MatcapMaterial.matcap = modules.assetLoader.textures.get('diamond-07')!
suzanne.material = MatcapMaterial
addComponent(suzanne, BodyTriangle, { motionType: MotionType.DYNAMIC })
scene.add(suzanne)

//
// Physics cube
//
const physicsCube = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1, 1), NormalMaterial)
physicsCube.position.x = -1.5
physicsCube.position.z = -1
physicsCube.rotation.z = Math.PI * Math.random()
physicsCube.rotation.x = Math.PI * Math.random()

addComponent(physicsCube, BodyBox, { motionType: MotionType.DYNAMIC })
scene.add(physicsCube)

//
// Physics sphere
//
const physicsSphere = new THREE.Mesh(new THREE.SphereGeometry(0.5), NormalMaterial)
physicsSphere.position.x = 1.5
physicsSphere.position.z = -1.5

addComponent(physicsSphere, BodySphere, { motionType: MotionType.DYNAMIC })
scene.add(physicsSphere)
