import * as THREE from 'three/webgpu'
import {
  copyEnvironmentSettings,
  defaultEnvironmentSettings,
  isEnvironmentSettings,
  type EnvironmentSettings,
} from './environment'

/**
 * Project-wide preview sun and environment for the 3D viewport.
 * Matches Godot: editor-only fill when the scene has no DirectionalLight
 * or no WorldEnvironment. Settings are shared across every open scene.
 */

export const PREVIEW_SUN_ENV_KEY = 'threejs-starter.preview-sun-env'

export interface PreviewSunSettings {
  color: string
  energy: number
  /** Degrees above the horizon. 0 is the horizon. 90 is straight up. */
  altitude: number
  /** Degrees around Y. 0 faces +Z. */
  azimuth: number
  shadows: boolean
}

export interface PreviewSunEnvState {
  sunEnabled: boolean
  envEnabled: boolean
  sun: PreviewSunSettings
  environment: EnvironmentSettings
}

const COLOR = /^#[0-9a-fA-F]{6}$/

export function defaultPreviewSunSettings(): PreviewSunSettings {
  return {
    color: '#fff5e0',
    energy: 1.2,
    altitude: 37,
    azimuth: -45,
    shadows: true,
  }
}

/** Preview env defaults lean toward Godot's procedural sky preview. */
export function defaultPreviewEnvironmentSettings(): EnvironmentSettings {
  const settings = defaultEnvironmentSettings()
  settings.backgroundMode = 'sky'
  settings.backgroundEnergy = 1
  settings.ambientSource = 'sky'
  settings.ambientEnergy = 0.55
  settings.ambientSkyContribution = 1
  settings.shadows = true
  settings.shadowType = 'pcf'
  return settings
}

/** Clear background and no ambient when preview env is off and no WorldEnvironment exists. */
export function bareEnvironmentSettings(): EnvironmentSettings {
  return {
    backgroundMode: 'color',
    backgroundColor: '#000000',
    backgroundEnergy: 1,
    ambientSource: 'disabled',
    ambientColor: '#ffffff',
    ambientEnergy: 0,
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

export function defaultPreviewSunEnvState(): PreviewSunEnvState {
  return {
    sunEnabled: true,
    envEnabled: true,
    sun: defaultPreviewSunSettings(),
    environment: defaultPreviewEnvironmentSettings(),
  }
}

export function copyPreviewSunSettings(settings: PreviewSunSettings): PreviewSunSettings {
  return { ...settings }
}

/**
 * Unit vector from the origin toward the sun.
 * Place the directional light along this vector and aim it at the origin.
 */
export function altitudeAzimuthToDirection(altitudeDeg: number, azimuthDeg: number): THREE.Vector3 {
  const altitude = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(altitudeDeg, -90, 90))
  const azimuth = THREE.MathUtils.degToRad(azimuthDeg)
  const cosAlt = Math.cos(altitude)
  return new THREE.Vector3(
    cosAlt * Math.sin(azimuth),
    Math.sin(altitude),
    cosAlt * Math.cos(azimuth),
  ).normalize()
}

const PREVIEW_SUN_DISTANCE = 12

export function applyPreviewSunToLight(light: THREE.DirectionalLight, settings: PreviewSunSettings): void {
  light.color.set(settings.color)
  light.intensity = Math.max(0, settings.energy)
  light.castShadow = settings.shadows
  const direction = altitudeAzimuthToDirection(settings.altitude, settings.azimuth)
  light.position.copy(direction).multiplyScalar(PREVIEW_SUN_DISTANCE)
  light.lookAt(0, 0, 0)
  light.target.position.set(0, 0, 0)
  light.target.updateMatrixWorld()
}

export function isPreviewSunSettings(value: unknown): value is PreviewSunSettings {
  if (!value || typeof value !== 'object') return false
  const settings = value as PreviewSunSettings
  return COLOR.test(settings.color)
    && typeof settings.energy === 'number' && Number.isFinite(settings.energy)
    && typeof settings.altitude === 'number' && Number.isFinite(settings.altitude)
    && typeof settings.azimuth === 'number' && Number.isFinite(settings.azimuth)
    && typeof settings.shadows === 'boolean'
}

export function readPreviewSunEnvState(): PreviewSunEnvState {
  const fallback = defaultPreviewSunEnvState()
  if (typeof localStorage === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(PREVIEW_SUN_ENV_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<PreviewSunEnvState>
    return {
      sunEnabled: typeof parsed.sunEnabled === 'boolean' ? parsed.sunEnabled : fallback.sunEnabled,
      envEnabled: typeof parsed.envEnabled === 'boolean' ? parsed.envEnabled : fallback.envEnabled,
      sun: isPreviewSunSettings(parsed.sun) ? copyPreviewSunSettings(parsed.sun) : fallback.sun,
      environment: isEnvironmentSettings(parsed.environment)
        ? copyEnvironmentSettings(parsed.environment)
        : fallback.environment,
    }
  } catch {
    return fallback
  }
}

export function writePreviewSunEnvState(state: PreviewSunEnvState): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(PREVIEW_SUN_ENV_KEY, JSON.stringify({
    sunEnabled: state.sunEnabled,
    envEnabled: state.envEnabled,
    sun: copyPreviewSunSettings(state.sun),
    environment: copyEnvironmentSettings(state.environment),
  }))
}
