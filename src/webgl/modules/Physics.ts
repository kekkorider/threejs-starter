import { ContextModule } from 'three-start'
import {
  registerAll,
  createWorld,
  createWorldSettings,
  addBroadphaseLayer,
  addObjectLayer,
  enableCollision,
  updateWorld,
} from 'crashcat'
import type { World, WorldSettings } from 'crashcat'
import type { PhysicsWorldSettings } from '../../editor/physicsSettings'

export class PhysicsModule extends ContextModule {
  /** Play sets this. The world does not step while the editor is idle. */
  simulating = false
  settings!: WorldSettings
  world!: World

  BROADPHASE_LAYER_MOVING!: number
  BROADPHASE_LAYER_NOT_MOVING!: number

  OBJECT_LAYER_MOVING!: number
  OBJECT_LAYER_NOT_MOVING!: number

  private initialWorld: PhysicsWorldSettings | null

  constructor(world?: PhysicsWorldSettings) {
    super()
    this.initialWorld = world ?? null
  }

  onAwake() {
    registerAll()

    this.settings = createWorldSettings()
    if (this.initialWorld) applyWorldSettings(this.settings, this.initialWorld)

    this.BROADPHASE_LAYER_MOVING = addBroadphaseLayer(this.settings)
    this.BROADPHASE_LAYER_NOT_MOVING = addBroadphaseLayer(this.settings)

    this.OBJECT_LAYER_MOVING = addObjectLayer(this.settings, this.BROADPHASE_LAYER_MOVING)
    this.OBJECT_LAYER_NOT_MOVING = addObjectLayer(this.settings, this.BROADPHASE_LAYER_NOT_MOVING)

    const pairs = this.initialWorld?.pairs
    const movingNotMoving = pairs ? pairs.movingNotMoving : true
    const movingMoving = pairs ? pairs.movingMoving : true
    if (movingNotMoving) {
      enableCollision(this.settings, this.OBJECT_LAYER_MOVING, this.OBJECT_LAYER_NOT_MOVING)
    }
    if (movingMoving) {
      enableCollision(this.settings, this.OBJECT_LAYER_MOVING, this.OBJECT_LAYER_MOVING)
    }

    this.world = createWorld(this.settings)
  }

  onUpdate() {
    if (!this.simulating) return
    updateWorld(this.world, undefined, this.ctx.getDeltaTime())
  }

  /** Write world fields onto the object `createWorld` kept. Layers stay as they were at boot. */
  applyWorld(next: PhysicsWorldSettings): void {
    if (!this.settings) return
    applyWorldSettings(this.settings, next)
  }
}

function applyWorldSettings(settings: WorldSettings, next: PhysicsWorldSettings): void {
  settings.gravity[0] = next.gravity[0]
  settings.gravity[1] = next.gravity[1]
  settings.gravity[2] = next.gravity[2]
  settings.gravityEnabled = next.gravityEnabled
  settings.contacts.contactPointPreserveLambdaMaxDistSq = next.contacts.contactPointPreserveLambdaMaxDistSq
  Object.assign(settings.narrowphase, next.narrowphase)
  Object.assign(settings.solver, next.solver)
  Object.assign(settings.sleeping, next.sleeping)
  Object.assign(settings.ccd, next.ccd)
}
