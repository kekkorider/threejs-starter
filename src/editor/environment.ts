import * as THREE from 'three/webgpu'
import type { ShadowTypeName } from './state'

/**
 * Viewport environment owned by a WorldEnvironment node.
 *
 * Godot stores this on an Environment resource: background, ambient light,
 * reflected light, and fog. Three.js uses one environment map for sky ambient
 * and reflections together, so those two Godot groups share that map here.
 * A color ambient source adds a fill light beside the map. Shadow settings
 * move with the node because they used to be scene fields on World.
 */
export type BackgroundMode = 'color' | 'sky' | 'canvas'
export type AmbientSource = 'background' | 'disabled' | 'color' | 'sky'
export type FogMode = 'exponential' | 'depth'

export interface EnvironmentSettings {
  backgroundMode: BackgroundMode
  backgroundColor: string
  backgroundEnergy: number
  ambientSource: AmbientSource
  ambientColor: string
  ambientEnergy: number
  /** 0 keeps the ambient color. 1 gives the whole energy to the environment map. */
  ambientSkyContribution: number
  fogEnabled: boolean
  fogMode: FogMode
  fogColor: string
  fogDensity: number
  fogStart: number
  fogEnd: number
  shadows: boolean
  shadowType: ShadowTypeName
}

export type EnvironmentNumberField =
  | 'backgroundEnergy'
  | 'ambientEnergy'
  | 'ambientSkyContribution'
  | 'fogDensity'
  | 'fogStart'
  | 'fogEnd'

export type EnvironmentFlagField = 'fogEnabled' | 'shadows'

export interface EnvironmentView {
  active: boolean
  total: number
  activeName: string
  settings: EnvironmentSettings
}

/** Fields an older scene file stored on the scene instead of a node. */
export interface LegacySceneEnvironment {
  background: string
  backgroundIntensity: number
  environmentIntensity: number
  shadows: boolean
  shadowType: ShadowTypeName
  environment?: EnvironmentSettings | null
}

const SHADOW_TYPE: Record<ShadowTypeName, THREE.ShadowMapType> = {
  basic: THREE.BasicShadowMap,
  pcf: THREE.PCFShadowMap,
  vsm: THREE.VSMShadowMap,
}

const BACKGROUND_MODES = new Set<BackgroundMode>(['color', 'sky', 'canvas'])
const AMBIENT_SOURCES = new Set<AmbientSource>(['background', 'disabled', 'color', 'sky'])
const FOG_MODES = new Set<FogMode>(['exponential', 'depth'])
const SHADOW_TYPES = new Set<ShadowTypeName>(['basic', 'pcf', 'vsm'])

export function defaultEnvironmentSettings(): EnvironmentSettings {
  return {
    backgroundMode: 'color',
    backgroundColor: '#3a3a3a',
    backgroundEnergy: 1,
    ambientSource: 'sky',
    ambientColor: '#ffffff',
    ambientEnergy: 0.55,
    ambientSkyContribution: 1,
    fogEnabled: false,
    fogMode: 'exponential',
    fogColor: '#c8c8c8',
    fogDensity: 0.05,
    fogStart: 10,
    fogEnd: 40,
    shadows: true,
    shadowType: 'pcf',
  }
}

export function copyEnvironmentSettings(settings: EnvironmentSettings): EnvironmentSettings {
  return { ...settings }
}

export function isEnvironmentSettings(value: unknown): value is EnvironmentSettings {
  if (!value || typeof value !== 'object') return false
  const settings = value as EnvironmentSettings
  return BACKGROUND_MODES.has(settings.backgroundMode)
    && isColor(settings.backgroundColor)
    && finite(settings.backgroundEnergy)
    && AMBIENT_SOURCES.has(settings.ambientSource)
    && isColor(settings.ambientColor)
    && finite(settings.ambientEnergy)
    && finite(settings.ambientSkyContribution)
    && typeof settings.fogEnabled === 'boolean'
    && FOG_MODES.has(settings.fogMode)
    && isColor(settings.fogColor)
    && finite(settings.fogDensity)
    && finite(settings.fogStart)
    && finite(settings.fogEnd)
    && typeof settings.shadows === 'boolean'
    && SHADOW_TYPES.has(settings.shadowType)
}

export function readEnvironment(object: THREE.Object3D): EnvironmentSettings | null {
  const stored = object.userData.environment
  return isEnvironmentSettings(stored) ? stored : null
}

/**
 * Old scene files keep background and shadows on `scene` and have no node.
 * A saved `environment: null` means the user removed every WorldEnvironment.
 */
export function shouldSynthesizeEnvironment(
  environment: EnvironmentSettings | null | undefined,
  hasNode: boolean,
): boolean {
  return !hasNode && environment !== null
}

export function environmentFromLegacy(scene: LegacySceneEnvironment): EnvironmentSettings {
  if (scene.environment && isEnvironmentSettings(scene.environment)) return copyEnvironmentSettings(scene.environment)
  const settings = defaultEnvironmentSettings()
  settings.backgroundMode = 'color'
  settings.backgroundColor = scene.background
  settings.backgroundEnergy = scene.backgroundIntensity
  settings.ambientSource = 'sky'
  settings.ambientEnergy = scene.environmentIntensity
  settings.ambientSkyContribution = 1
  settings.shadows = scene.shadows
  settings.shadowType = scene.shadowType
  return settings
}

export function writeEnvironmentNumber(settings: EnvironmentSettings, field: EnvironmentNumberField, value: number): void {
  if (!Number.isFinite(value)) return
  if (field === 'ambientSkyContribution') settings.ambientSkyContribution = Math.min(1, Math.max(0, value))
  else if (field === 'fogDensity') settings.fogDensity = Math.max(0, value)
  else if (field === 'backgroundEnergy' || field === 'ambientEnergy') settings[field] = Math.max(0, value)
  else settings[field] = value
}

export function writeEnvironmentColor(
  settings: EnvironmentSettings,
  field: 'backgroundColor' | 'ambientColor' | 'fogColor',
  color: string,
): void {
  if (!isColor(color)) return
  settings[field] = color
}

export function resetEnvironmentField<K extends keyof EnvironmentSettings>(
  settings: EnvironmentSettings,
  defaults: EnvironmentSettings,
  field: K,
): void {
  settings[field] = defaults[field]
}

/**
 * First WorldEnvironment in breadth-first tree order.
 * That is the node closest to the root, with earlier siblings winning a tie.
 */
export function closestEnvironment<T>(
  root: T,
  childrenOf: (node: T) => readonly T[],
  isEnvironment: (node: T) => boolean,
): T | null {
  const queue: T[] = [root]
  const seen = new Set<T>()
  while (queue.length > 0) {
    const node = queue.shift()!
    if (seen.has(node)) continue
    seen.add(node)
    if (isEnvironment(node)) return node
    for (const child of childrenOf(node)) queue.push(child)
  }
  return null
}

export function applyEnvironmentSettings(
  scene: THREE.Scene,
  renderer: { shadowMap: { enabled: boolean, type: THREE.ShadowMapType }, setClearAlpha: (alpha: number) => void },
  ambient: THREE.AmbientLight,
  settings: EnvironmentSettings,
): void {
  const envMap = scene.environment
  const hasMap = Boolean(envMap)
  const mode = settings.backgroundMode

  if (mode === 'canvas') {
    scene.background = null
    renderer.setClearAlpha(0)
  } else if (mode === 'sky' && hasMap && envMap) {
    scene.background = envMap
    renderer.setClearAlpha(1)
  } else {
    if (scene.background instanceof THREE.Color) scene.background.set(settings.backgroundColor)
    else scene.background = new THREE.Color(settings.backgroundColor)
    renderer.setClearAlpha(1)
  }
  scene.backgroundIntensity = Math.max(0, settings.backgroundEnergy)

  const skyLike = settings.ambientSource === 'sky' || (settings.ambientSource === 'background' && mode === 'sky')
  const colorLike = settings.ambientSource === 'color' || (settings.ambientSource === 'background' && mode !== 'sky')
  const energy = Math.max(0, settings.ambientEnergy)
  const contribution = Math.min(1, Math.max(0, settings.ambientSkyContribution))

  if (settings.ambientSource === 'disabled') {
    scene.environmentIntensity = 0
    ambient.intensity = 0
  } else if (skyLike) {
    scene.environmentIntensity = hasMap ? energy : 0
    ambient.color.set('#ffffff')
    ambient.intensity = hasMap ? 0 : energy
  } else if (colorLike) {
    scene.environmentIntensity = hasMap ? energy * contribution : 0
    ambient.color.set(settings.ambientSource === 'color' ? settings.ambientColor : settings.backgroundColor)
    ambient.intensity = energy * (hasMap ? 1 - contribution : 1)
  } else {
    scene.environmentIntensity = 0
    ambient.intensity = 0
  }

  if (!settings.fogEnabled) {
    scene.fog = null
  } else if (settings.fogMode === 'exponential') {
    const density = Math.max(0, settings.fogDensity)
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.set(settings.fogColor)
      scene.fog.density = density
    } else {
      scene.fog = new THREE.FogExp2(settings.fogColor, density)
    }
  } else {
    const near = settings.fogStart
    const far = Math.max(settings.fogEnd, near + 0.001)
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.set(settings.fogColor)
      scene.fog.near = near
      scene.fog.far = far
    } else {
      scene.fog = new THREE.Fog(settings.fogColor, near, far)
    }
  }

  renderer.shadowMap.enabled = settings.shadows
  renderer.shadowMap.type = SHADOW_TYPE[settings.shadowType]
}

function isColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
