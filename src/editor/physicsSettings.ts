/**
 * Project-wide physics switch and crashcat world settings.
 * Stored beside the preview sun: one copy for every scene.
 * `enabled` is read before boot. When it is false, PhysicsModule is not imported.
 */

export const PHYSICS_KEY = 'threejs-starter.physics'

export interface PhysicsCollisionPairs {
  /** Moving bodies collide with not-moving bodies. */
  movingNotMoving: boolean
  /** Moving bodies collide with other moving bodies. */
  movingMoving: boolean
}

export interface PhysicsNarrowphaseSettings {
  collisionTolerance: number
  penetrationTolerance: number
  returnDeepestPoint: boolean
  collideOnlyWithActiveEdges: boolean
  speculativeContactDistance: number
  manifoldTolerance: number
  collideWithBackfaces: boolean
  useManifoldReduction: boolean
  normalCosMaxDeltaRotation: number
  useBodyPairContactCache: boolean
  bodyPairCacheMaxDeltaPositionSq: number
  bodyPairCacheCosMaxDeltaRotationDiv2: number
}

export interface PhysicsSolverSettings {
  minVelocityForRestitution: number
  velocityIterations: number
  positionIterations: number
  warmStarting: boolean
  penetrationSlop: number
  baumgarteFactor: number
  warmStartImpulseRatio: number
  maxPenetrationDistance: number
}

export interface PhysicsSleepingSettings {
  allowSleeping: boolean
  timeBeforeSleep: number
  pointVelocitySleepThreshold: number
}

export interface PhysicsCcdSettings {
  linearCastThreshold: number
  linearCastMaxPenetration: number
  minVelocityForRestitution: number
}

export interface PhysicsWorldSettings {
  gravity: [number, number, number]
  gravityEnabled: boolean
  contacts: { contactPointPreserveLambdaMaxDistSq: number }
  narrowphase: PhysicsNarrowphaseSettings
  solver: PhysicsSolverSettings
  sleeping: PhysicsSleepingSettings
  ccd: PhysicsCcdSettings
  pairs: PhysicsCollisionPairs
}

export interface PhysicsState {
  enabled: boolean
  world: PhysicsWorldSettings
}

/** crashcat `createWorldSettings` defaults, plus the two collision pairs this project builds. */
export function defaultPhysicsWorldSettings(): PhysicsWorldSettings {
  return {
    gravity: [0, -9.81, 0],
    gravityEnabled: true,
    contacts: { contactPointPreserveLambdaMaxDistSq: 0.0001 },
    narrowphase: {
      collisionTolerance: 1e-4,
      penetrationTolerance: 1e-4,
      returnDeepestPoint: false,
      collideOnlyWithActiveEdges: true,
      speculativeContactDistance: 0.02,
      manifoldTolerance: 1e-3,
      collideWithBackfaces: false,
      useManifoldReduction: true,
      normalCosMaxDeltaRotation: Math.cos(5 * Math.PI / 180),
      useBodyPairContactCache: true,
      bodyPairCacheMaxDeltaPositionSq: 1e-6,
      bodyPairCacheCosMaxDeltaRotationDiv2: Math.cos(1 * Math.PI / 180),
    },
    solver: {
      minVelocityForRestitution: 1,
      velocityIterations: 10,
      positionIterations: 2,
      warmStarting: true,
      penetrationSlop: 0.02,
      baumgarteFactor: 0.2,
      warmStartImpulseRatio: 1,
      maxPenetrationDistance: 0.2,
    },
    sleeping: {
      allowSleeping: true,
      timeBeforeSleep: 0.5,
      pointVelocitySleepThreshold: 0.03,
    },
    ccd: {
      linearCastThreshold: 0.05,
      linearCastMaxPenetration: 0.25,
      minVelocityForRestitution: 1,
    },
    pairs: {
      movingNotMoving: true,
      movingMoving: true,
    },
  }
}

export function defaultPhysicsState(): PhysicsState {
  return {
    enabled: true,
    world: defaultPhysicsWorldSettings(),
  }
}

export function copyPhysicsWorldSettings(settings: PhysicsWorldSettings): PhysicsWorldSettings {
  return {
    gravity: [settings.gravity[0], settings.gravity[1], settings.gravity[2]],
    gravityEnabled: settings.gravityEnabled,
    contacts: { ...settings.contacts },
    narrowphase: { ...settings.narrowphase },
    solver: { ...settings.solver },
    sleeping: { ...settings.sleeping },
    ccd: { ...settings.ccd },
    pairs: { ...settings.pairs },
  }
}

export function copyPhysicsState(state: PhysicsState): PhysicsState {
  return {
    enabled: state.enabled,
    world: copyPhysicsWorldSettings(state.world),
  }
}

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function vec3(value: unknown, fallback: [number, number, number]): [number, number, number] {
  if (!Array.isArray(value) || value.length !== 3) return [...fallback]
  return [
    finite(value[0], fallback[0]),
    finite(value[1], fallback[1]),
    finite(value[2], fallback[2]),
  ]
}

function readNarrowphase(value: unknown, fallback: PhysicsNarrowphaseSettings): PhysicsNarrowphaseSettings {
  const source = value && typeof value === 'object' ? value as Partial<PhysicsNarrowphaseSettings> : {}
  return {
    collisionTolerance: finite(source.collisionTolerance, fallback.collisionTolerance),
    penetrationTolerance: finite(source.penetrationTolerance, fallback.penetrationTolerance),
    returnDeepestPoint: flag(source.returnDeepestPoint, fallback.returnDeepestPoint),
    collideOnlyWithActiveEdges: flag(source.collideOnlyWithActiveEdges, fallback.collideOnlyWithActiveEdges),
    speculativeContactDistance: finite(source.speculativeContactDistance, fallback.speculativeContactDistance),
    manifoldTolerance: finite(source.manifoldTolerance, fallback.manifoldTolerance),
    collideWithBackfaces: flag(source.collideWithBackfaces, fallback.collideWithBackfaces),
    useManifoldReduction: flag(source.useManifoldReduction, fallback.useManifoldReduction),
    normalCosMaxDeltaRotation: finite(source.normalCosMaxDeltaRotation, fallback.normalCosMaxDeltaRotation),
    useBodyPairContactCache: flag(source.useBodyPairContactCache, fallback.useBodyPairContactCache),
    bodyPairCacheMaxDeltaPositionSq: finite(source.bodyPairCacheMaxDeltaPositionSq, fallback.bodyPairCacheMaxDeltaPositionSq),
    bodyPairCacheCosMaxDeltaRotationDiv2: finite(source.bodyPairCacheCosMaxDeltaRotationDiv2, fallback.bodyPairCacheCosMaxDeltaRotationDiv2),
  }
}

function readSolver(value: unknown, fallback: PhysicsSolverSettings): PhysicsSolverSettings {
  const source = value && typeof value === 'object' ? value as Partial<PhysicsSolverSettings> : {}
  return {
    minVelocityForRestitution: finite(source.minVelocityForRestitution, fallback.minVelocityForRestitution),
    velocityIterations: finite(source.velocityIterations, fallback.velocityIterations),
    positionIterations: finite(source.positionIterations, fallback.positionIterations),
    warmStarting: flag(source.warmStarting, fallback.warmStarting),
    penetrationSlop: finite(source.penetrationSlop, fallback.penetrationSlop),
    baumgarteFactor: finite(source.baumgarteFactor, fallback.baumgarteFactor),
    warmStartImpulseRatio: finite(source.warmStartImpulseRatio, fallback.warmStartImpulseRatio),
    maxPenetrationDistance: finite(source.maxPenetrationDistance, fallback.maxPenetrationDistance),
  }
}

function readSleeping(value: unknown, fallback: PhysicsSleepingSettings): PhysicsSleepingSettings {
  const source = value && typeof value === 'object' ? value as Partial<PhysicsSleepingSettings> : {}
  return {
    allowSleeping: flag(source.allowSleeping, fallback.allowSleeping),
    timeBeforeSleep: finite(source.timeBeforeSleep, fallback.timeBeforeSleep),
    pointVelocitySleepThreshold: finite(source.pointVelocitySleepThreshold, fallback.pointVelocitySleepThreshold),
  }
}

function readCcd(value: unknown, fallback: PhysicsCcdSettings): PhysicsCcdSettings {
  const source = value && typeof value === 'object' ? value as Partial<PhysicsCcdSettings> : {}
  return {
    linearCastThreshold: finite(source.linearCastThreshold, fallback.linearCastThreshold),
    linearCastMaxPenetration: finite(source.linearCastMaxPenetration, fallback.linearCastMaxPenetration),
    minVelocityForRestitution: finite(source.minVelocityForRestitution, fallback.minVelocityForRestitution),
  }
}

function readPairs(value: unknown, fallback: PhysicsCollisionPairs): PhysicsCollisionPairs {
  const source = value && typeof value === 'object' ? value as Partial<PhysicsCollisionPairs> : {}
  return {
    movingNotMoving: flag(source.movingNotMoving, fallback.movingNotMoving),
    movingMoving: flag(source.movingMoving, fallback.movingMoving),
  }
}

export function readPhysicsState(): PhysicsState {
  const fallback = defaultPhysicsState()
  if (typeof localStorage === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(PHYSICS_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<PhysicsState>
    const world = parsed.world && typeof parsed.world === 'object' ? parsed.world : {}
    const contacts = (world as PhysicsWorldSettings).contacts
    return {
      enabled: flag(parsed.enabled, fallback.enabled),
      world: {
        gravity: vec3((world as PhysicsWorldSettings).gravity, fallback.world.gravity),
        gravityEnabled: flag((world as PhysicsWorldSettings).gravityEnabled, fallback.world.gravityEnabled),
        contacts: {
          contactPointPreserveLambdaMaxDistSq: finite(
            contacts?.contactPointPreserveLambdaMaxDistSq,
            fallback.world.contacts.contactPointPreserveLambdaMaxDistSq,
          ),
        },
        narrowphase: readNarrowphase((world as PhysicsWorldSettings).narrowphase, fallback.world.narrowphase),
        solver: readSolver((world as PhysicsWorldSettings).solver, fallback.world.solver),
        sleeping: readSleeping((world as PhysicsWorldSettings).sleeping, fallback.world.sleeping),
        ccd: readCcd((world as PhysicsWorldSettings).ccd, fallback.world.ccd),
        pairs: readPairs((world as PhysicsWorldSettings).pairs, fallback.world.pairs),
      },
    }
  } catch {
    return fallback
  }
}

export function writePhysicsState(state: PhysicsState): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(PHYSICS_KEY, JSON.stringify(copyPhysicsState(state)))
}

/** True when this boot should import PhysicsModule. */
export function physicsEnabled(): boolean {
  return readPhysicsState().enabled
}
