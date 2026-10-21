import * as THREE from 'three/webgpu'

/** Projection a scene camera can use. */
export type CameraProjection = 'perspective' | 'orthographic'

/** Sub-rectangle of the frustum, matching Three.js `setViewOffset`. */
export interface CameraViewOffset {
  enabled: boolean
  fullWidth: number
  fullHeight: number
  offsetX: number
  offsetY: number
  width: number
  height: number
}

/**
 * Every value the inspector can edit on a camera.
 * Both projections keep their numbers, so switching does not throw the other away.
 */
export interface CameraSettings {
  projection: CameraProjection
  current: boolean
  /** While this camera is the view, fit it to the viewport instead of the saved aspect or width. */
  syncAspect: boolean
  near: number
  far: number
  zoom: number
  fov: number
  aspect: number
  focus: number
  filmGauge: number
  filmOffset: number
  left: number
  right: number
  top: number
  bottom: number
  view: CameraViewOffset
  /** `camera.layers.mask`. Bit 1 is layer 0, which is where meshes start. */
  layers: number
}

/** Inspector snapshot, including readouts Three.js derives from the lens. */
export interface CameraInspector extends CameraSettings {
  focalLength: number
  effectiveFov: number
  filmWidth: number
  filmHeight: number
  preview: boolean
}

export type CameraNumberField =
  | 'near'
  | 'far'
  | 'zoom'
  | 'fov'
  | 'aspect'
  | 'focus'
  | 'filmGauge'
  | 'filmOffset'
  | 'focalLength'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'fullWidth'
  | 'fullHeight'
  | 'offsetX'
  | 'offsetY'
  | 'viewWidth'
  | 'viewHeight'
  | 'layers'

export type CameraFlagField = 'current' | 'syncAspect' | 'viewEnabled'

export type CameraResetField = CameraNumberField | CameraFlagField | 'projection'

export function defaultCameraSettings(): CameraSettings {
  return {
    projection: 'perspective',
    current: false,
    syncAspect: false,
    near: 0.1,
    far: 50,
    zoom: 1,
    fov: 50,
    aspect: 1,
    focus: 10,
    filmGauge: 35,
    filmOffset: 0,
    left: -6,
    right: 6,
    top: 4,
    bottom: -4,
    view: {
      enabled: false,
      fullWidth: 1,
      fullHeight: 1,
      offsetX: 0,
      offsetY: 0,
      width: 1,
      height: 1,
    },
    layers: 1,
  }
}

export function copyCameraSettings(settings: CameraSettings): CameraSettings {
  return {
    ...settings,
    view: { ...settings.view },
  }
}

export function isCameraSettings(value: unknown): value is CameraSettings {
  if (!value || typeof value !== 'object') return false
  const camera = value as CameraSettings
  return (camera.projection === 'perspective' || camera.projection === 'orthographic')
    && typeof camera.current === 'boolean'
    && typeof camera.syncAspect === 'boolean'
    && finite(camera.near)
    && finite(camera.far)
    && finite(camera.zoom)
    && finite(camera.fov)
    && finite(camera.aspect)
    && finite(camera.focus)
    && finite(camera.filmGauge)
    && finite(camera.filmOffset)
    && finite(camera.left)
    && finite(camera.right)
    && finite(camera.top)
    && finite(camera.bottom)
    && isViewOffset(camera.view)
    && finite(camera.layers)
}

export function readCameraSettings(object: THREE.Object3D): CameraSettings | null {
  const stored = object.userData.camera as unknown
  return isCameraSettings(stored) ? stored : null
}

export function createCameraObject(settings: CameraSettings): THREE.PerspectiveCamera | THREE.OrthographicCamera {
  if (settings.projection === 'orthographic') {
    return new THREE.OrthographicCamera(settings.left, settings.right, settings.top, settings.bottom, settings.near, settings.far)
  }
  return new THREE.PerspectiveCamera(settings.fov, Math.max(settings.aspect, 0.001), Math.max(settings.near, 0.001), settings.far)
}

/**
 * Push saved settings onto a camera.
 * `fitViewport` is only for the camera currently being rendered: perspective takes the
 * viewport aspect, orthographic keeps its height and fits the width.
 */
export function applyCameraSettings(
  camera: THREE.Camera,
  settings: CameraSettings,
  viewportAspect: number,
  fitViewport: boolean,
): void {
  camera.layers.mask = settings.layers >>> 0
  const fit = fitViewport && !settings.view.enabled
  const aspect = fit ? Math.max(viewportAspect, 0.001) : Math.max(settings.aspect, 0.001)

  if (camera instanceof THREE.PerspectiveCamera) {
    camera.fov = settings.fov
    camera.zoom = settings.zoom
    camera.near = Math.max(settings.near, 0.001)
    camera.far = settings.far
    camera.aspect = aspect
    camera.focus = settings.focus
    camera.filmGauge = settings.filmGauge
    camera.filmOffset = settings.filmOffset
    writeViewOffset(camera, settings)
    if (!settings.view.enabled) {
      camera.aspect = aspect
      camera.updateProjectionMatrix()
    }
    return
  }

  if (camera instanceof THREE.OrthographicCamera) {
    camera.zoom = settings.zoom
    camera.near = settings.near
    camera.far = settings.far
    camera.top = settings.top
    camera.bottom = settings.bottom
    if (fit) {
      const halfHeight = Math.abs(settings.top - settings.bottom) / 2
      const halfWidth = halfHeight * aspect
      const center = (settings.left + settings.right) / 2
      camera.left = center - halfWidth
      camera.right = center + halfWidth
    } else {
      camera.left = settings.left
      camera.right = settings.right
    }
    writeViewOffset(camera, settings)
  }
}

export function inspectCamera(settings: CameraSettings, preview: boolean): CameraInspector {
  const copy = copyCameraSettings(settings)
  const aspect = projectionAspect(copy)
  return {
    ...copy,
    focalLength: focalLengthOf(copy.fov, aspect, copy.filmGauge),
    effectiveFov: effectiveFov(copy.fov, copy.zoom),
    filmWidth: copy.filmGauge * Math.min(aspect, 1),
    filmHeight: copy.filmGauge / Math.max(aspect, 1),
    preview,
  }
}

export function writeCameraNumber(settings: CameraSettings, field: CameraNumberField, value: number): void {
  if (!Number.isFinite(value)) return
  switch (field) {
    case 'near': {
      const min = settings.projection === 'perspective' ? 0.001 : 0
      settings.near = Math.min(Math.max(value, min), settings.far - 0.001)
      break
    }
    case 'far':
      settings.far = Math.max(value, settings.near + 0.001)
      break
    case 'zoom':
      settings.zoom = Math.max(value, 0.001)
      break
    case 'fov':
      settings.fov = clamp(value, 1, 179)
      break
    case 'aspect':
      settings.aspect = Math.max(value, 0.001)
      break
    case 'focus':
      settings.focus = Math.max(value, 0)
      break
    case 'filmGauge':
      settings.filmGauge = Math.max(value, 0.001)
      break
    case 'filmOffset':
      settings.filmOffset = value
      break
    case 'focalLength':
      settings.fov = clamp(fovFromFocalLength(Math.max(value, 0.001), projectionAspect(settings), settings.filmGauge), 1, 179)
      break
    case 'left':
      settings.left = Math.min(value, settings.right - 0.001)
      break
    case 'right':
      settings.right = Math.max(value, settings.left + 0.001)
      break
    case 'bottom':
      settings.bottom = Math.min(value, settings.top - 0.001)
      break
    case 'top':
      settings.top = Math.max(value, settings.bottom + 0.001)
      break
    case 'fullWidth':
      settings.view.fullWidth = Math.max(value, 1)
      break
    case 'fullHeight':
      settings.view.fullHeight = Math.max(value, 1)
      break
    case 'offsetX':
      settings.view.offsetX = value
      break
    case 'offsetY':
      settings.view.offsetY = value
      break
    case 'viewWidth':
      settings.view.width = Math.max(value, 1)
      break
    case 'viewHeight':
      settings.view.height = Math.max(value, 1)
      break
    case 'layers':
      settings.layers = Math.max(0, Math.min(0xffffffff, Math.round(value))) >>> 0
      break
    default:
      break
  }
}

export function writeCameraFlag(settings: CameraSettings, field: CameraFlagField, value: boolean): void {
  if (field === 'current') settings.current = value
  else if (field === 'syncAspect') settings.syncAspect = value
  else settings.view.enabled = value
}

export function resetCameraField(settings: CameraSettings, defaults: CameraSettings, field: CameraResetField): void {
  if (field === 'projection') {
    settings.projection = defaults.projection
    if (settings.projection === 'perspective' && settings.near < 0.001) settings.near = 0.001
    return
  }
  if (field === 'focalLength') {
    writeCameraNumber(settings, 'focalLength', focalLengthOf(defaults.fov, projectionAspect(defaults), defaults.filmGauge))
    return
  }
  if (field === 'current' || field === 'syncAspect' || field === 'viewEnabled') {
    writeCameraFlag(settings, field, flagOf(defaults, field))
    return
  }
  writeCameraNumber(settings, field, numberOf(defaults, field))
}

export function cameraFieldLabel(field: CameraResetField): string {
  switch (field) {
    case 'fov': return 'FOV'
    case 'syncAspect': return 'Sync Viewport'
    case 'viewEnabled': return 'View Offset'
    case 'filmGauge': return 'Film Gauge'
    case 'filmOffset': return 'Film Offset'
    case 'focalLength': return 'Focal Length'
    case 'fullWidth': return 'Full Width'
    case 'fullHeight': return 'Full Height'
    case 'offsetX': return 'Offset X'
    case 'offsetY': return 'Offset Y'
    case 'viewWidth': return 'View Width'
    case 'viewHeight': return 'View Height'
    case 'layers': return 'Layers'
    default: return field.charAt(0).toUpperCase() + field.slice(1)
  }
}

export function focalLengthOf(fov: number, aspect: number, filmGauge: number): number {
  const filmHeight = filmGauge / Math.max(aspect, 1)
  const slope = Math.tan(THREE.MathUtils.degToRad(0.5 * fov))
  if (slope <= 1e-8) return 0
  return 0.5 * filmHeight / slope
}

function fovFromFocalLength(focalLength: number, aspect: number, filmGauge: number): number {
  const filmHeight = filmGauge / Math.max(aspect, 1)
  const slope = (0.5 * filmHeight) / focalLength
  return THREE.MathUtils.radToDeg(2 * Math.atan(slope))
}

function effectiveFov(fov: number, zoom: number): number {
  return THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(0.5 * fov)) / Math.max(zoom, 0.001)))
}

/** Aspect the lens math should use. View offset replaces aspect on a perspective camera. */
function projectionAspect(settings: CameraSettings): number {
  if (settings.projection === 'perspective' && settings.view.enabled && settings.view.fullHeight > 0) {
    return settings.view.fullWidth / settings.view.fullHeight
  }
  return Math.max(settings.aspect, 0.001)
}

function writeViewOffset(camera: THREE.PerspectiveCamera | THREE.OrthographicCamera, settings: CameraSettings): void {
  const view = settings.view
  if (!view.enabled) {
    camera.clearViewOffset()
    return
  }
  camera.setViewOffset(view.fullWidth, view.fullHeight, view.offsetX, view.offsetY, view.width, view.height)
}

function flagOf(settings: CameraSettings, field: CameraFlagField): boolean {
  if (field === 'current') return settings.current
  if (field === 'syncAspect') return settings.syncAspect
  return settings.view.enabled
}

function numberOf(settings: CameraSettings, field: CameraNumberField): number {
  switch (field) {
    case 'fullWidth': return settings.view.fullWidth
    case 'fullHeight': return settings.view.fullHeight
    case 'offsetX': return settings.view.offsetX
    case 'offsetY': return settings.view.offsetY
    case 'viewWidth': return settings.view.width
    case 'viewHeight': return settings.view.height
    case 'focalLength': return focalLengthOf(settings.fov, projectionAspect(settings), settings.filmGauge)
    default: return settings[field]
  }
}

function isViewOffset(value: unknown): value is CameraViewOffset {
  if (!value || typeof value !== 'object') return false
  const view = value as CameraViewOffset
  return typeof view.enabled === 'boolean'
    && finite(view.fullWidth)
    && finite(view.fullHeight)
    && finite(view.offsetX)
    && finite(view.offsetY)
    && finite(view.width)
    && finite(view.height)
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
