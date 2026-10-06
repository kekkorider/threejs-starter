import { ContextModule } from "three-start"
import {
  registerAll,
  createWorld,
  type World,
  createWorldSettings,
  type WorldSettings,
  addBroadphaseLayer,
  addObjectLayer,
  enableCollision,
  updateWorld
} from "crashcat"
import { debugRenderer } from "crashcat/three"

export class PhysicsModule extends ContextModule {
  isDebug: boolean = false
  debugState!: debugRenderer.State
  settings!: WorldSettings
  world!: World

  BROADPHASE_LAYER_MOVING!: number
  BROADPHASE_LAYER_NOT_MOVING!: number

  OBJECT_LAYER_MOVING!: number
  OBJECT_LAYER_NOT_MOVING!: number

  constructor(isDebug: boolean = false) {
    super()
    this.isDebug = isDebug
  }

  onAwake() {
    registerAll()

    this.settings = createWorldSettings()

    this.BROADPHASE_LAYER_MOVING = addBroadphaseLayer(this.settings)
    this.BROADPHASE_LAYER_NOT_MOVING = addBroadphaseLayer(this.settings)

    this.OBJECT_LAYER_MOVING = addObjectLayer(this.settings, this.BROADPHASE_LAYER_MOVING)
    this.OBJECT_LAYER_NOT_MOVING = addObjectLayer(this.settings, this.BROADPHASE_LAYER_NOT_MOVING)

    enableCollision(this.settings, this.OBJECT_LAYER_MOVING, this.OBJECT_LAYER_NOT_MOVING)
    enableCollision(this.settings, this.OBJECT_LAYER_MOVING, this.OBJECT_LAYER_MOVING)

    this.world = createWorld(this.settings)

    if (this.isDebug) {
      this.createDebug()
    }
  }

  onUpdate() {
    updateWorld(this.world, undefined, this.ctx.getDeltaTime())

    if (this.isDebug) {
      debugRenderer.update(this.debugState, this.world)
    }
  }

  createDebug() {
    const options = debugRenderer.createDefaultOptions()
    options.bodies.wireframe = true
    options.bodies.color = debugRenderer.BodyColorMode.INSTANCE

    this.debugState = debugRenderer.init(options)

    this.ctx.scene.add(this.debugState.object3d)
  }
}
