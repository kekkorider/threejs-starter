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
export const starter = new ThreeStart()

starter.addModules({
  assetLoader: new AssetLoaderModule(),
  orbitControls: new OrbitControlsModule(),
  physics: new PhysicsModule(true),
  inspector: new InspectorModule(),
  input: new InputModule(),
})

const { scene, renderer, camera, modules, scenePass, renderPipeline } = starter.ctx

let applyShading: (mode: 'shaded' | 'debug') => void = () => {}

export function setViewportShading(mode: 'shaded' | 'debug'): void {
  applyShading(mode)
}

let bootPromise: Promise<void> | null = null

/** Boot the scene once, then move the same canvas into whichever route is showing. */
export function bootScene(container: HTMLDivElement): Promise<void> {
  if (!bootPromise) {
    bootPromise = bootOnce(container)
    return bootPromise
  }
  return bootPromise.then(() => {
    remountScene(container)
  })
}

/** Drop the canvas only if this container still owns it. */
export function releaseScene(container: HTMLDivElement): void {
  if (!starter.ctx.isMounted) return
  if (starter.ctx.canvasContainer !== container) return
  starter.unmount()
}

function remountScene(container: HTMLDivElement): void {
  if (starter.ctx.canvasContainer === container) return
  if (starter.ctx.isMounted) starter.unmount()
  starter.mount(container)
}

async function bootOnce(container: HTMLDivElement): Promise<void> {
starter.start()
starter.ctx.modules.physics.debugState?.object3d && (starter.ctx.modules.physics.debugState.object3d.userData.editorHidden = true)
starter.ctx.once(ThreeContextEvents.Mount, () => {
  createPostProcessing()
})

starter.mount(container)

await renderer.init()

modules.assetLoader.createKTX2Loader()

await modules.assetLoader.loadTextures(['/diamond-07.png', '/m.png'], { colorSpace: THREE.SRGBColorSpace })
await modules.assetLoader.loadModels('/suzanne.glb')
await modules.assetLoader.loadKTX('/2d_etc1s.ktx2', {
  flipY: false,
  colorSpace: THREE.SRGBColorSpace,
})

//
// Spinning cube
//
const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ScaleMaterial)
cube.name = 'Cube'
addComponent(cube, Spin, { axis: 'y', speed: 1 })
addComponent(cube, Spin, { axis: 'z', speed: 0.87 })
cube.position.set(-1.5, 0.5, 0)
scene.add(cube)

//
// Floor
//
const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 10), NormalMaterial)
floor.name = 'Floor'
floor.position.y = -2

addComponent(floor, BodyBox, {
  motionType: MotionType.STATIC,
} as RigidBodySettings, {
  width: 10.2,
  height: 0.52,
  depth: 10.2
} as BodyBoxParams)

scene.add(floor)

//
// Suzanne GLB model
//
const suzanne = modules.assetLoader.getModel('suzanne')!.scene.getObjectByName('Suzanne') as THREE.Mesh
suzanne.name = 'Suzanne'
suzanne.position.x = 1.5
suzanne.geometry.scale(1.3, 1.3, 1.3)
MatcapMaterial.matcap = modules.assetLoader.getTexture('m')!
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
  map: modules.assetLoader.getKTX('2d_etc1s')
})

console.log(physicsCubeMaterial.map)
const physicsCube = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1, 1), physicsCubeMaterial)
physicsCube.name = 'PhysicsCube'
physicsCube.position.x = -1.5
physicsCube.position.y = 1.3
physicsCube.position.z = -1
physicsCube.rotation.z = Math.PI * Math.random()
physicsCube.rotation.x = Math.PI * Math.random()

addComponent(physicsCube, BodyBox, {
  motionType: MotionType.DYNAMIC,
  restitution: 0.6,
  friction: 0,
  mass: 1
} as RigidBodySettings, {
  width: 1,
  height: 1,
  depth: 1
} as BodyBoxParams)
scene.add(physicsCube)

//
// Physics sphere
//
const physicsSphere = new THREE.Mesh(new THREE.SphereGeometry(0.5), NormalMaterial)
physicsSphere.name = 'PhysicsSphere'
physicsSphere.position.x = 1
physicsSphere.position.y = 2
physicsSphere.position.z = -2.5

addComponent(physicsSphere, BodySphere, {
  motionType: MotionType.DYNAMIC,
  restitution: .8
} as RigidBodySettings, {
    radius: 0.55
} as BodySphereParams)
scene.add(physicsSphere)

camera.position.set(6.2, 4.2, 7.4)
camera.lookAt(0, 0.6, 0)
modules.orbitControls.controls.target.set(0, 0.6, 0)
modules.orbitControls.controls.update()

const hideProfiler = () => {
  try { starter.ctx.modules.inspector.inspector.setVisible(false) } catch { /* mounts lazily */ }
}
hideProfiler()
requestAnimationFrame(hideProfiler)
setTimeout(hideProfiler, 400)
}

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

  const debugNode = Fn(() => {
    const top = mix(scenePassColor.renderOutput(), scenePassDepth.step(1), step(0.5, screenUV.x))
    const bottom = mix(scenePassNormal, scenePassVelocity, step(0.5, screenUV.x))
    const out = mix(top, bottom, step(0.5, screenUV.y))

    return out
  })()

  const shadedNode = scenePassColor.renderOutput()
  applyShading = (mode) => {
    renderPipeline.outputNode = mode === 'debug' ? debugNode : shadedNode
  }
  applyShading('shaded')
}
