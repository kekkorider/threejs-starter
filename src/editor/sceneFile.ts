import { isCameraSettings, type CameraSettings } from './camera'
import { isEnvironmentSettings, type EnvironmentSettings } from './environment'
import { GEOMETRY_CATALOG, type GeometryType } from './geometry'
import { isGroupRecord, type GroupRecord } from './groups'
import { isSignalDefinition, isSignalLinkRecord, type SignalDefinition, type SignalLinkRecord } from './signals'
import type { GridSettings, LightDefaults, NodeKind, SceneSettings, ShadowTypeName } from './state'
import type { MaterialSide } from './tsl'

/** Scene that opens when the project has no saved scene yet. */
export const OPEN_SCENE_PATH = 'res://World.tscn'

export interface SceneComponentRecord {
  name: string
  enabled: boolean
  parameters: Record<string, number | string | boolean>
}

export interface SceneGeometryRecord {
  id: string
  name: string
  type: GeometryType
  params: Record<string, number>
}

export interface SceneMaterialRecord {
  id: string
  name: string
  source: string
  side: MaterialSide
  transparent: boolean
  wireframe: boolean
}

export interface SceneNodeRecord {
  id: string
  name: string
  kind: NodeKind
  parentId: string | null
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  visible: boolean
  castShadow: boolean
  receiveShadow: boolean
  geometryId: string | null
  materialId: string | null
  light: LightDefaults | null
  /** Present on camera nodes. Older scene files omit it. */
  camera?: CameraSettings | null
  /** Present on WorldEnvironment nodes. Older scene files omit it. */
  environment?: EnvironmentSettings | null
  components: SceneComponentRecord[]
  /** Packed scene placed at this node. Children come from that file. */
  instance?: string | null
  /** Group names this node belongs to. Older scene files omit it. */
  groups?: string[]
  /** Custom signals. Built-in signals are not stored. Older scene files omit it. */
  signals?: SignalDefinition[]
}

export const SCENE_DRAG_PREFIX = 'scene:'

/** MIME type so a drop target can tell a scene drag from a node drag before drop. */
export const SCENE_DRAG_TYPE = 'text/x-scene-path'

export function writeSceneDrag(transfer: DataTransfer, path: string): void {
  transfer.effectAllowed = 'copy'
  transfer.setData('text/plain', `${SCENE_DRAG_PREFIX}${path}`)
  try {
    transfer.setData(SCENE_DRAG_TYPE, path)
  } catch {
    // text/plain still carries the path when a custom type is refused.
  }
}

/** True during dragover, when the path itself is still hidden. */
export function isSceneDrag(transfer: DataTransfer | null): boolean {
  return !!transfer && [...transfer.types].includes(SCENE_DRAG_TYPE)
}

export function sceneDragPath(transfer: DataTransfer | null): string | null {
  if (!transfer) return null
  const plain = transfer.getData('text/plain')
  if (plain.startsWith(SCENE_DRAG_PREFIX)) return plain.slice(SCENE_DRAG_PREFIX.length)
  const typed = transfer.getData(SCENE_DRAG_TYPE)
  return typed || null
}

/** Packed scene: the node tree plus the geometry, materials, and light settings it uses. */
export interface SceneFile {
  version: 1
  path: string
  scene: SceneSettings
  grid: GridSettings
  geometries: SceneGeometryRecord[]
  materials: SceneMaterialRecord[]
  nodes: SceneNodeRecord[]
  /** Local groups for this scene. Older scene files omit it. */
  groups?: GroupRecord[]
  /** Global groups saved with the scene so another machine can restore them. */
  globalGroups?: GroupRecord[]
  /** Saved signal connections. Code listeners are not stored. */
  connections?: SignalLinkRecord[]
}

const STORAGE_KEY = 'threejs-starter.scene-files'

const NODE_KINDS = new Set<NodeKind>([
  'Node3D',
  'WorldEnvironment',
  'MeshInstance3D',
  'Camera3D',
  'DirectionalLight3D',
  'OmniLight3D',
  'SpotLight3D',
  'HemisphereLight3D',
])

const GEOMETRY_TYPES = new Set<GeometryType>(GEOMETRY_CATALOG.map((entry) => entry.type))
const SIDES = new Set<MaterialSide>(['front', 'back', 'double'])
const SHADOW_TYPES = new Set<ShadowTypeName>(['basic', 'pcf', 'vsm'])

export function sceneFileName(path: string): string {
  const slash = path.lastIndexOf('/')
  return slash === -1 ? path : path.slice(slash + 1)
}

/** Accept `Name`, `Name.tscn`, or `res://folder/Name.tscn`. */
export function normalizeScenePath(input: string): string | null {
  let path = input.trim().replace(/\\/g, '/')
  if (!path) return null
  if (!path.startsWith('res://')) path = `res://${path.replace(/^\/+/, '')}`
  if (!path.endsWith('.tscn')) path += '.tscn'
  if (path.includes('..')) return null
  if (!/^res:\/\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.tscn$/.test(path)) return null
  return path
}

export function readOpenPath(): string {
  return readBlob()?.openPath || OPEN_SCENE_PATH
}

/** Open the last saved scene, or the starter path when nothing has been saved. */
export function preferredOpenPath(): string {
  const open = readOpenPath()
  if (open && hasSceneFile(open)) return open
  return OPEN_SCENE_PATH
}

export function rememberOpenPath(path: string): void {
  const current = readBlob()
  writeBlob({ openPath: path, files: current?.files ?? [] })
}

export function removeSceneFile(path: string): void {
  const current = readBlob()
  if (!current) return
  writeBlob({
    openPath: current.openPath === path ? OPEN_SCENE_PATH : current.openPath,
    files: current.files.filter((file) => file.path !== path),
  })
}

export function readSceneLibrary(): SceneFile[] {
  const blob = readBlob()
  return blob?.files ?? []
}

export function readSceneFile(path: string): SceneFile | null {
  return readSceneLibrary().find((file) => file.path === path) ?? null
}

export function hasSceneFile(path: string): boolean {
  return readSceneLibrary().some((file) => file.path === path)
}

export function writeSceneFile(file: SceneFile): void {
  const current = readBlob()
  const files = (current?.files ?? []).filter((item) => item.path !== file.path)
  files.push(file)
  writeBlob({ openPath: file.path, files })
}

function readBlob(): { openPath: string, files: SceneFile[] } | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const files = (parsed as { files?: unknown }).files
    if (!Array.isArray(files)) return null
    return {
      openPath: typeof (parsed as { openPath?: unknown }).openPath === 'string'
        ? (parsed as { openPath: string }).openPath
        : OPEN_SCENE_PATH,
      files: files.filter(isSceneFile),
    }
  } catch {
    return null
  }
}

function writeBlob(blob: { openPath: string, files: SceneFile[] }): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blob))
}

export function isSceneFile(value: unknown): value is SceneFile {
  if (!value || typeof value !== 'object') return false
  const file = value as SceneFile
  if (file.version !== 1 || typeof file.path !== 'string' || !file.path.startsWith('res://')) return false
  if (!isSceneSettings(file.scene) || !isGridSettings(file.grid)) return false
  if (!Array.isArray(file.geometries) || !Array.isArray(file.materials) || !Array.isArray(file.nodes)) return false
  if (!file.geometries.every(isGeometryRecord) || !file.materials.every(isMaterialRecord)) return false
  if (!file.nodes.every(isNodeRecord)) return false
  if (file.groups !== undefined && !(Array.isArray(file.groups) && file.groups.every(isGroupRecord))) return false
  if (file.globalGroups !== undefined && !(Array.isArray(file.globalGroups) && file.globalGroups.every(isGroupRecord))) return false
  if (file.connections !== undefined && !(Array.isArray(file.connections) && file.connections.every(isSignalLinkRecord))) return false
  return file.nodes.some((node) => node.parentId === null)
}

function isSceneSettings(value: unknown): value is SceneSettings {
  if (!value || typeof value !== 'object') return false
  const scene = value as SceneSettings
  const environment = (scene as { environment?: unknown }).environment
  return typeof scene.background === 'string'
    && finite(scene.backgroundIntensity)
    && finite(scene.environmentIntensity)
    && typeof scene.shadows === 'boolean'
    && SHADOW_TYPES.has(scene.shadowType)
    && (environment === undefined || environment === null || isEnvironmentSettings(environment))
}

function isGridSettings(value: unknown): value is GridSettings {
  if (!value || typeof value !== 'object') return false
  const grid = value as GridSettings
  return typeof grid.visible === 'boolean'
    && finite(grid.size)
    && finite(grid.divisions)
    && typeof grid.center === 'string'
    && typeof grid.color === 'string'
    && !!grid.position
    && finite(grid.position.x)
    && finite(grid.position.y)
    && finite(grid.position.z)
}

function isGeometryRecord(value: unknown): value is SceneGeometryRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as SceneGeometryRecord
  return typeof record.id === 'string'
    && typeof record.name === 'string'
    && GEOMETRY_TYPES.has(record.type)
    && !!record.params
    && typeof record.params === 'object'
    && Object.values(record.params).every((item) => finite(item))
}

function isMaterialRecord(value: unknown): value is SceneMaterialRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as SceneMaterialRecord
  return typeof record.id === 'string'
    && typeof record.name === 'string'
    && typeof record.source === 'string'
    && SIDES.has(record.side)
    && typeof record.transparent === 'boolean'
    && typeof record.wireframe === 'boolean'
}

function isNodeRecord(value: unknown): value is SceneNodeRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as SceneNodeRecord
  return typeof record.id === 'string'
    && typeof record.name === 'string'
    && NODE_KINDS.has(record.kind)
    && (record.parentId === null || typeof record.parentId === 'string')
    && vec3(record.position)
    && vec3(record.rotation)
    && vec3(record.scale)
    && typeof record.visible === 'boolean'
    && typeof record.castShadow === 'boolean'
    && typeof record.receiveShadow === 'boolean'
    && (record.geometryId === null || typeof record.geometryId === 'string')
    && (record.materialId === null || typeof record.materialId === 'string')
    && (record.light === null || isLight(record.light))
    && (record.camera == null || isCameraSettings(record.camera))
    && (record.environment == null || isEnvironmentSettings(record.environment))
    && Array.isArray(record.components)
    && record.components.every(isComponentRecord)
    && (record.instance == null || (typeof record.instance === 'string' && record.instance.startsWith('res://')))
    && (record.groups === undefined || (Array.isArray(record.groups) && record.groups.every((name) => typeof name === 'string')))
    && (record.signals === undefined || (Array.isArray(record.signals) && record.signals.every(isSignalDefinition)))
}

function isComponentRecord(value: unknown): value is SceneComponentRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as SceneComponentRecord
  if (typeof record.name !== 'string' || typeof record.enabled !== 'boolean') return false
  if (!record.parameters || typeof record.parameters !== 'object') return false
  return Object.values(record.parameters).every(isParameter)
}

function isLight(value: unknown): value is LightDefaults {
  if (!value || typeof value !== 'object') return false
  const light = value as LightDefaults
  return typeof light.color === 'string'
    && (light.ground === null || typeof light.ground === 'string')
    && finite(light.intensity)
    && (light.range === null || finite(light.range))
    && (light.angle === null || finite(light.angle))
    && (light.penumbra === null || finite(light.penumbra))
    && (light.lookAt === null || (
      typeof light.lookAt.enabled === 'boolean'
      && finite(light.lookAt.x)
      && finite(light.lookAt.y)
      && finite(light.lookAt.z)
    ))
}

function isParameter(value: unknown): value is number | string | boolean {
  if (typeof value === 'number') return Number.isFinite(value)
  return typeof value === 'string' || typeof value === 'boolean'
}

function vec3(value: unknown): value is [number, number, number] {
  return Array.isArray(value)
    && value.length === 3
    && value.every((item) => finite(item))
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
