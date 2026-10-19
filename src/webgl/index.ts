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
import { AssetLoaderModule } from './modules/AssetLoader'
import { OrbitControlsModule } from './modules/OrbitControls'
import { PhysicsModule } from './modules/Physics'
import { InspectorModule } from './modules/Inspector'
import { InputModule } from './modules/Input'

import { ScaleMaterial } from './materials/scale'
import { Spin } from './behaviors/Spin'
import { DEFAULT_FLAGS, compileTSLMaterial, presetById } from '../editor/tsl'

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

let shadingMode: 'shaded' | 'debug' = 'shaded'
let applyShading: (mode: 'shaded' | 'debug') => void = (mode) => {
  shadingMode = mode
}

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

renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap

modules.assetLoader.createKTX2Loader()

//
// Floor. The UV preset paints albedo from mesh UVs and stays lit, so shadows show.
//
const floorMaterial = compileTSLMaterial(presetById('uv').source, { ...DEFAULT_FLAGS })
floorMaterial.name = 'UV'
const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 10), floorMaterial)
floor.name = 'Floor'
floor.position.set(0, 0, 0)
floor.receiveShadow = true
floor.castShadow = true
scene.add(floor)

//
// Spinning cube
//
const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ScaleMaterial)
cube.name = 'Cube'
cube.castShadow = true
cube.position.set(0, 1.5, 0)
addComponent(cube, Spin, { axis: 'y', speed: 1 })
addComponent(cube, Spin, { axis: 'z', speed: 0.87 })
scene.add(cube)

camera.position.set(6.2, 4.2, 7.4)
camera.lookAt(0, 0, 0)
modules.orbitControls.controls.target.set(0, 0, 0)
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
    shadingMode = mode
    renderPipeline.outputNode = mode === 'debug' ? debugNode : shadedNode
    // Assigning outputNode does not rebuild the pipeline on its own.
    renderPipeline.needsUpdate = true
  }
  applyShading(shadingMode)
}
