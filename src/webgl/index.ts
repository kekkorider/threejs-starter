import * as THREE from "three/webgpu"
import {
  mrt,
  output,
  velocity,
  packNormalToRGB,
  normalView,
  screenUV,
  Fn,
  mix,
  step
} from 'three/tsl'
import {
  ThreeContextEvents,
  ThreeStart,
  addComponent
} from "three-start"
import { MotionType } from 'crashcat'

import type { RigidBodySettings } from 'crashcat'

import { AssetLoaderModule } from './modules/AssetLoader'
import { OrbitControlsModule } from './modules/OrbitControls'
import { PhysicsModule } from './modules/Physics'
import { InspectorModule } from './modules/Inspector'
import { InputModule } from './modules/Input'

import { NormalMaterial } from './materials/normal'
import { MatcapMaterial } from './materials/matcap'
import { ScaleMaterial } from './materials/scale'

import { Spin } from './behaviors/Spin'
import {
  BodyBox,
  type BodyBoxParams,
  BodySphere,
  type BodySphereParams,
  BodyConvexHull
} from './behaviors/physics'

//
// Setup
//
const starter = new ThreeStart()

starter.addModules({
  assetLoader: new AssetLoaderModule(),
  orbitControls: new OrbitControlsModule(),
  physics: new PhysicsModule(false),
  inspector: new InspectorModule(),
  input: new InputModule(),
})

const { scene, renderer, camera, modules, scenePass, renderPipeline } = starter.ctx

starter.start()
starter.ctx.once(ThreeContextEvents.Mount, () => {
  createPostProcessing()
})

starter.mount(document.getElementById('app')! as HTMLDivElement)

await renderer.init()

modules.assetLoader.createKTX2Loader()

await modules.assetLoader.loadTextures('/diamond-07.png')
await modules.assetLoader.loadModels('/suzanne.glb')
await modules.assetLoader.loadKTX('/2d_etc1s.ktx2')

//
// Camera
//
camera.position.z = 5

//
// Spinning cube
//
const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ScaleMaterial)
addComponent(cube, Spin, { axis: 'y', speed: 1 })
addComponent(cube, Spin, { axis: 'z', speed: 0.87 })
cube.position.x = -1.5
scene.add(cube)

//
// Floor
//
const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 10), NormalMaterial)
floor.position.y = -2

addComponent(floor, BodyBox, {
  motionType: MotionType.STATIC,
} as RigidBodySettings)

scene.add(floor)

//
// Suzanne GLB model
//
const suzanne = modules.assetLoader.getModel('suzanne')!.scene.getObjectByName('Suzanne') as THREE.Mesh
suzanne.position.x = 1.5
suzanne.geometry.scale(1.3, 1.3, 1.3)
MatcapMaterial.matcap = modules.assetLoader.getTexture('diamond-07')!
suzanne.material = MatcapMaterial
addComponent(suzanne, BodyConvexHull, {
  mass: 1,
  motionType: MotionType.DYNAMIC,
  restitution: 0.65,
  friction: 0.3
} as RigidBodySettings)
scene.add(suzanne)

//
// Physics cube
//
const physicsCubeMaterial = new THREE.MeshBasicNodeMaterial({
  map: modules.assetLoader.getKTX('2d_etc1s')!
})
const physicsCube = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1, 1), physicsCubeMaterial)
physicsCube.position.x = -1.5
physicsCube.position.y = 1.3
physicsCube.position.z = -1
physicsCube.rotation.z = Math.PI * Math.random()
physicsCube.rotation.x = Math.PI * Math.random()

addComponent(physicsCube, BodyBox, {
  motionType: MotionType.DYNAMIC,
  restitution: 0.2,
  friction: 0.3,
  mass: 1
} as RigidBodySettings, {
  width: 1,
  height: 1.5,
  depth: 1.5
} as BodyBoxParams)
scene.add(physicsCube)

//
// Physics sphere
//
const physicsSphere = new THREE.Mesh(new THREE.SphereGeometry(0.5), NormalMaterial)
physicsSphere.position.x = 1
physicsSphere.position.y = 2
physicsSphere.position.z = -2.5

addComponent(physicsSphere, BodySphere, {
  motionType: MotionType.DYNAMIC,
  restitution: .8
} as RigidBodySettings, {
  radius: 0.6
} as BodySphereParams)
scene.add(physicsSphere)

//
// Post-processing and Inspector
//
function createPostProcessing(): void {
  scenePass.setMRT(
    mrt({
      output,
      velocity,
      normal: packNormalToRGB(normalView)
    })
  )

  const scenePassColor = scenePass.getTextureNode('output').toInspector('Output')
  const scenePassDepth = scenePass.getTextureNode('depth').toInspector('Depth', () => scenePass.getLinearDepthNode())
  const scenePassNormal = scenePass.getTextureNode('normal').toInspector('Normal')
  const scenePassVelocity = scenePass.getTextureNode('velocity').toInspector('Velocity')

  const outputNode = Fn(() => {
    const top = mix(scenePassColor.renderOutput(), scenePassDepth.step(1), step(0.5, screenUV.x))
    const bottom = mix(scenePassNormal, scenePassVelocity, step(0.5, screenUV.x))
    const out = mix(top, bottom, step(0.5, screenUV.y))

    return out
  })

  renderPipeline.outputNode = outputNode()
}
