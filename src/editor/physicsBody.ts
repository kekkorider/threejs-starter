/**
 * Inspector and scene-file data for a Body node.
 * Shape numbers match the behaviours in src/webgl/behaviors/physics:
 * a box stores full width, height, and depth; the rigid shape uses half of each.
 */

export type BodyMotion = 'static' | 'kinematic' | 'dynamic'
export type BodyShapeKind = 'box' | 'sphere' | 'triangle' | 'convexHull'
export type CombineModeName = 'average' | 'multiply' | 'min' | 'max' | 'geometricMean'
export type MotionQualityName = 'discrete' | 'linearCast'

export interface BodyDof {
  translateX: boolean
  translateY: boolean
  translateZ: boolean
  rotateX: boolean
  rotateY: boolean
  rotateZ: boolean
}

export interface BodySettings {
  motion: BodyMotion
  shape: BodyShapeKind
  width: number
  height: number
  depth: number
  radius: number
  /** Runtime or file id of the mesh triangle and convex hull shapes read. Empty uses the first mesh child. */
  meshId: string
  mass: number
  friction: number
  restitution: number
  frictionCombine: CombineModeName
  restitutionCombine: CombineModeName
  linearDamping: number
  angularDamping: number
  gravityFactor: number
  sensor: boolean
  allowSleeping: boolean
  maxLinearVelocity: number
  maxAngularVelocity: number
  motionQuality: MotionQualityName
  dof: BodyDof
  collideKinematicVsNonDynamic: boolean
  enhancedInternalEdgeRemoval: boolean
  useManifoldReduction: boolean
}

const MOTIONS = new Set<BodyMotion>(['static', 'kinematic', 'dynamic'])
const SHAPES = new Set<BodyShapeKind>(['box', 'sphere', 'triangle', 'convexHull'])
const COMBINES = new Set<CombineModeName>(['average', 'multiply', 'min', 'max', 'geometricMean'])
const QUALITIES = new Set<MotionQualityName>(['discrete', 'linearCast'])

export function defaultBodyDof(): BodyDof {
  return {
    translateX: true,
    translateY: true,
    translateZ: true,
    rotateX: true,
    rotateY: true,
    rotateZ: true,
  }
}

/** Defaults follow crashcat `DEFAULT_RIGID_BODY_SETTINGS` and the existing body behaviours. */
export function defaultBodySettings(): BodySettings {
  return {
    motion: 'static',
    shape: 'box',
    width: 1,
    height: 1,
    depth: 1,
    radius: 1,
    meshId: '',
    mass: 1,
    friction: 0.2,
    restitution: 0,
    frictionCombine: 'geometricMean',
    restitutionCombine: 'max',
    linearDamping: 0.05,
    angularDamping: 0.05,
    gravityFactor: 1,
    sensor: false,
    allowSleeping: true,
    maxLinearVelocity: 500,
    maxAngularVelocity: 0.25 * Math.PI * 60,
    motionQuality: 'discrete',
    dof: defaultBodyDof(),
    collideKinematicVsNonDynamic: false,
    enhancedInternalEdgeRemoval: false,
    useManifoldReduction: true,
  }
}

export function copyBodyDof(dof: BodyDof): BodyDof {
  return { ...dof }
}

export function copyBodySettings(settings: BodySettings): BodySettings {
  return {
    ...settings,
    dof: copyBodyDof(settings.dof),
  }
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isDof(value: unknown): value is BodyDof {
  if (!value || typeof value !== 'object') return false
  const dof = value as BodyDof
  return typeof dof.translateX === 'boolean'
    && typeof dof.translateY === 'boolean'
    && typeof dof.translateZ === 'boolean'
    && typeof dof.rotateX === 'boolean'
    && typeof dof.rotateY === 'boolean'
    && typeof dof.rotateZ === 'boolean'
}

export function isBodySettings(value: unknown): value is BodySettings {
  if (!value || typeof value !== 'object') return false
  const body = value as BodySettings
  return MOTIONS.has(body.motion)
    && SHAPES.has(body.shape)
    && finite(body.width)
    && finite(body.height)
    && finite(body.depth)
    && finite(body.radius)
    && typeof body.meshId === 'string'
    && finite(body.mass)
    && finite(body.friction)
    && finite(body.restitution)
    && COMBINES.has(body.frictionCombine)
    && COMBINES.has(body.restitutionCombine)
    && finite(body.linearDamping)
    && finite(body.angularDamping)
    && finite(body.gravityFactor)
    && typeof body.sensor === 'boolean'
    && typeof body.allowSleeping === 'boolean'
    && finite(body.maxLinearVelocity)
    && finite(body.maxAngularVelocity)
    && QUALITIES.has(body.motionQuality)
    && isDof(body.dof)
    && typeof body.collideKinematicVsNonDynamic === 'boolean'
    && typeof body.enhancedInternalEdgeRemoval === 'boolean'
    && typeof body.useManifoldReduction === 'boolean'
}

export function bodyFromUnknown(value: unknown): BodySettings {
  return isBodySettings(value) ? copyBodySettings(value) : defaultBodySettings()
}

export function readBody(object: { userData: Record<string, unknown> }): BodySettings {
  return bodyFromUnknown(object.userData.body)
}

function positive(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback
  return value
}

function nonNegative(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value < 0) return fallback
  return value
}

/** Keep sizes and damping inside the range crashcat can simulate. */
export function sanitizeBody(settings: BodySettings): void {
  const defaults = defaultBodySettings()
  settings.width = positive(settings.width, defaults.width)
  settings.height = positive(settings.height, defaults.height)
  settings.depth = positive(settings.depth, defaults.depth)
  settings.radius = positive(settings.radius, defaults.radius)
  settings.mass = positive(settings.mass, defaults.mass)
  settings.friction = nonNegative(settings.friction, defaults.friction)
  settings.restitution = nonNegative(settings.restitution, defaults.restitution)
  settings.linearDamping = nonNegative(settings.linearDamping, defaults.linearDamping)
  settings.angularDamping = nonNegative(settings.angularDamping, defaults.angularDamping)
  settings.gravityFactor = Number.isFinite(settings.gravityFactor) ? settings.gravityFactor : defaults.gravityFactor
  settings.maxLinearVelocity = positive(settings.maxLinearVelocity, defaults.maxLinearVelocity)
  settings.maxAngularVelocity = positive(settings.maxAngularVelocity, defaults.maxAngularVelocity)
  if (!MOTIONS.has(settings.motion)) settings.motion = defaults.motion
  if (!SHAPES.has(settings.shape)) settings.shape = defaults.shape
  if (!COMBINES.has(settings.frictionCombine)) settings.frictionCombine = defaults.frictionCombine
  if (!COMBINES.has(settings.restitutionCombine)) settings.restitutionCombine = defaults.restitutionCombine
  if (!QUALITIES.has(settings.motionQuality)) settings.motionQuality = defaults.motionQuality
}

export function resetBodyField(settings: BodySettings, defaults: BodySettings, key: keyof BodySettings): void {
  if (key === 'dof') {
    settings.dof = copyBodyDof(defaults.dof)
    return
  }
  Object.assign(settings, { [key]: defaults[key] })
}

/** Static bodies use the not-moving layer. Kinematic and dynamic bodies use the moving layer. */
export function bodyLayerLabel(motion: BodyMotion): string {
  return motion === 'static' ? 'Not Moving' : 'Moving'
}
