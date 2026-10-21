import * as THREE from 'three/webgpu'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { ThreeContextEvents, addComponent, destroy, getComponents } from 'three-start'
import type { Object3DBehaviour, Object3DBehaviourConstructor, ThreeStart } from 'three-start'
import {
  BUILTIN_COMPONENTS,
  applyParameters,
  compileComponent,
  componentTemplate,
  parameterFields,
  readParameters,
  uniqueIdentifier,
  withClassName,
  type ComponentParameter,
} from './behaviors'

import {
  GEOMETRY_CATALOG,
  buildGeometry,
  clampParam,
  defaultParams,
  geometryEntry,
  type GeometryType,
} from './geometry'
import { fingerprint } from './history'
import {
  applyCameraSettings,
  copyCameraSettings,
  createCameraObject,
  defaultCameraSettings,
  inspectCamera,
  readCameraSettings,
  resetCameraField,
  writeCameraFlag,
  writeCameraNumber,
  type CameraFlagField,
  type CameraInspector,
  type CameraNumberField,
  type CameraProjection,
  type CameraResetField,
  type CameraSettings,
} from './camera'
import { attachCameraIcon, disposeCameraIcon } from './cameraIcons'
import { attachLightArrow, attachLightIcon, attachSpotCone, disposeLightArrow, disposeLightIcon, disposeSpotCone, updateSpotCone, type LightIconKind } from './lightIcons'
import {
  hasSceneFile,
  normalizeScenePath,
  preferredOpenPath,
  readSceneFile,
  readSceneLibrary,
  rememberOpenPath,
  removeSceneFile,
  sceneFileName,
  writeSceneFile,
  type SceneComponentRecord,
  type SceneFile,
  type SceneGeometryRecord,
  type SceneMaterialRecord,
  type SceneNodeRecord,
} from './sceneFile'
import {
  DEFAULT_FLAGS,
  applyMaterialFlags,
  compileTSLMaterial,
  presetById,
  type MaterialFlags,
  type MaterialSide,
} from './tsl'

export type NodeKind =
  | 'Node3D'
  | 'MeshInstance3D'
  | 'Camera3D'
  | 'DirectionalLight3D'
  | 'OmniLight3D'
  | 'SpotLight3D'
  | 'HemisphereLight3D'

export type ToolMode = 'select' | 'translate' | 'rotate' | 'scale'
export type ShadingMode = 'shaded' | 'debug'

export interface LookAtConfig {
  enabled: boolean
  x: number
  y: number
  z: number
}

export interface NodeDefaults {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  visible: boolean
  castShadow: boolean | null
  receiveShadow: boolean | null
  light: LightDefaults | null
  camera: CameraSettings | null
}

export interface LightDefaults {
  color: string
  ground: string | null
  intensity: number
  range: number | null
  angle: number | null
  penumbra: number | null
  lookAt: LookAtConfig | null
}

export interface EditorNode {
  id: string
  name: string
  kind: NodeKind
  object: THREE.Object3D
  parentId: string | null
  childIds: string[]
  imported: boolean
  isRoot: boolean
  geometryId: string | null
  materialId: string | null
  componentIds: string[]
  /** Set on the root of a linked scene instance. */
  instancePath: string | null
  /** Set on nodes created from an instance, so the parent scene stores the link. */
  instanceOwnerId: string | null
  defaults: NodeDefaults
}

export interface ComponentResource {
  id: string
  name: string
  source: string
  builtin: boolean
  ctor: Object3DBehaviourConstructor
  error: string | null
}

export interface ComponentInstance {
  id: string
  name: string
  resourceId: string
  nodeId: string
  behaviour: Object3DBehaviour
}

export interface GeometryResource {
  id: string
  name: string
  type: GeometryType
  params: Record<string, number>
  geometry: THREE.BufferGeometry | null
  defaults: { type: GeometryType, params: Record<string, number> }
}

export interface MaterialResource {
  id: string
  name: string
  source: string
  side: MaterialSide
  transparent: boolean
  wireframe: boolean
  material: THREE.MeshStandardNodeMaterial | null
  error: string | null
  defaults: { name: string, source: string, side: MaterialSide, transparent: boolean, wireframe: boolean }
}

export interface LogLine {
  level: 'info' | 'warn' | 'error'
  message: string
  time: string
}

export interface CreateMeshOptions {
  name?: string
  parentId?: string | null
  geometryType: GeometryType
  params: Record<string, number>
  materialName?: string
  source: string
  flags: MaterialFlags
}

export interface CreateCameraOptions {
  name?: string
  parentId?: string | null
  projection: CameraProjection
  fov?: number
  near?: number
  far?: number
  zoom?: number
  left?: number
  right?: number
  top?: number
  bottom?: number
}

export interface CreateLightOptions {
  kind: 'DirectionalLight3D' | 'OmniLight3D' | 'SpotLight3D' | 'HemisphereLight3D'
  name?: string
  parentId?: string | null
  color: string
  intensity: number
  range?: number
  angle?: number
  penumbra?: number
  groundColor?: string
}

const NODE_LABEL: Record<NodeKind, string> = {
  Node3D: 'Node',
  MeshInstance3D: 'MeshInstance',
  Camera3D: 'Camera',
  DirectionalLight3D: 'DirectionalLight',
  OmniLight3D: 'OmniLight',
  SpotLight3D: 'SpotLight',
  HemisphereLight3D: 'HemisphereLight',
}

export type ShadowTypeName = 'basic' | 'pcf' | 'vsm'

export interface SceneSettings {
  background: string
  backgroundIntensity: number
  environmentIntensity: number
  shadows: boolean
  shadowType: ShadowTypeName
}

export interface GridSettings {
  visible: boolean
  size: number
  divisions: number
  center: string
  color: string
  position: { x: number, y: number, z: number }
}

const SCENE_DEFAULTS: SceneSettings = {
  background: '#3a3a3a',
  backgroundIntensity: 1,
  environmentIntensity: 0.55,
  shadows: true,
  shadowType: 'pcf',
}

const GRID_DEFAULTS = {
  visible: true,
  size: 40,
  divisions: 40,
  center: '#8a8a8a',
  color: '#2a2a2a',
  position: { x: 0, y: 0, z: 0 },
}

const SHADOW_TYPE: Record<ShadowTypeName, THREE.ShadowMapType> = {
  basic: THREE.BasicShadowMap,
  pcf: THREE.PCFShadowMap,
  vsm: THREE.VSMShadowMap,
}

export class EditorState {
  starter: ThreeStart | null = null
  nodes = new Map<string, EditorNode>()
  geometries = new Map<string, GeometryResource>()
  materials = new Map<string, MaterialResource>()
  components = new Map<string, ComponentResource>()
  componentInstances = new Map<string, ComponentInstance>()
  rootId = ''
  /** Selected nodes, oldest first. The last id is the active node the inspector and gizmo use. */
  selectedIds: string[] = []
  tool: ToolMode = 'translate'
  space: 'world' | 'local' = 'world'
  snap = false
  shading: ShadingMode = 'shaded'
  playing = false
  paused = false
  groundY = 0
  gridVisible = GRID_DEFAULTS.visible
  gridSize = GRID_DEFAULTS.size
  gridDivisions = GRID_DEFAULTS.divisions
  gridCenter = GRID_DEFAULTS.center
  gridColor = GRID_DEFAULTS.color
  gridPosition = new THREE.Vector3()
  logs: LogLine[] = []
  controls: TransformControls | null = null
  /** Editor gizmos, grid, and selection are hidden on the plain scene route. */
  chromeVisible = false
  /** res:// path of the scene open in the editor. */
  scenePath = preferredOpenPath()
  /** True after an edit that Save Scene has not written yet. */
  sceneDirty = false

  /** Fingerprint of the scene last saved or loaded. Null until that happens. */
  private cleanCapture: string | null = null
  private attached = false
  /** Save and load mutate the tree without counting as a new edit. */
  private restoring = false
  private scene: THREE.Scene | null = null
  /** Camera the viewport is rendering with. The editor camera, unless previewing or playing a scene camera. */
  private camera: THREE.PerspectiveCamera | THREE.OrthographicCamera | null = null
  /** Orbit camera. Scene cameras never replace this object. */
  private editorCamera: THREE.PerspectiveCamera | null = null
  /** Scene camera the viewport looks through while editing. Not saved. */
  private previewCameraId: string | null = null
  private cameraHelpers = new Map<string, THREE.CameraHelper>()
  private grid: THREE.GridHelper | null = null
  private selectionHelpers: THREE.Box3Helper[] = []
  private selectionBoxes: THREE.Box3[] = []
  /** World poses captured when a gizmo drag starts, so the rest of the selection follows the active node. */
  private selectionDrag: { id: string, world: THREE.Matrix4, position: THREE.Vector3, root: boolean }[] | null = null
  private readonly forward = new THREE.Vector3()
  private readonly tmp = new THREE.Vector3()
  private readonly tmpSize = new THREE.Vector3(0.5, 0.5, 0.5)
  private readonly dragDelta = new THREE.Matrix4()
  private readonly dragInverse = new THREE.Matrix4()
  private readonly dragWorld = new THREE.Matrix4()
  private readonly dragLocal = new THREE.Matrix4()
  private readonly dragPos = new THREE.Vector3()
  private readonly dragTargetPos = new THREE.Vector3()
  private readonly marqueeBounds = new THREE.Box3()
  private readonly marqueePoint = new THREE.Vector3()
  private readonly marqueeView = new THREE.Vector3()
  private idCounter = 1

  constructor() {
    for (const builtin of BUILTIN_COMPONENTS) {
      const id = `cmp${this.idCounter++}`
      this.components.set(id, {
        id,
        name: builtin.name,
        source: builtin.source,
        builtin: true,
        ctor: builtin.ctor,
        error: null,
      })
    }
  }

  log(message: string, level: LogLine['level'] = 'info'): void {
    const now = new Date()
    const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map((part) => String(part).padStart(2, '0'))
      .join(':')
    this.logs.push({ level, message, time })
    if (this.logs.length > 200) this.logs.shift()
  }

  attach(starter: ThreeStart): boolean {
    if (this.attached) {
      this.setChromeVisible(true)
      return false
    }
    this.attached = true
    this.chromeVisible = true
    this.starter = starter
    const { scene, camera, renderer } = starter.ctx
    this.scene = scene
    this.editorCamera = camera
    this.camera = camera
    scene.background = new THREE.Color(0x3a3a3a)

    const world = new THREE.Group()
    world.name = 'World'
    const existing = [...scene.children]
    scene.add(world)
    for (const child of existing) {
      if (child === world) continue
      if (child.userData.editorHidden) continue
      if ((child as THREE.Camera).isCamera) continue
      world.attach(child)
    }

    this.addDefaultLights(world)
    this.rootId = this.registerTree(world, null, false, true)

    const floor = world.getObjectByName('Floor')
    if (floor) {
      const bounds = new THREE.Box3().setFromObject(floor)
      if (!bounds.isEmpty()) this.groundY = bounds.max.y
    }

    this.rebuildGrid()
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap

    this.controls = new TransformControls(camera, renderer.domElement)
    this.controls.setMode('translate')
    const helper = this.controls.getHelper()
    helper.userData.editorHidden = true
    scene.add(helper)
    const orbit = () => starter.ctx.modules.orbitControls.controls
    this.controls.addEventListener('mouseDown', () => {
      orbit().enabled = false
      this.captureSelectionDrag()
    })
    this.controls.addEventListener('objectChange', () => {
      this.applySelectionDrag()
    })
    this.controls.addEventListener('mouseUp', () => {
      this.selectionDrag = null
      orbit().enabled = this.orbitAllowed()
    })
    window.addEventListener('pointerup', (event) => {
      if (event.button === 0) this.selectionDrag = null
      orbit().enabled = this.orbitAllowed()
    })
    this.syncOrbitMouse()

    this.installEnvironment(renderer)
    if (this.scene) this.scene.environmentIntensity = SCENE_DEFAULTS.environmentIntensity
    starter.ctx.on(ThreeContextEvents.Update, () => this.onFrame())

    const hideProfiler = () => {
      try { starter.ctx.modules.inspector.inspector.setVisible(false) } catch { /* mounts lazily */ }
    }
    hideProfiler()
    requestAnimationFrame(hideProfiler)
    setTimeout(hideProfiler, 400)

    this.log('Editor ready. Create a MeshInstance to define a geometry and a TSL material.')
    const saved = readSceneFile(this.scenePath)
    if (saved) {
      try {
        this.applyScene(saved)
        this.rememberClean()
        this.log(`Loaded ${saved.path}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.log(`Could not load ${this.scenePath}: ${message}`, 'error')
        this.sceneDirty = true
      }
    } else {
      this.sceneDirty = true
    }
    return true
  }

  markDirty(): void {
    this.touchScene()
  }

  hasSavedScene(): boolean {
    return hasSceneFile(this.scenePath)
  }

  /** Write the open scene. Refuses while the simulation is playing so a spin does not get baked in. */
  saveOpenScene(): boolean {
    if (this.playing) {
      this.log('Stop the scene before saving.', 'warn')
      return false
    }
    const file = this.captureScene()
    writeSceneFile(file)
    this.cleanCapture = fingerprint(file)
    this.sceneDirty = false
    this.log(`Saved ${file.path}`)
    return true
  }

  /** Replace the open scene with the saved file at `scenePath`. */
  loadOpenScene(): boolean {
    if (this.playing) {
      this.log('Stop the scene before loading.', 'warn')
      return false
    }
    const file = readSceneFile(this.scenePath)
    if (!file) {
      this.log(`No saved scene at ${this.scenePath}.`, 'warn')
      return false
    }
    this.applyScene(file)
    this.rememberClean()
    this.log(`Loaded ${file.path}`)
    return true
  }

  /** Write the open scene to a File system path and make that path the current one. */
  saveSceneAs(path: string): boolean {
    if (this.playing) {
      this.log('Stop the scene before saving.', 'warn')
      return false
    }
    const normalized = normalizeScenePath(path)
    if (!normalized) {
      this.log('Use a scene path like res://Name.tscn.', 'warn')
      return false
    }
    this.scenePath = normalized
    return this.saveOpenScene()
  }

  /** Replace the open scene with another saved file. */
  openScene(path: string): boolean {
    if (this.playing) {
      this.log('Stop the scene before opening another one.', 'warn')
      return false
    }
    if (path === this.scenePath) return true
    const file = readSceneFile(path)
    if (!file) {
      this.log(`No saved scene at ${path}.`, 'warn')
      return false
    }
    const previous = this.scenePath
    this.scenePath = path
    try {
      this.applyScene(file)
      this.rememberClean()
    } catch (error) {
      this.scenePath = previous
      const message = error instanceof Error ? error.message : String(error)
      this.log(`Could not open ${path}: ${message}`, 'error')
      return false
    }
    rememberOpenPath(path)
    this.log(`Opened ${path}`)
    return true
  }

  deleteScene(path: string): boolean {
    if (path === this.scenePath) {
      this.log('The open scene stays in the File system.', 'warn')
      return false
    }
    if (!hasSceneFile(path)) return false
    const users = this.instanceUsers(path)
    if (users.length > 0) {
      this.log(`${path} is instanced by ${users.join(', ')}. Remove those instances first.`, 'warn')
      return false
    }
    removeSceneFile(path)
    this.log(`Removed ${path}`)
    return true
  }

  /** Place a saved scene under `parentId`. The link is kept until Make Local. */
  instanceScene(path: string, parentId?: string | null): EditorNode | null {
    if (this.playing) {
      this.log('Stop the scene before instancing.', 'warn')
      return null
    }
    if (path === this.scenePath) {
      this.log('A scene cannot instance itself.', 'warn')
      return null
    }
    if (!readSceneFile(path)) {
      this.log(`No saved scene at ${path}.`, 'warn')
      return null
    }
    if (this.instanceCycle(path, new Set([this.scenePath]))) {
      this.log(`${path} instances ${this.scenePath}, so it cannot be placed here.`, 'warn')
      return null
    }
    const parent = this.parentOrSelected(parentId)
    const object = new THREE.Group()
    object.name = this.uniqueName(sceneFileName(path).replace(/\.tscn$/, '') || 'Scene')
    parent.object.add(object)
    const node = this.addNode(object, parent.id, 'Node3D', false)
    node.instancePath = path
    this.expandInstance(path, node.id, new Set([this.scenePath]))
    this.log(`Instanced ${path}`)
    this.select(node.id)
    return node
  }

  makeLocal(id: string): void {
    const node = this.nodes.get(id)
    if (!node?.instancePath) return
    node.instancePath = null
    for (const other of this.nodes.values()) {
      if (other.instanceOwnerId === id) other.instanceOwnerId = null
    }
    this.log(`Made ${node.name} local`)
    this.touchScene()
  }

  /** Hide the grid, gizmo, and selection box when the editor route is not showing. */
  setChromeVisible(visible: boolean): void {
    this.chromeVisible = visible
    if (!visible) this.previewCameraId = null
    this.syncViewCamera()
    this.updateCameras()
    this.applyGridVisibility()
    this.updateLightIcons()
    if (!this.controls) return
    if (!visible) {
      this.controls.detach()
      for (const helper of this.selectionHelpers) helper.visible = false
      return
    }
    this.syncGizmo()
    this.updateSelectionBox()
  }

  sceneSettings(): SceneSettings {
    const scene = this.scene
    const background = scene?.background
    const color = background instanceof THREE.Color ? `#${background.getHexString()}` : '#3a3a3a'
    const shadow = this.starter?.ctx.renderer.shadowMap
    return {
      background: color,
      backgroundIntensity: scene?.backgroundIntensity ?? 1,
      environmentIntensity: scene?.environmentIntensity ?? 1,
      shadows: shadow?.enabled ?? false,
      shadowType: shadowTypeName(shadow?.type),
    }
  }

  gridSettings(): GridSettings {
    return {
      visible: this.gridVisible,
      size: this.gridSize,
      divisions: this.gridDivisions,
      center: this.gridCenter,
      color: this.gridColor,
      position: { x: this.gridPosition.x, y: this.gridPosition.y, z: this.gridPosition.z },
    }
  }

  resetScene(field: keyof SceneSettings): void {
    if (field === 'background') this.setBackground(SCENE_DEFAULTS.background)
    else if (field === 'backgroundIntensity') this.setBackgroundIntensity(SCENE_DEFAULTS.backgroundIntensity)
    else if (field === 'environmentIntensity') this.setEnvironmentIntensity(SCENE_DEFAULTS.environmentIntensity)
    else if (field === 'shadows') this.setShadows(SCENE_DEFAULTS.shadows)
    else this.setShadowType(SCENE_DEFAULTS.shadowType)
  }

  setBackground(color: string): void {
    const scene = this.scene
    if (!scene) return
    if (scene.background instanceof THREE.Color) scene.background.set(color)
    else scene.background = new THREE.Color(color)
    this.touchScene()
  }

  setBackgroundIntensity(value: number): void {
    if (!this.scene || !Number.isFinite(value)) return
    this.scene.backgroundIntensity = Math.max(0, value)
    this.touchScene()
  }

  setEnvironmentIntensity(value: number): void {
    if (!this.scene || !Number.isFinite(value)) return
    this.scene.environmentIntensity = Math.max(0, value)
    this.touchScene()
  }

  setShadows(enabled: boolean): void {
    const shadow = this.starter?.ctx.renderer.shadowMap
    if (!shadow) return
    shadow.enabled = enabled
    this.touchScene()
  }

  setShadowType(name: ShadowTypeName): void {
    const shadow = this.starter?.ctx.renderer.shadowMap
    if (!shadow) return
    shadow.type = SHADOW_TYPE[name]
    this.touchScene()
  }

  setGridVisible(visible: boolean): void {
    this.gridVisible = visible
    this.applyGridVisibility()
    this.touchScene()
  }

  setGridSize(value: number): void {
    if (!Number.isFinite(value)) return
    this.gridSize = Math.min(400, Math.max(1, value))
    this.rebuildGrid()
    this.touchScene()
  }

  setGridDivisions(value: number): void {
    if (!Number.isFinite(value)) return
    this.gridDivisions = Math.min(200, Math.max(1, Math.round(value)))
    this.rebuildGrid()
    this.touchScene()
  }

  setGridCenter(color: string): void {
    this.gridCenter = color
    this.rebuildGrid()
    this.touchScene()
  }

  setGridColor(color: string): void {
    this.gridColor = color
    this.rebuildGrid()
    this.touchScene()
  }

  setGridPosition(axis: 'x' | 'y' | 'z', value: number): void {
    if (!Number.isFinite(value)) return
    this.gridPosition[axis] = value
    this.applyGridPosition()
    this.touchScene()
  }

  resetGrid(field: 'visible' | 'size' | 'divisions' | 'center' | 'color' | 'position'): void {
    if (field === 'visible') this.setGridVisible(GRID_DEFAULTS.visible)
    else if (field === 'size') this.setGridSize(GRID_DEFAULTS.size)
    else if (field === 'divisions') this.setGridDivisions(GRID_DEFAULTS.divisions)
    else if (field === 'center') this.setGridCenter(GRID_DEFAULTS.center)
    else if (field === 'color') this.setGridColor(GRID_DEFAULTS.color)
    else {
      this.gridPosition.set(GRID_DEFAULTS.position.x, GRID_DEFAULTS.position.y, GRID_DEFAULTS.position.z)
      this.applyGridPosition()
      this.touchScene()
    }
  }

  /** The active node: the last one selected. */
  get selectedId(): string | null {
    return this.selectedIds.at(-1) ?? null
  }

  selected(): EditorNode | null {
    const id = this.selectedId
    if (!id) return null
    return this.nodes.get(id) ?? null
  }

  select(id: string | null): void {
    this.setSelection(id ? [id] : [])
  }

  /** Replace the selection. `activeId` becomes the node the inspector and gizmo follow. */
  setSelection(ids: string[], activeId?: string | null): void {
    const unique: string[] = []
    const seen = new Set<string>()
    for (const id of ids) {
      if (!id || seen.has(id) || !this.nodes.has(id)) continue
      seen.add(id)
      unique.push(id)
    }
    const active = activeId && seen.has(activeId) ? activeId : unique.at(-1) ?? null
    if (active) {
      const index = unique.indexOf(active)
      if (index >= 0 && index !== unique.length - 1) {
        unique.splice(index, 1)
        unique.push(active)
      }
    }
    if (unique.length === this.selectedIds.length && unique.every((id, index) => id === this.selectedIds[index])) return
    this.selectedIds = unique
    this.syncGizmo()
    this.updateSelectionBox()
  }

  addSelection(ids: string[], activeId?: string | null): void {
    const active = activeId ?? ids.at(-1) ?? this.selectedId
    this.setSelection([...this.selectedIds, ...ids], active)
  }

  removeSelection(ids: string[]): void {
    const drop = new Set(ids)
    this.setSelection(this.selectedIds.filter((id) => !drop.has(id)))
  }

  toggleSelected(id: string): void {
    if (!this.nodes.has(id)) return
    if (this.selectedIds.includes(id)) this.removeSelection([id])
    else this.addSelection([id], id)
  }

  toggleEach(ids: string[]): void {
    const next = new Set(this.selectedIds)
    let active: string | null = this.selectedId
    for (const id of ids) {
      if (!this.nodes.has(id)) continue
      if (next.has(id)) next.delete(id)
      else next.add(id)
      active = id
    }
    const list = [...next]
    this.setSelection(list, active && next.has(active) ? active : list.at(-1) ?? null)
  }

  /** Selected nodes that should be edited as a group. A child of another selected node is left out. */
  selectionRoots(ids: string[]): string[] {
    const chosen = new Set(ids)
    return ids.filter((id) => {
      const node = this.nodes.get(id)
      if (!node || node.isRoot) return false
      let parentId = node.parentId
      while (parentId) {
        const parent = this.nodes.get(parentId)
        if (!parent) break
        // The world root can sit in the selection, but it is not a transform, so it does not hide its children.
        if (!parent.isRoot && chosen.has(parentId)) return false
        parentId = parent.parentId
      }
      return true
    })
  }

  setTool(tool: ToolMode): void {
    this.tool = tool
    if (this.controls && tool !== 'select') this.controls.setMode(tool)
    this.syncOrbitMouse()
    this.syncGizmo()
    this.updateSelectionBox()
  }

  setSpace(space: 'world' | 'local'): void {
    this.space = space
    this.controls?.setSpace(space)
  }

  setSnap(enabled: boolean): void {
    this.snap = enabled
    this.controls?.setTranslationSnap(enabled ? 0.5 : null)
    this.controls?.setRotationSnap(enabled ? Math.PI / 12 : null)
    this.controls?.setScaleSnap(enabled ? 0.1 : null)
  }

  setPlaying(playing: boolean): void {
    this.playing = playing
    this.syncViewCamera()
    this.updateCameras()
    this.applyGridVisibility()
    this.updateLightIcons()
    if (playing) this.controls?.detach()
    else this.syncGizmo()
    this.updateSelectionBox()
    if (playing && this.paused) this.setPaused(false)
  }

  setPaused(paused: boolean): void {
    this.paused = paused
    this.starter?.ctx.setTimescale(paused ? 0 : 1)
  }

  toggleProfiler(): void {
    const inspector = this.starter?.ctx.modules.inspector.inspector
    if (!inspector) return
    inspector.setVisible(!inspector.getVisible())
  }

  focusSelected(): void {
    if (this.previewCameraId) {
      this.previewCameraId = null
      this.syncViewCamera()
    }
    const camera = this.editorCamera
    const orbit = this.starter?.ctx.modules.orbitControls.controls
    const nodes = this.selectedIds
      .map((id) => this.nodes.get(id))
      .filter((node): node is EditorNode => Boolean(node && !node.isRoot))
    if (!nodes.length || !camera || !orbit) return

    const bounds = new THREE.Box3()
    const piece = new THREE.Box3()
    for (const node of nodes) {
      this.measureBounds(node.object, piece)
      if (piece.isEmpty()) {
        node.object.getWorldPosition(this.tmp)
        piece.setFromCenterAndSize(this.tmp, this.tmpSize.set(0.45, 0.45, 0.45))
      }
      bounds.union(piece)
    }
    const center = bounds.getCenter(new THREE.Vector3())
    const size = Math.max(bounds.getSize(new THREE.Vector3()).length(), 0.8)
    const direction = camera.position.clone().sub(center)
    if (direction.lengthSq() < 1e-6) direction.set(1, 0.6, 1)
    direction.normalize().multiplyScalar(Math.max(size * 1.8, 2.5))
    camera.position.copy(center).add(direction)
    orbit.target.copy(center)
    camera.lookAt(center)
    orbit.update()
  }

  setView(which: 'persp' | 'top' | 'front' | 'right'): void {
    if (this.previewCameraId) {
      this.previewCameraId = null
      this.syncViewCamera()
    }
    const camera = this.editorCamera
    const orbit = this.starter?.ctx.modules.orbitControls.controls
    if (!camera || !orbit) return
    const target = orbit.target
    const distance = Math.max(camera.position.distanceTo(target), 6)
    if (which === 'top') camera.position.set(target.x, target.y + distance, target.z + 0.01)
    else if (which === 'front') camera.position.set(target.x, target.y, target.z + distance)
    else if (which === 'right') camera.position.set(target.x + distance, target.y, target.z)
    else camera.position.set(target.x + distance * 0.62, target.y + distance * 0.42, target.z + distance * 0.68)
    camera.lookAt(target)
    orbit.update()
  }

  createNode3D(parentId?: string | null, name?: string): EditorNode {
    const parent = this.parentOrSelected(parentId)
    const object = new THREE.Group()
    object.name = this.uniqueName(name?.trim() || 'Node')
    parent.object.add(object)
    const node = this.addNode(object, parent.id, 'Node3D', false)
    this.log(`Added ${node.name}`)
    this.select(node.id)
    return node
  }

  createMesh(options: CreateMeshOptions): EditorNode {
    const parent = this.parentOrSelected(options.parentId)
    const geometryResource = this.createGeometryResource(options.geometryType, options.params)
    const materialResource = this.createMaterialResource(options.materialName ?? 'TSLMaterial', options.source, options.flags)
    const compiled = this.compileMaterial(materialResource.id)
    if (!compiled.ok || !materialResource.material || !geometryResource.geometry) {
      geometryResource.geometry?.dispose()
      materialResource.material?.dispose()
      this.geometries.delete(geometryResource.id)
      this.materials.delete(materialResource.id)
      throw new Error(compiled.ok ? 'Material failed to compile.' : compiled.error)
    }

    const mesh = new THREE.Mesh(geometryResource.geometry, materialResource.material)
    mesh.name = this.uniqueName(options.name?.trim() || 'MeshInstance')
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.position.set(0, 0, 0)
    mesh.rotation.set(0, 0, 0)
    mesh.scale.set(1, 1, 1)
    parent.object.add(mesh)

    const node = this.addNode(mesh, parent.id, 'MeshInstance3D', false)
    node.geometryId = geometryResource.id
    node.materialId = materialResource.id
    this.log(`Added ${mesh.name} (${geometryEntry(options.geometryType).label}, ${materialResource.name})`)
    this.select(node.id)
    return node
  }

  createLight(options: CreateLightOptions): EditorNode {
    const parent = this.parentOrSelected(options.parentId)
    let light: THREE.Light
    if (options.kind === 'DirectionalLight3D') {
      light = new THREE.DirectionalLight(options.color, options.intensity)
    } else if (options.kind === 'OmniLight3D') {
      light = new THREE.PointLight(options.color, options.intensity, options.range ?? 12, 0)
    } else if (options.kind === 'SpotLight3D') {
      light = new THREE.SpotLight(
        options.color,
        options.intensity,
        options.range ?? 16,
        THREE.MathUtils.degToRad(options.angle ?? 35),
        options.penumbra ?? 0.4,
        0,
      )
    } else {
      light = new THREE.HemisphereLight(options.color, options.groundColor ?? '#3a332c', options.intensity)
    }

    light.name = this.uniqueName(options.name?.trim() || NODE_LABEL[options.kind])
    const aimable = options.kind === 'DirectionalLight3D' || options.kind === 'SpotLight3D'
    if (options.kind !== 'HemisphereLight3D') light.position.copy(this.spawnPoint(2.5))
    this.prepareLight(light, aimable ? new THREE.Vector3(0, this.groundY, 0) : null)
    parent.object.add(light)
    const node = this.addNode(light, parent.id, options.kind, false)
    this.aimLight(light)
    this.log(`Added ${light.name}`)
    this.select(node.id)
    return node
  }

  createCamera(options: CreateCameraOptions): EditorNode {
    const parent = this.parentOrSelected(options.parentId)
    const settings = defaultCameraSettings()
    settings.projection = options.projection
    if (options.fov !== undefined) settings.fov = options.fov
    if (options.near !== undefined) settings.near = options.near
    if (options.far !== undefined) settings.far = options.far
    if (options.zoom !== undefined) settings.zoom = options.zoom
    if (options.left !== undefined) settings.left = options.left
    if (options.right !== undefined) settings.right = options.right
    if (options.top !== undefined) settings.top = options.top
    if (options.bottom !== undefined) settings.bottom = options.bottom
    if (settings.right <= settings.left) settings.right = settings.left + 0.001
    if (settings.top <= settings.bottom) settings.top = settings.bottom + 0.001
    if (settings.projection === 'perspective' && settings.near < 0.001) settings.near = 0.001
    if (settings.far <= settings.near) settings.far = settings.near + 0.001
    settings.zoom = Math.max(settings.zoom, 0.001)
    settings.fov = Math.min(179, Math.max(1, settings.fov))
    if (settings.projection === 'perspective') settings.aspect = this.viewportAspect()
    else settings.aspect = (settings.right - settings.left) / (settings.top - settings.bottom)

    const camera = createCameraObject(settings)
    camera.name = this.uniqueName(options.name?.trim() || 'Camera')
    camera.userData.camera = settings
    camera.position.set(3.4, 2.4, 5.2)
    parent.object.add(camera)
    camera.lookAt(0, Math.max(this.groundY, 0), 0)
    const node = this.addNode(camera, parent.id, 'Camera3D', false)
    this.log(`Added ${camera.name}`)
    this.select(node.id)
    return node
  }

  cameraInspector(node: EditorNode): CameraInspector | null {
    if (node.kind !== 'Camera3D') return null
    const settings = readCameraSettings(node.object)
    if (!settings) return null
    return inspectCamera(settings, this.previewCameraId === node.id)
  }

  setCameraProjection(id: string, projection: CameraProjection): void {
    const node = this.nodes.get(id)
    const settings = node ? readCameraSettings(node.object) : null
    if (!node || !settings || settings.projection === projection) return
    settings.projection = projection
    if (projection === 'perspective' && settings.near < 0.001) settings.near = 0.001
    this.ensureCameraClass(node)
    this.applyNodeCamera(node)
    this.touchScene()
  }

  setCameraNumber(id: string, field: CameraNumberField, value: number): void {
    const node = this.nodes.get(id)
    const settings = node ? readCameraSettings(node.object) : null
    if (!node || !settings) return
    writeCameraNumber(settings, field, value)
    this.applyNodeCamera(node)
    this.touchScene()
  }

  setCameraFlag(id: string, field: CameraFlagField, value: boolean): void {
    const node = this.nodes.get(id)
    const settings = node ? readCameraSettings(node.object) : null
    if (!node || !settings) return
    writeCameraFlag(settings, field, value)
    if (field === 'current' && value) this.enforceSingleCurrent(node.id)
    this.applyNodeCamera(node)
    if (this.playing) this.syncViewCamera()
    this.touchScene()
  }

  resetCamera(id: string, field: CameraResetField): void {
    const node = this.nodes.get(id)
    const settings = node ? readCameraSettings(node.object) : null
    const defaults = node?.defaults.camera
    if (!node || !settings || !defaults) return
    resetCameraField(settings, defaults, field)
    if (field === 'current' && settings.current) this.enforceSingleCurrent(node.id)
    this.ensureCameraClass(node)
    this.applyNodeCamera(node)
    if (this.playing) this.syncViewCamera()
    this.touchScene()
  }

  /** Look through a scene camera in the editor. Uncheck to return to the orbit camera. */
  setCameraPreview(id: string | null, enabled = true): void {
    const valid = Boolean(enabled && id && this.nodes.get(id)?.kind === 'Camera3D')
    this.previewCameraId = valid ? id : null
    this.syncViewCamera()
    this.updateCameras()
  }

  duplicate(id: string): EditorNode | null {
    const copy = this.copyNode(id)
    if (copy) this.select(copy.id)
    return copy
  }

  duplicateMany(ids: string[]): EditorNode[] {
    const copies: EditorNode[] = []
    for (const id of this.selectionRoots(ids)) {
      const copy = this.copyNode(id)
      if (copy) copies.push(copy)
    }
    if (copies.length > 0) this.setSelection(copies.map((copy) => copy.id))
    return copies
  }

  deleteNode(id: string, quiet = false): void {
    const node = this.nodes.get(id)
    if (!node || node.isRoot) return
    const ids = this.collectIds(node)
    if (this.previewCameraId && ids.includes(this.previewCameraId)) this.previewCameraId = null
    this.releaseCameras(node.object)
    this.releaseLights(node.object)
    for (const childId of ids) this.forgetNodeComponents(childId)
    destroy(node.object)
    for (const childId of ids) this.nodes.delete(childId)
    const parent = node.parentId ? this.nodes.get(node.parentId) : undefined
    if (parent) parent.childIds = parent.childIds.filter((childId) => childId !== id)
    this.dropOrphanResources()
    this.pruneSelection(parent?.id ?? this.rootId)
    this.syncViewCamera()
    if (!quiet) this.log(`Removed ${node.name}`)
    this.touchScene()
  }

  deleteNodes(ids: string[]): void {
    const roots = this.selectionRoots(ids)
    const names = roots.flatMap((id) => {
      const name = this.nodes.get(id)?.name
      return name ? [name] : []
    })
    for (const id of roots) this.deleteNode(id, true)
    if (names.length === 1) this.log(`Removed ${names[0]}`)
    else if (names.length > 1) this.log(`Removed ${names.join(', ')}`)
  }

  createComponent(name: string, source: string): { id: string } | { error: string } {
    const className = uniqueIdentifier(name, this.componentNames())
    const nextSource = withClassName(source.trim() ? source : componentTemplate(className), className)
    try {
      const compiled = compileComponent(nextSource)
      if (this.componentNames().has(compiled.name)) {
        return { error: `A component named ${compiled.name} already exists.` }
      }
      const resource: ComponentResource = {
        id: `cmp${this.idCounter++}`,
        name: compiled.name,
        source: withClassName(nextSource, compiled.name),
        builtin: false,
        ctor: compiled.ctor,
        error: null,
      }
      this.components.set(resource.id, resource)
      this.log(`Created component ${resource.name}`)
      return { id: resource.id }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.log(message, 'error')
      return { error: message }
    }
  }

  updateComponentSource(id: string, source: string): string | null {
    const resource = this.components.get(id)
    if (!resource) return 'Component not found.'
    try {
      const compiled = compileComponent(source)
      if (compiled.name !== resource.name && this.componentNames().has(compiled.name)) {
        return `A component named ${compiled.name} already exists.`
      }
      resource.builtin = false
      resource.name = compiled.name
      resource.source = source
      resource.ctor = compiled.ctor
      resource.error = null
      this.retargetInstances(resource)
      this.log(`Updated ${resource.name}`)
      this.touchScene()
      return null
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      resource.error = message
      this.log(message, 'error')
      return message
    }
  }

  attachComponent(
    resourceId: string,
    nodeId: string,
    fields?: Record<string, number | string | boolean>,
    silent = false,
  ): ComponentInstance | null {
    const resource = this.components.get(resourceId)
    const node = this.nodes.get(nodeId)
    if (!resource || !node) return null
    try {
      const behaviour = this.spawnBehaviour(node, resource, fields)
      const instance = this.trackInstance(node, resource, behaviour)
      if (!silent) this.log(`Added ${resource.name} to ${node.name}`)
      this.touchScene()
      return instance
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.log(message, 'error')
      return null
    }
  }

  moveComponent(instanceId: string, nodeId: string): void {
    const instance = this.componentInstances.get(instanceId)
    const node = this.nodes.get(nodeId)
    const resource = instance ? this.components.get(instance.resourceId) : undefined
    if (!instance || !node || !resource || instance.nodeId === node.id) return
    const previous = this.nodes.get(instance.nodeId)
    const fields = parameterFields(instance.behaviour)
    const enabled = instance.behaviour.enabled
    destroy(instance.behaviour)
    if (previous) previous.componentIds = previous.componentIds.filter((id) => id !== instance.id)
    instance.behaviour = this.spawnBehaviour(node, resource, fields)
    if (!enabled) instance.behaviour.disable()
    instance.nodeId = node.id
    instance.name = resource.name
    node.componentIds.push(instance.id)
    this.log(`Moved ${resource.name} to ${node.name}`)
    this.touchScene()
  }

  removeComponent(instanceId: string): void {
    const instance = this.componentInstances.get(instanceId)
    if (!instance) return
    const node = this.nodes.get(instance.nodeId)
    destroy(instance.behaviour)
    this.componentInstances.delete(instanceId)
    if (node) node.componentIds = node.componentIds.filter((id) => id !== instanceId)
    this.log(`Removed ${instance.name}${node ? ` from ${node.name}` : ''}`)
    this.touchScene()
  }

  usesOf(resourceId: string): { id: string, objectName: string, componentName: string }[] {
    const resource = this.components.get(resourceId)
    if (!resource) return []
    const uses: { id: string, objectName: string, componentName: string }[] = []
    for (const instance of this.componentInstances.values()) {
      if (instance.resourceId !== resourceId) continue
      uses.push({
        id: instance.id,
        objectName: this.nodes.get(instance.nodeId)?.name ?? 'Object',
        componentName: resource.name,
      })
    }
    return uses
  }

  deleteComponent(resourceId: string): void {
    const resource = this.components.get(resourceId)
    if (!resource) return
    for (const instance of [...this.componentInstances.values()]) {
      if (instance.resourceId === resourceId) this.removeComponent(instance.id)
    }
    this.components.delete(resourceId)
    this.log(`Deleted ${resource.name}`)
    this.touchScene()
  }

  parametersOf(instanceId: string): ComponentParameter[] {
    const instance = this.componentInstances.get(instanceId)
    return instance ? readParameters(instance.behaviour) : []
  }

  setComponentParameter(instanceId: string, key: string, value: number | string | boolean): void {
    const instance = this.componentInstances.get(instanceId)
    if (!instance) return
    applyParameters(instance.behaviour, { [key]: value })
    this.touchScene()
  }

  setComponentEnabled(instanceId: string, enabled: boolean): void {
    const instance = this.componentInstances.get(instanceId)
    if (!instance) return
    instance.behaviour.setEnabled(enabled)
    this.touchScene()
  }

  rename(id: string, name: string): void {
    const node = this.nodes.get(id)
    const next = name.trim()
    if (!node || !next || node.isRoot) return
    node.name = next
    node.object.name = next
    this.touchScene()
  }

  reparent(id: string, parentId: string): void {
    const node = this.nodes.get(id)
    const parent = this.nodes.get(parentId)
    if (!node || !parent || node.isRoot || node.id === parent.id) return
    if (this.isAncestor(node.id, parent.id)) return
    const previous = node.parentId ? this.nodes.get(node.parentId) : undefined
    if (previous) previous.childIds = previous.childIds.filter((childId) => childId !== id)
    parent.childIds.push(id)
    node.parentId = parent.id
    parent.object.attach(node.object)
    this.log(`Moved ${node.name} under ${parent.name}`)
    this.touchScene()
  }

  setPosition(id: string, axis: 'x' | 'y' | 'z', value: number): void {
    const node = this.nodes.get(id)
    if (!node || !Number.isFinite(value)) return
    node.object.position[axis] = value
    this.touchScene()
  }

  setRotationDegrees(id: string, axis: 'x' | 'y' | 'z', degrees: number): void {
    const node = this.nodes.get(id)
    if (!node || !Number.isFinite(degrees)) return
    node.object.rotation[axis] = THREE.MathUtils.degToRad(degrees)
    this.syncLookAtFromRotation(node.object)
    this.touchScene()
  }

  setScale(id: string, axis: 'x' | 'y' | 'z', value: number): void {
    const node = this.nodes.get(id)
    if (!node || !Number.isFinite(value)) return
    node.object.scale[axis] = value === 0 ? 0.001 : value
    this.touchScene()
  }

  setVisible(id: string, visible: boolean): void {
    const node = this.nodes.get(id)
    if (!node) return
    node.object.visible = visible
    this.touchScene()
  }

  setCastShadow(id: string, enabled: boolean): void {
    const node = this.nodes.get(id)
    const object = node?.object as THREE.Object3D & { castShadow?: boolean }
    if (!object || !('castShadow' in object)) return
    object.castShadow = enabled
    this.touchScene()
  }

  setReceiveShadow(id: string, enabled: boolean): void {
    const node = this.nodes.get(id)
    const mesh = node?.object
    if (!(mesh instanceof THREE.Mesh)) return
    mesh.receiveShadow = enabled
    this.touchScene()
  }

  setGeometryType(nodeId: string, type: GeometryType): void {
    const resource = this.geometryOf(nodeId)
    if (!resource) return
    resource.type = type
    resource.params = defaultParams(type)
    resource.name = this.uniqueResourceName(geometryEntry(type).label, this.geometries, resource.id)
    this.rebuildGeometry(resource.id)
    this.touchScene()
  }

  setGeometryParam(nodeId: string, key: string, value: number): void {
    const resource = this.geometryOf(nodeId)
    if (!resource) return
    resource.params[key] = clampParam(resource.type, key, value)
    this.rebuildGeometry(resource.id)
    this.touchScene()
  }

  resetGeometryType(nodeId: string): void {
    const resource = this.geometryOf(nodeId)
    if (!resource) return
    resource.type = resource.defaults.type
    resource.params = { ...resource.defaults.params }
    this.rebuildGeometry(resource.id)
    this.touchScene()
  }

  resetGeometryParam(nodeId: string, key: string): void {
    const resource = this.geometryOf(nodeId)
    if (!resource) return
    const spec = geometryEntry(resource.type).params.find((item) => item.key === key)
    const stored = resource.type === resource.defaults.type ? resource.defaults.params[key] : undefined
    const value = stored ?? spec?.default
    if (value === undefined) return
    resource.params[key] = clampParam(resource.type, key, value)
    this.rebuildGeometry(resource.id)
    this.touchScene()
  }

  assignGeometry(nodeId: string, geometryId: string): void {
    const node = this.nodes.get(nodeId)
    const resource = this.geometries.get(geometryId)
    if (!node || node.kind !== 'MeshInstance3D' || !resource?.geometry) return
    node.geometryId = geometryId
    ;(node.object as THREE.Mesh).geometry = resource.geometry
    this.touchScene()
  }

  makeGeometryUnique(nodeId: string): void {
    const node = this.nodes.get(nodeId)
    const current = node?.geometryId ? this.geometries.get(node.geometryId) : undefined
    if (!node || !current) return
    const copy = this.createGeometryResource(current.type, { ...current.params }, `${current.name}Unique`)
    this.rebuildGeometry(copy.id)
    this.assignGeometry(nodeId, copy.id)
  }

  newGeometryFor(nodeId: string, type: GeometryType): void {
    const node = this.nodes.get(nodeId)
    if (!node || node.kind !== 'MeshInstance3D') return
    const resource = this.createGeometryResource(type, defaultParams(type))
    this.rebuildGeometry(resource.id)
    node.imported = false
    this.assignGeometry(nodeId, resource.id)
    this.log(`Assigned ${resource.name} to ${node.name}`)
  }

  setMaterialSource(materialId: string, source: string): void {
    const resource = this.materials.get(materialId)
    if (!resource) return
    resource.source = source
    this.touchScene()
  }

  compileMaterial(materialId: string): { ok: true } | { ok: false, error: string } {
    const resource = this.materials.get(materialId)
    if (!resource) return { ok: false, error: 'Missing material.' }
    try {
      const next = compileTSLMaterial(resource.source, this.flagsOf(resource))
      next.name = resource.name
      const previous = resource.material
      resource.material = next
      resource.error = null
      for (const node of this.usersOfMaterial(materialId)) {
        const mesh = node.object
        if (mesh instanceof THREE.Mesh) mesh.material = next
      }
      if (previous && previous !== next) previous.dispose()
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      resource.error = message
      return { ok: false, error: message }
    }
  }

  setMaterialFlags(materialId: string, patch: Partial<MaterialFlags>): void {
    const resource = this.materials.get(materialId)
    if (!resource) return
    if (patch.side) resource.side = patch.side
    if (patch.transparent !== undefined) resource.transparent = patch.transparent
    if (patch.wireframe !== undefined) resource.wireframe = patch.wireframe
    if (resource.material) applyMaterialFlags(resource.material, this.flagsOf(resource))
    this.touchScene()
  }

  setMaterialName(materialId: string, name: string): void {
    const resource = this.materials.get(materialId)
    const next = name.trim().replace(/[\\/]/g, '')
    if (!resource || !next) return
    resource.name = this.uniqueResourceName(next, this.materials, resource.id)
    if (resource.material) resource.material.name = resource.name
    this.touchScene()
  }

  resetMaterialName(materialId: string): void {
    const resource = this.materials.get(materialId)
    if (!resource) return
    this.setMaterialName(materialId, resource.defaults.name)
  }

  resetMaterialSource(materialId: string): void {
    const resource = this.materials.get(materialId)
    if (!resource) return
    resource.source = resource.defaults.source
    const compiled = this.compileMaterial(materialId)
    if (!compiled.ok) this.log(`${resource.name}: ${compiled.error}`, 'error')
    this.touchScene()
  }

  resetMaterialFlag(materialId: string, flag: keyof MaterialFlags): void {
    const resource = this.materials.get(materialId)
    if (!resource) return
    if (flag === 'side') this.setMaterialFlags(materialId, { side: resource.defaults.side })
    else if (flag === 'transparent') this.setMaterialFlags(materialId, { transparent: resource.defaults.transparent })
    else this.setMaterialFlags(materialId, { wireframe: resource.defaults.wireframe })
  }

  assignMaterial(nodeId: string, materialId: string): void {
    const node = this.nodes.get(nodeId)
    const resource = this.materials.get(materialId)
    if (!node || node.kind !== 'MeshInstance3D' || !resource?.material) return
    node.materialId = materialId
    node.imported = false
    ;(node.object as THREE.Mesh).material = resource.material
    this.touchScene()
  }

  newMaterialFor(nodeId: string, presetId = 'lit'): MaterialResource | null {
    const node = this.nodes.get(nodeId)
    if (!node || node.kind !== 'MeshInstance3D') return null
    const preset = presetById(presetId)
    const resource = this.createMaterialResource(preset.name, preset.source, { ...DEFAULT_FLAGS })
    const compiled = this.compileMaterial(resource.id)
    if (!compiled.ok) {
      this.materials.delete(resource.id)
      this.log(compiled.error, 'error')
      return null
    }
    this.assignMaterial(nodeId, resource.id)
    this.log(`Assigned ${resource.name} to ${node.name}`)
    return resource
  }

  makeMaterialUnique(nodeId: string): void {
    const node = this.nodes.get(nodeId)
    const current = node?.materialId ? this.materials.get(node.materialId) : undefined
    if (!node || !current) return
    const copy = this.createMaterialResource(`${current.name}Unique`, current.source, this.flagsOf(current))
    const compiled = this.compileMaterial(copy.id)
    if (!compiled.ok) {
      this.materials.delete(copy.id)
      this.log(compiled.error, 'error')
      return
    }
    this.assignMaterial(nodeId, copy.id)
  }

  applyPreset(materialId: string, presetId: string): void {
    const resource = this.materials.get(materialId)
    if (!resource) return
    const preset = presetById(presetId)
    resource.source = preset.source
    const compiled = this.compileMaterial(materialId)
    if (!compiled.ok) this.log(`${resource.name}: ${compiled.error}`, 'error')
    this.touchScene()
  }

  setLightColor(id: string, color: string, which: 'color' | 'ground' = 'color'): void {
    const light = this.lightOf(id)
    if (!light) return
    if (which === 'ground' && light instanceof THREE.HemisphereLight) light.groundColor.set(color)
    else light.color.set(color)
    this.touchScene()
  }

  setLightIntensity(id: string, value: number): void {
    const light = this.lightOf(id)
    if (!light || !Number.isFinite(value)) return
    light.intensity = value
    this.touchScene()
  }

  setLightRange(id: string, value: number): void {
    const light = this.lightOf(id)
    if (!light || !Number.isFinite(value)) return
    if (!(light instanceof THREE.PointLight) && !(light instanceof THREE.SpotLight)) return
    light.distance = Math.max(0, value)
    if (light instanceof THREE.PointLight) {
      light.shadow.camera.far = Math.max(light.distance, 0.5)
      light.shadow.camera.updateProjectionMatrix()
    }
    this.touchScene()
  }

  setSpotAngle(id: string, degrees: number): void {
    const light = this.lightOf(id)
    if (!(light instanceof THREE.SpotLight) || !Number.isFinite(degrees)) return
    light.angle = THREE.MathUtils.degToRad(Math.min(90, Math.max(1, degrees)))
    this.touchScene()
  }

  setSpotPenumbra(id: string, value: number): void {
    const light = this.lightOf(id)
    if (!(light instanceof THREE.SpotLight) || !Number.isFinite(value)) return
    light.penumbra = Math.min(1, Math.max(0, value))
    this.touchScene()
  }

  readLookAt(id: string): LookAtConfig | null {
    const light = this.lightOf(id)
    if (!light) return null
    return copyLookAt(light.userData.lookAt as LookAtConfig | undefined)
  }

  setLookAtEnabled(id: string, enabled: boolean): void {
    const light = this.lightOf(id)
    if (!(light instanceof THREE.DirectionalLight) && !(light instanceof THREE.SpotLight)) return
    const look = this.ensureLookAt(light)
    look.enabled = enabled
    this.aimLight(light)
    this.touchScene()
  }

  setLookAt(id: string, axis: 'x' | 'y' | 'z', value: number): void {
    const light = this.lightOf(id)
    if (!(light instanceof THREE.DirectionalLight) && !(light instanceof THREE.SpotLight)) return
    if (!Number.isFinite(value)) return
    const look = this.ensureLookAt(light)
    look[axis] = value
    look.enabled = true
    this.aimLight(light)
    this.touchScene()
  }

  resetLookAtEnabled(id: string): void {
    const node = this.nodes.get(id)
    const look = node?.defaults.light?.lookAt
    if (!look) return
    this.setLookAtEnabled(id, look.enabled)
  }

  resetLookAt(id: string): void {
    const node = this.nodes.get(id)
    const look = node?.defaults.light?.lookAt
    if (!look) return
    const light = this.lightOf(id)
    if (!(light instanceof THREE.DirectionalLight) && !(light instanceof THREE.SpotLight)) return
    const current = this.ensureLookAt(light)
    current.x = look.x
    current.y = look.y
    current.z = look.z
    current.enabled = true
    this.aimLight(light)
    this.touchScene()
  }

  resetLight(id: string, field: 'color' | 'ground' | 'intensity' | 'range' | 'angle' | 'penumbra'): void {
    const defaults = this.nodes.get(id)?.defaults.light
    if (!defaults) return
    if (field === 'color') this.setLightColor(id, defaults.color)
    else if (field === 'ground' && defaults.ground) this.setLightColor(id, defaults.ground, 'ground')
    else if (field === 'intensity') this.setLightIntensity(id, defaults.intensity)
    else if (field === 'range' && defaults.range !== null) this.setLightRange(id, defaults.range)
    else if (field === 'angle' && defaults.angle !== null) this.setSpotAngle(id, defaults.angle)
    else if (field === 'penumbra' && defaults.penumbra !== null) this.setSpotPenumbra(id, defaults.penumbra)
  }

  resetTransform(id: string, part: 'pos' | 'rot' | 'scl'): void {
    const node = this.nodes.get(id)
    if (!node || node.isRoot) return
    const defaults = node.defaults
    if (part === 'pos') node.object.position.set(defaults.position[0], defaults.position[1], defaults.position[2])
    else if (part === 'rot') {
      node.object.rotation.set(
        THREE.MathUtils.degToRad(defaults.rotation[0]),
        THREE.MathUtils.degToRad(defaults.rotation[1]),
        THREE.MathUtils.degToRad(defaults.rotation[2]),
      )
      this.syncLookAtFromRotation(node.object)
    } else node.object.scale.set(defaults.scale[0], defaults.scale[1], defaults.scale[2])
    this.touchScene()
  }

  resetVisible(id: string): void {
    const node = this.nodes.get(id)
    if (!node) return
    this.setVisible(id, node.defaults.visible)
  }

  resetCastShadow(id: string): void {
    const node = this.nodes.get(id)
    if (!node || node.defaults.castShadow === null) return
    this.setCastShadow(id, node.defaults.castShadow)
  }

  resetReceiveShadow(id: string): void {
    const node = this.nodes.get(id)
    if (!node || node.defaults.receiveShadow === null) return
    this.setReceiveShadow(id, node.defaults.receiveShadow)
  }

  usersOfMaterial(materialId: string): EditorNode[] {
    return [...this.nodes.values()].filter((node) => node.materialId === materialId)
  }

  usersOfGeometry(geometryId: string): EditorNode[] {
    return [...this.nodes.values()].filter((node) => node.geometryId === geometryId)
  }

  materialOf(nodeId: string): MaterialResource | null {
    const node = this.nodes.get(nodeId)
    if (!node?.materialId) return null
    return this.materials.get(node.materialId) ?? null
  }

  geometryOf(nodeId: string): GeometryResource | null {
    const node = this.nodes.get(nodeId)
    if (!node?.geometryId) return null
    return this.geometries.get(node.geometryId) ?? null
  }

  pick(ndcX: number, ndcY: number): string | null {
    const camera = this.camera
    if (!camera) return null
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
    const targets: THREE.Object3D[] = []
    for (const node of this.nodes.values()) {
      if (node.object instanceof THREE.Mesh && node.object.visible) targets.push(node.object)
      const icon = node.object.getObjectByName('LightIcon') ?? node.object.getObjectByName('CameraIcon')
      if (icon?.visible) targets.push(icon)
    }
    const hits = raycaster.intersectObjects(targets, true)
    for (const hit of hits) {
      let current: THREE.Object3D | null = hit.object
      while (current) {
        const id = current.userData.editorId as string | undefined
        if (id && this.nodes.has(id)) return id
        current = current.parent
      }
    }
    return null
  }

  /**
   * Nodes whose screen bounds meet the rectangle. Coordinates are canvas pixels, origin at the top left.
   * Meshes use their own geometry, so a parent is not selected just because a child is inside the rectangle.
   * Lights, cameras, and empty nodes use a point at their origin.
   */
  nodesInRect(x0: number, y0: number, x1: number, y1: number): string[] {
    const canvas = this.starter?.ctx.renderer.domElement
    const camera = this.camera
    if (!canvas || !camera || !this.rootId) return []
    const rect = canvas.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    if (width < 1 || height < 1) return []
    camera.updateMatrixWorld(true)
    const left = Math.min(x0, x1)
    const right = Math.max(x0, x1)
    const top = Math.min(y0, y1)
    const bottom = Math.max(y0, y1)
    const hits: string[] = []
    const walk = (id: string): void => {
      const node = this.nodes.get(id)
      if (!node) return
      if (!node.isRoot && this.hitsMarquee(node, left, top, right, bottom, width, height)) hits.push(id)
      for (const childId of node.childIds) walk(childId)
    }
    walk(this.rootId)
    return hits
  }

  private touchScene(): void {
    if (this.restoring) return
    this.sceneDirty = true
  }

  private rememberClean(): void {
    this.cleanCapture = fingerprint(this.captureScene())
    this.sceneDirty = false
  }

  /** Scene file the history stack can restore later. */
  captureHistory(): SceneFile {
    return this.captureScene()
  }

  /** Replace the open scene with a history snapshot and keep the saved-file baseline. */
  restoreHistory(file: SceneFile): void {
    this.applyScene(file, true)
    this.sceneDirty = this.cleanCapture === null || fingerprint(file) !== this.cleanCapture
  }

  private captureScene(): SceneFile {
    const geometries: SceneGeometryRecord[] = []
    const materials: SceneMaterialRecord[] = []
    const geometryFileIds = new Map<string, string>()
    const materialFileIds = new Map<string, string>()
    const looseGeometry = new Map<string, string>()
    const looseMaterial = new Map<string, string>()
    const takenNames = new Set<string>()
    let geoCount = 0
    let matCount = 0

    const unique = (base: string): string => {
      const cleaned = base.trim() || 'Resource'
      if (!takenNames.has(cleaned)) {
        takenNames.add(cleaned)
        return cleaned
      }
      let index = 2
      while (takenNames.has(`${cleaned}${index}`)) index += 1
      const next = `${cleaned}${index}`
      takenNames.add(next)
      return next
    }

    const geometryIdFor = (node: EditorNode): string | null => {
      if (node.kind !== 'MeshInstance3D' || !(node.object instanceof THREE.Mesh)) return null
      if (node.geometryId && this.geometries.has(node.geometryId)) {
        const existing = geometryFileIds.get(node.geometryId)
        if (existing) return existing
        const resource = this.geometries.get(node.geometryId)
        if (!resource) return null
        const id = `g${++geoCount}`
        geometryFileIds.set(node.geometryId, id)
        geometries.push({ id, name: unique(resource.name), type: resource.type, params: { ...resource.params } })
        return id
      }
      const geometry = node.object.geometry
      const cached = looseGeometry.get(geometry.uuid)
      if (cached) return cached
      const snapshot = geometrySnapshot(geometry)
      if (!snapshot) {
        this.log(`${node.name} has no editable geometry, so it will load as a box.`, 'warn')
        return null
      }
      const id = `g${++geoCount}`
      looseGeometry.set(geometry.uuid, id)
      geometries.push({
        id,
        name: unique(geometry.name || geometryEntry(snapshot.type).label),
        type: snapshot.type,
        params: snapshot.params,
      })
      return id
    }

    const materialIdFor = (node: EditorNode): string | null => {
      if (node.kind !== 'MeshInstance3D' || !(node.object instanceof THREE.Mesh)) return null
      if (node.materialId && this.materials.has(node.materialId)) {
        const existing = materialFileIds.get(node.materialId)
        if (existing) return existing
        const resource = this.materials.get(node.materialId)
        if (!resource) return null
        const id = `m${++matCount}`
        materialFileIds.set(node.materialId, id)
        materials.push({
          id,
          name: unique(resource.name),
          source: resource.source,
          side: resource.side,
          transparent: resource.transparent,
          wireframe: resource.wireframe,
        })
        return id
      }
      const material = node.object.material
      if (Array.isArray(material)) {
        this.log(`${node.name} uses more than one material. The saved scene keeps the first editable one.`, 'warn')
      }
      const single = Array.isArray(material) ? material[0] : material
      if (!single) return null
      const cached = looseMaterial.get(single.uuid)
      if (cached) return cached
      const snapshot = materialSnapshot(single)
      if (!snapshot) {
        this.log(`${node.name} has no TSL material, so it will load with the Lit preset.`, 'warn')
        return null
      }
      const id = `m${++matCount}`
      looseMaterial.set(single.uuid, id)
      materials.push({
        id,
        name: unique(single.name || 'Material'),
        source: snapshot.source,
        side: snapshot.side,
        transparent: snapshot.transparent,
        wireframe: snapshot.wireframe,
      })
      return id
    }

    const nodes: SceneNodeRecord[] = []
    const walk = (node: EditorNode, parentFileId: string | null): void => {
      if (node.instanceOwnerId) return
      const id = parentFileId === null ? 'root' : `n${nodes.length}`
      nodes.push({
        id,
        name: node.name,
        kind: node.kind,
        parentId: parentFileId,
        position: [node.object.position.x, node.object.position.y, node.object.position.z],
        rotation: [
          THREE.MathUtils.radToDeg(node.object.rotation.x),
          THREE.MathUtils.radToDeg(node.object.rotation.y),
          THREE.MathUtils.radToDeg(node.object.rotation.z),
        ],
        scale: [node.object.scale.x, node.object.scale.y, node.object.scale.z],
        visible: node.object.visible,
        castShadow: booleanFlag(node.object, 'castShadow'),
        receiveShadow: node.object instanceof THREE.Mesh ? node.object.receiveShadow : false,
        geometryId: geometryIdFor(node),
        materialId: materialIdFor(node),
        light: lightDefaultsFrom(node.object),
        camera: this.cameraRecord(node),
        components: this.componentRecords(node),
        instance: node.instancePath,
      })
      if (node.instancePath) return
      for (const childId of node.childIds) {
        const child = this.nodes.get(childId)
        if (child) walk(child, id)
      }
    }

    const root = this.nodes.get(this.rootId)
    if (!root) throw new Error('Scene root is missing.')
    walk(root, null)
    return {
      version: 1,
      path: this.scenePath,
      scene: this.sceneSettings(),
      grid: this.gridSettings(),
      geometries,
      materials,
      nodes,
    }
  }

  private applyScene(file: SceneFile, preserveNames = false): void {
    const root = this.nodes.get(this.rootId)
    if (!root) throw new Error('Scene root is missing.')
    this.restoring = true
    try {
      this.controls?.detach()
      this.previewCameraId = null
      if (this.playing) this.setPlaying(false)
      for (const childId of [...root.childIds]) this.deleteNode(childId, true)
      for (const instanceId of [...root.componentIds]) {
        const instance = this.componentInstances.get(instanceId)
        if (instance) destroy(instance.behaviour)
        this.componentInstances.delete(instanceId)
      }
      root.componentIds = []

      this.setBackground(file.scene.background)
      this.setBackgroundIntensity(file.scene.backgroundIntensity)
      this.setEnvironmentIntensity(file.scene.environmentIntensity)
      this.setShadows(file.scene.shadows)
      this.setShadowType(file.scene.shadowType)
      this.setGridVisible(file.grid.visible)
      this.setGridSize(file.grid.size)
      this.setGridDivisions(file.grid.divisions)
      this.setGridCenter(file.grid.center)
      this.setGridColor(file.grid.color)
      this.gridPosition.set(file.grid.position.x, file.grid.position.y, file.grid.position.z)
      this.applyGridPosition()

      const geoMap = new Map<string, string>()
      for (const record of file.geometries) {
        const resource = this.createGeometryResource(record.type, record.params, record.name)
        geoMap.set(record.id, resource.id)
      }
      const matMap = new Map<string, string>()
      for (const record of file.materials) {
        const resource = this.createMaterialResource(record.name, record.source, {
          side: record.side,
          transparent: record.transparent,
          wireframe: record.wireframe,
        })
        const compiled = this.compileMaterial(resource.id)
        if (!compiled.ok) this.log(`${record.name}: ${compiled.error}`, 'error')
        matMap.set(record.id, resource.id)
      }

      const runtime = new Map<string, string>()
      const rootRecord = file.nodes.find((node) => node.parentId === null)
      if (rootRecord) {
        runtime.set(rootRecord.id, this.rootId)
        root.object.visible = rootRecord.visible
        this.applyComponents(root, rootRecord.components)
      }
      for (const record of file.nodes) {
        if (!record.parentId) continue
        const parentRuntime = runtime.get(record.parentId)
        if (!parentRuntime) {
          this.log(`Skipped ${record.name}: its parent is missing from the scene file.`, 'warn')
          continue
        }
        const created = this.spawnRecord(record, parentRuntime, geoMap, matMap, new Set(), preserveNames)
        runtime.set(record.id, created.id)
      }
      this.enforceSingleCurrent()
      this.syncViewCamera()
      this.select(this.rootId)
      this.sceneDirty = false
    } finally {
      this.restoring = false
    }
  }

  private spawnRecord(
    record: SceneNodeRecord,
    parentId: string,
    geoMap: Map<string, string>,
    matMap: Map<string, string>,
    stack: Set<string> = new Set(),
    preserveNames = false,
  ): EditorNode {
    const parent = this.nodes.get(parentId)
    if (!parent) throw new Error('Parent is missing.')

    let geometryId: string | null = null
    let materialId: string | null = null
    let object: THREE.Object3D

    if (record.kind === 'MeshInstance3D') {
      geometryId = record.geometryId ? geoMap.get(record.geometryId) ?? null : null
      materialId = record.materialId ? matMap.get(record.materialId) ?? null : null
      if (!geometryId || !this.geometries.get(geometryId)?.geometry) {
        geometryId = this.createGeometryResource('box', defaultParams('box')).id
      }
      if (!materialId || !this.materials.get(materialId)?.material) {
        const resource = this.createMaterialResource('Lit', presetById('lit').source, { ...DEFAULT_FLAGS })
        this.compileMaterial(resource.id)
        materialId = resource.id
      }
      const geometry = this.geometries.get(geometryId)?.geometry
      const material = this.materials.get(materialId)?.material
      if (!geometry || !material) throw new Error(`Could not build ${record.name}.`)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.castShadow = record.castShadow
      mesh.receiveShadow = record.receiveShadow
      object = mesh
    } else if (record.kind === 'DirectionalLight3D') {
      object = new THREE.DirectionalLight(record.light?.color ?? '#ffffff', record.light?.intensity ?? 1)
    } else if (record.kind === 'OmniLight3D') {
      object = new THREE.PointLight(record.light?.color ?? '#ffffff', record.light?.intensity ?? 1, record.light?.range ?? 12, 0)
    } else if (record.kind === 'SpotLight3D') {
      object = new THREE.SpotLight(
        record.light?.color ?? '#ffffff',
        record.light?.intensity ?? 1,
        record.light?.range ?? 16,
        THREE.MathUtils.degToRad(record.light?.angle ?? 35),
        record.light?.penumbra ?? 0.4,
        0,
      )
    } else if (record.kind === 'HemisphereLight3D') {
      object = new THREE.HemisphereLight(
        record.light?.color ?? '#e7eefc',
        record.light?.ground ?? '#3c342c',
        record.light?.intensity ?? 0.45,
      )
    } else if (record.kind === 'Camera3D') {
      const settings = record.camera ? copyCameraSettings(record.camera) : defaultCameraSettings()
      object = createCameraObject(settings)
      object.userData.camera = settings
    } else {
      object = new THREE.Group()
    }

    const rawName = record.name.trim() || NODE_LABEL[record.kind]
    object.name = preserveNames ? rawName : this.uniqueName(rawName)
    object.position.set(record.position[0], record.position[1], record.position[2])
    object.rotation.set(
      THREE.MathUtils.degToRad(record.rotation[0]),
      THREE.MathUtils.degToRad(record.rotation[1]),
      THREE.MathUtils.degToRad(record.rotation[2]),
    )
    const scale = record.scale.map((value) => (value === 0 ? 0.001 : value)) as [number, number, number]
    object.scale.set(scale[0], scale[1], scale[2])
    object.visible = record.visible

    if (object instanceof THREE.Light) {
      const look = record.light?.lookAt
      const aimable = record.kind === 'DirectionalLight3D' || record.kind === 'SpotLight3D'
      const aim = look?.enabled ? new THREE.Vector3(look.x, look.y, look.z) : null
      this.prepareLight(object, aimable ? aim : null)
      if (aimable) {
        object.userData.lookAt = look
          ? { enabled: look.enabled, x: look.x, y: look.y, z: look.z }
          : { enabled: false, x: 0, y: 0, z: 0 }
        if (!look?.enabled) {
          object.rotation.set(
            THREE.MathUtils.degToRad(record.rotation[0]),
            THREE.MathUtils.degToRad(record.rotation[1]),
            THREE.MathUtils.degToRad(record.rotation[2]),
          )
        }
      }
      if (record.light) {
        object.color.set(record.light.color)
        object.intensity = record.light.intensity
        if (object instanceof THREE.HemisphereLight && record.light.ground) object.groundColor.set(record.light.ground)
      }
      if ('castShadow' in object) object.castShadow = record.castShadow
    } else if ('castShadow' in object) {
      object.castShadow = record.castShadow
    }

    parent.object.add(object)
    const node = this.addNode(object, parent.id, record.kind, false)
    node.geometryId = geometryId
    node.materialId = materialId
    if (record.kind === 'DirectionalLight3D' || record.kind === 'SpotLight3D') this.aimLight(object)
    this.applyComponents(node, record.components)
    if (record.instance) {
      node.instancePath = record.instance
      this.expandInstance(record.instance, node.id, stack)
    }
    this.captureDefaults(node)
    return node
  }

  /** Build a packed scene's nodes under `holderId` and mark them as owned by that instance. */
  private expandInstance(path: string, holderId: string, stack: Set<string>): void {
    if (stack.has(path)) {
      this.log(`Skipped ${path}: instancing it would loop.`, 'warn')
      return
    }
    const file = readSceneFile(path)
    const holder = this.nodes.get(holderId)
    if (!file || !holder) {
      if (!file) this.log(`Missing scene ${path}.`, 'warn')
      return
    }
    const root = file.nodes.find((node) => node.parentId === null)
    if (!root) return

    const geoMap = new Map<string, string>()
    for (const record of file.geometries) {
      const resource = this.createGeometryResource(record.type, record.params, record.name)
      geoMap.set(record.id, resource.id)
    }
    const matMap = new Map<string, string>()
    for (const record of file.materials) {
      const resource = this.createMaterialResource(record.name, record.source, {
        side: record.side,
        transparent: record.transparent,
        wireframe: record.wireframe,
      })
      const compiled = this.compileMaterial(resource.id)
      if (!compiled.ok) this.log(`${record.name}: ${compiled.error}`, 'error')
      matMap.set(record.id, resource.id)
    }

    const runtime = new Map<string, string>([[root.id, holderId]])
    const next = new Set(stack)
    next.add(path)
    for (const record of file.nodes) {
      if (!record.parentId) continue
      const parentRuntime = runtime.get(record.parentId)
      if (!parentRuntime) {
        this.log(`Skipped ${record.name} in ${path}: its parent is missing.`, 'warn')
        continue
      }
      const created = this.spawnRecord(record, parentRuntime, geoMap, matMap, next)
      created.instanceOwnerId = holderId
      runtime.set(record.id, created.id)
    }
  }

  private instanceCycle(path: string, stack: Set<string>): boolean {
    const file = readSceneFile(path)
    if (!file) return false
    const next = new Set(stack)
    next.add(path)
    for (const node of file.nodes) {
      if (!node.instance) continue
      if (next.has(node.instance)) return true
      if (this.instanceCycle(node.instance, next)) return true
    }
    return false
  }

  private instanceUsers(path: string): string[] {
    const users: string[] = []
    for (const node of this.nodes.values()) {
      if (node.instancePath === path) users.push(node.name)
    }
    for (const file of readSceneLibrary()) {
      if (file.path === path) continue
      if (file.nodes.some((node) => node.instance === path)) users.push(file.path)
    }
    return users
  }

  private applyComponents(node: EditorNode, components: SceneComponentRecord[]): void {
    for (const component of components) {
      const resource = this.componentByName(component.name)
      if (!resource) {
        this.log(`${node.name} is missing the ${component.name} component.`, 'warn')
        continue
      }
      const instance = this.attachComponent(resource.id, node.id, component.parameters, true)
      if (instance && !component.enabled) this.setComponentEnabled(instance.id, false)
    }
  }

  private componentRecords(node: EditorNode): SceneComponentRecord[] {
    const records: SceneComponentRecord[] = []
    for (const instanceId of node.componentIds) {
      const instance = this.componentInstances.get(instanceId)
      const resource = instance ? this.components.get(instance.resourceId) : undefined
      if (!instance || !resource) continue
      records.push({
        name: resource.name,
        enabled: instance.behaviour.enabled,
        parameters: parameterFields(instance.behaviour),
      })
    }
    return records
  }

  private componentByName(name: string): ComponentResource | undefined {
    for (const resource of this.components.values()) {
      if (resource.name === name) return resource
    }
    return undefined
  }

  private onFrame(): void {
    for (const node of this.nodes.values()) {
      if (node.kind === 'DirectionalLight3D' || node.kind === 'SpotLight3D') this.aimLight(node.object)
    }
    this.syncViewCamera()
    this.updateCameras()
    if (this.playing || !this.chromeVisible) return
    this.updateSelectionBox()
    this.updateLightIcons()
  }

  private aimLight(object: THREE.Object3D): void {
    if (!(object instanceof THREE.DirectionalLight) && !(object instanceof THREE.SpotLight)) return
    const scene = this.scene
    if (!scene) return
    const look = object.userData.lookAt as LookAtConfig | undefined
    object.getWorldPosition(this.tmp)
    const draggedId = object.userData.editorId as string | undefined
    const dragging = Boolean(
      this.controls?.dragging
      && this.tool === 'rotate'
      && draggedId
      && (draggedId === this.selectedId || this.selectionDrag?.some((entry) => entry.id === draggedId)),
    )
    if (look?.enabled) {
      if (dragging) {
        const dist = Math.max(this.tmp.distanceTo(this.forward.set(look.x, look.y, look.z)), 1)
        this.forward.set(0, 0, -1).applyQuaternion(object.quaternion).multiplyScalar(dist).add(this.tmp)
        look.x = this.forward.x
        look.y = this.forward.y
        look.z = this.forward.z
        object.target.position.copy(this.forward)
      } else {
        object.target.position.set(look.x, look.y, look.z)
        if (this.tmp.distanceToSquared(object.target.position) > 1e-8) object.lookAt(look.x, look.y, look.z)
      }
    } else {
      this.forward.set(0, 0, -1).applyQuaternion(object.quaternion)
      object.target.position.copy(this.tmp).add(this.forward)
    }
    object.target.userData.editorHidden = true
    if (!object.target.parent) scene.add(object.target)
    object.target.updateMatrixWorld()
  }

  private syncLookAtFromRotation(object: THREE.Object3D): void {
    const look = object.userData.lookAt as LookAtConfig | undefined
    if (!look?.enabled) return
    if (!(object instanceof THREE.DirectionalLight) && !(object instanceof THREE.SpotLight)) return
    object.updateWorldMatrix(true, false)
    object.getWorldPosition(this.tmp)
    const dist = Math.max(this.tmp.distanceTo(this.forward.set(look.x, look.y, look.z)), 1)
    this.forward.set(0, 0, -1).applyQuaternion(object.quaternion).multiplyScalar(dist).add(this.tmp)
    look.x = this.forward.x
    look.y = this.forward.y
    look.z = this.forward.z
    this.aimLight(object)
  }

  private syncGizmo(): void {
    const controls = this.controls
    if (!controls) return
    const node = this.selected()
    if (!node || node.isRoot || this.playing || this.tool === 'select') {
      controls.detach()
      return
    }
    controls.setMode(this.tool)
    controls.attach(node.object)
  }

  private updateSelectionBox(): void {
    const nodes = this.selectedIds
      .map((id) => this.nodes.get(id))
      .filter((node): node is EditorNode => Boolean(node && !node.isRoot))
    const show = nodes.length > 0 && !this.playing && this.chromeVisible && (this.tool === 'select' || nodes.length > 1)
    if (!show) {
      for (const helper of this.selectionHelpers) helper.visible = false
      return
    }
    this.ensureSelectionHelpers(nodes.length)
    const active = this.selectedId
    for (let index = 0; index < this.selectionHelpers.length; index += 1) {
      const helper = this.selectionHelpers[index]
      const node = nodes[index]
      if (!node) {
        helper.visible = false
        continue
      }
      const box = this.selectionBoxes[index]
      this.measureBounds(node.object, box)
      if (box.isEmpty()) {
        node.object.getWorldPosition(this.tmp)
        box.setFromCenterAndSize(this.tmp, this.tmpSize.set(0.45, 0.45, 0.45))
      }
      this.paintSelectionHelper(helper, nodes.length === 1 || node.id === active)
      helper.visible = true
    }
  }

  private applyGridVisibility(): void {
    if (!this.grid) return
    this.grid.visible = this.gridVisible && this.chromeVisible && !this.playing
  }

  private applyGridPosition(): void {
    this.grid?.position.copy(this.gridPosition)
  }

  private rebuildGrid(): void {
    const scene = this.scene
    if (!scene) return
    if (this.grid) {
      scene.remove(this.grid)
      this.grid.geometry.dispose()
      const materials = Array.isArray(this.grid.material) ? this.grid.material : [this.grid.material]
      for (const material of materials) material.dispose()
    }
    const grid = new THREE.GridHelper(this.gridSize, this.gridDivisions, this.gridCenter, this.gridColor)
    grid.userData.editorHidden = true
    grid.raycast = () => {}
    this.grid = grid
    scene.add(grid)
    this.applyGridPosition()
    this.applyGridVisibility()
  }

  private installEnvironment(renderer: THREE.Renderer): void {
    const scene = this.scene
    if (!scene) return
    try {
      const pmrem = new THREE.PMREMGenerator(renderer)
      const room = new RoomEnvironment()
      const target = pmrem.fromScene(room, 0.04)
      scene.environment = target.texture
      room.traverse((child) => {
        const mesh = child as THREE.Mesh
        mesh.geometry?.dispose()
        const materials = mesh.material
          ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material])
          : []
        for (const material of materials) material.dispose()
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.log(`Environment lighting skipped: ${message}`, 'warn')
    }
  }

  private addDefaultLights(world: THREE.Group): void {
    const hemi = new THREE.HemisphereLight('#e7eefc', '#3c342c', 0.45)
    hemi.name = 'HemisphereLight'
    const sun = new THREE.DirectionalLight('#fff4e4', 2.4)
    sun.name = 'DirectionalLight'
    sun.position.set(6, 10, 4)
    this.prepareLight(sun, new THREE.Vector3(0, 0, 0))
    world.add(hemi, sun)
  }

  /**
   * Point and spot lights use decay 0 so the Energy field stays bright out to Range.
   * Three's default decay of 2 is candela with inverse-square falloff, which makes
   * an energy of 2.4 invisible a couple of metres away. Directional and spot lights
   * also get a shadow frustum large enough for the starter floor.
   */
  private prepareLight(light: THREE.Light, lookAt: THREE.Vector3 | null): void {
    if (light instanceof THREE.PointLight || light instanceof THREE.SpotLight) light.decay = 0
    if (light instanceof THREE.DirectionalLight || light instanceof THREE.SpotLight || light instanceof THREE.PointLight) {
      light.castShadow = true
      this.configureShadow(light)
    }
    if (lookAt && (light instanceof THREE.DirectionalLight || light instanceof THREE.SpotLight)) {
      light.userData.lookAt = { enabled: true, x: lookAt.x, y: lookAt.y, z: lookAt.z }
      light.lookAt(lookAt)
    }
  }

  private configureShadow(light: THREE.DirectionalLight | THREE.SpotLight | THREE.PointLight): void {
    const shadow = light.shadow
    shadow.normalBias = 0.04
    if (light instanceof THREE.DirectionalLight) {
      shadow.mapSize.set(2048, 2048)
      shadow.bias = -0.0002
      const camera = shadow.camera
      camera.near = 0.5
      camera.far = 80
      if (camera instanceof THREE.OrthographicCamera) {
        camera.left = -20
        camera.right = 20
        camera.top = 20
        camera.bottom = -20
      }
      camera.updateProjectionMatrix()
      return
    }
    if (light instanceof THREE.SpotLight) {
      shadow.mapSize.set(1024, 1024)
      shadow.bias = -0.0001
      shadow.camera.near = 0.1
      shadow.camera.far = Math.max(light.distance, 30)
      shadow.camera.updateProjectionMatrix()
      return
    }
    shadow.mapSize.set(512, 512)
    shadow.bias = -0.002
    shadow.camera.near = 0.1
    shadow.camera.far = Math.max(light.distance, 20)
    shadow.camera.updateProjectionMatrix()
  }

  private parentOrSelected(parentId?: string | null): EditorNode {
    const requested = parentId ? this.nodes.get(parentId) : undefined
    if (requested) return requested
    const selected = this.selected()
    if (selected) return selected
    const root = this.nodes.get(this.rootId)
    if (!root) throw new Error('Scene root is missing.')
    return root
  }

  private spawnPoint(lift: number): THREE.Vector3 {
    const target = this.starter?.ctx.modules.orbitControls.controls.target
    const point = target ? target.clone() : new THREE.Vector3()
    point.y = this.groundY + lift
    return point
  }

  private createGeometryResource(type: GeometryType, params: Record<string, number>, name?: string): GeometryResource {
    const paramsWithDefaults = { ...defaultParams(type), ...params }
    const resource: GeometryResource = {
      id: `geo${this.idCounter++}`,
      name: this.uniqueResourceName(name ?? geometryEntry(type).label, this.geometries),
      type,
      params: paramsWithDefaults,
      geometry: null,
      defaults: { type, params: { ...paramsWithDefaults } },
    }
    for (const spec of geometryEntry(type).params) {
      resource.params[spec.key] = clampParam(type, spec.key, resource.params[spec.key] ?? spec.default)
    }
    resource.defaults.params = { ...resource.params }
    resource.geometry = buildGeometry(type, resource.params)
    this.geometries.set(resource.id, resource)
    return resource
  }

  private createMaterialResource(name: string, source: string, flags: MaterialFlags): MaterialResource {
    const unique = this.uniqueResourceName(name, this.materials)
    const resource: MaterialResource = {
      id: `mat${this.idCounter++}`,
      name: unique,
      source,
      side: flags.side,
      transparent: flags.transparent,
      wireframe: flags.wireframe,
      material: null,
      error: null,
      defaults: {
        name: unique,
        source,
        side: flags.side,
        transparent: flags.transparent,
        wireframe: flags.wireframe,
      },
    }
    this.materials.set(resource.id, resource)
    return resource
  }

  private rebuildGeometry(geometryId: string): void {
    const resource = this.geometries.get(geometryId)
    if (!resource) return
    const next = buildGeometry(resource.type, resource.params)
    const previous = resource.geometry
    resource.geometry = next
    for (const node of this.usersOfGeometry(geometryId)) {
      if (node.object instanceof THREE.Mesh) node.object.geometry = next
    }
    if (previous && previous !== next) previous.dispose()
  }

  private flagsOf(resource: MaterialResource): MaterialFlags {
    return {
      side: resource.side,
      transparent: resource.transparent,
      wireframe: resource.wireframe,
    }
  }

  private componentNames(): Set<string> {
    return new Set([...this.components.values()].map((resource) => resource.name))
  }

  private resourceByConstructor(ctor: Object3DBehaviourConstructor): ComponentResource | undefined {
    for (const resource of this.components.values()) {
      if (resource.ctor === ctor) return resource
    }
    return undefined
  }

  private trackInstance(node: EditorNode, resource: ComponentResource, behaviour: Object3DBehaviour): ComponentInstance {
    const instance: ComponentInstance = {
      id: `beh${this.idCounter++}`,
      name: resource.name,
      resourceId: resource.id,
      nodeId: node.id,
      behaviour,
    }
    this.componentInstances.set(instance.id, instance)
    node.componentIds.push(instance.id)
    return instance
  }

  private adoptComponents(node: EditorNode): void {
    let list: Object3DBehaviour[] = []
    try {
      list = getComponents(node.object)
    } catch {
      return
    }
    for (const behaviour of list) {
      const ctor = behaviour.constructor as Object3DBehaviourConstructor
      let resource = this.resourceByConstructor(ctor)
      if (!resource) {
        const name = this.uniqueComponentName(ctor.name || 'Component')
        resource = {
          id: `cmp${this.idCounter++}`,
          name,
          source: `// ${name} was already attached to an object.\n`,
          builtin: false,
          ctor,
          error: null,
        }
        this.components.set(resource.id, resource)
      }
      this.trackInstance(node, resource, behaviour)
    }
  }

  private uniqueComponentName(raw: string): string {
    return uniqueIdentifier(raw, this.componentNames())
  }

  private retargetInstances(resource: ComponentResource): void {
    for (const instance of this.componentInstances.values()) {
      if (instance.resourceId !== resource.id) continue
      const node = this.nodes.get(instance.nodeId)
      if (!node) continue
      const fields = parameterFields(instance.behaviour)
      const enabled = instance.behaviour.enabled
      destroy(instance.behaviour)
      instance.behaviour = this.spawnBehaviour(node, resource, fields)
      instance.name = resource.name
      if (!enabled) instance.behaviour.disable()
    }
  }

  private forgetNodeComponents(nodeId: string): void {
    const node = this.nodes.get(nodeId)
    if (!node) return
    for (const instanceId of node.componentIds) this.componentInstances.delete(instanceId)
    node.componentIds = []
  }

  private spawnBehaviour(
    node: EditorNode,
    resource: ComponentResource,
    fields?: Record<string, number | string | boolean>,
  ): Object3DBehaviour {
    const seeded = fields && Object.keys(fields).length > 0 && resource.ctor.length > 0
    const behaviour = seeded
      ? addComponent(node.object, resource.ctor, fields)
      : addComponent(node.object, resource.ctor)
    if (fields) applyParameters(behaviour, fields)
    return behaviour
  }

  private lightOf(id: string): THREE.Light | null {
    const node = this.nodes.get(id)
    return node?.object instanceof THREE.Light ? node.object : null
  }

  private registerTree(object: THREE.Object3D, parentId: string | null, imported: boolean, isRoot = false): string {
    const kind = kindOf(object)
    if (!kind) return ''
    const id = `node${this.idCounter++}`
    const name = object.name || this.uniqueName(NODE_LABEL[kind])
    object.name = name
    object.userData.editorId = id
    const node: EditorNode = {
      id,
      name,
      kind,
      object,
      parentId,
      childIds: [],
      imported,
      isRoot,
      geometryId: null,
      materialId: null,
      componentIds: [],
      instancePath: null,
      instanceOwnerId: null,
      defaults: this.defaultsFrom(object),
    }
    this.nodes.set(id, node)
    if (parentId) this.nodes.get(parentId)?.childIds.push(id)
    for (const child of [...object.children]) {
      if (child.userData.editorHidden) continue
      if ((child as THREE.Camera).isCamera) continue
      this.registerTree(child, id, true)
    }
    this.adoptComponents(node)
    this.attachIcon(node)
    this.captureDefaults(node)
    return id
  }

  private addNode(object: THREE.Object3D, parentId: string, kind: NodeKind, imported: boolean): EditorNode {
    const id = `node${this.idCounter++}`
    object.userData.editorId = id
    object.userData.editorKind = kind
    const node: EditorNode = {
      id,
      name: object.name,
      kind,
      object,
      parentId,
      childIds: [],
      imported,
      isRoot: false,
      geometryId: null,
      materialId: null,
      componentIds: [],
      instancePath: null,
      instanceOwnerId: null,
      defaults: this.defaultsFrom(object),
    }
    this.nodes.set(id, node)
    this.nodes.get(parentId)?.childIds.push(id)
    this.attachIcon(node)
    if (kind === 'Camera3D') this.attachCameraChrome(node)
    this.captureDefaults(node)
    this.touchScene()
    return node
  }

  private cloneNode(node: EditorNode, parentId: string, ownerId: string | null): EditorNode {
    const object = node.object.clone(false)
    object.name = this.uniqueName(node.name)
    const parent = this.nodes.get(parentId)
    parent?.object.add(object)
    const copy = this.addNode(object, parentId, node.kind, node.imported)
    copy.instancePath = node.instancePath
    copy.instanceOwnerId = ownerId
    copy.geometryId = node.geometryId
    copy.materialId = node.materialId
    if (copy.geometryId) {
      const geometry = this.geometries.get(copy.geometryId)?.geometry
      if (geometry && object instanceof THREE.Mesh) object.geometry = geometry
    }
    if (copy.materialId) {
      const material = this.materials.get(copy.materialId)?.material
      if (material && object instanceof THREE.Mesh) object.material = material
    }
    if (!copy.geometryId && object instanceof THREE.Mesh) object.geometry = object.geometry.clone()
    const childOwner = node.instancePath ? copy.id : ownerId
    for (const childId of node.childIds) {
      const child = this.nodes.get(childId)
      if (child) this.cloneNode(child, copy.id, childOwner)
    }
    for (const componentId of node.componentIds) {
      const instance = this.componentInstances.get(componentId)
      if (instance) this.attachComponent(instance.resourceId, copy.id)
    }
    return copy
  }

  private collectIds(node: EditorNode): string[] {
    const ids = [node.id]
    for (const childId of node.childIds) {
      const child = this.nodes.get(childId)
      if (child) ids.push(...this.collectIds(child))
    }
    return ids
  }

  private isAncestor(id: string, possibleChild: string): boolean {
    let current = this.nodes.get(possibleChild)
    while (current) {
      if (current.id === id) return true
      current = current.parentId ? this.nodes.get(current.parentId) : undefined
    }
    return false
  }

  private dropOrphanResources(): void {
    for (const [id, resource] of this.geometries) {
      if (this.usersOfGeometry(id).length === 0) {
        resource.geometry?.dispose()
        this.geometries.delete(id)
      }
    }
    for (const [id, resource] of this.materials) {
      if (this.usersOfMaterial(id).length === 0) {
        resource.material?.dispose()
        this.materials.delete(id)
      }
    }
  }

  private attachIcon(node: EditorNode): void {
    const kind = iconKind(node.kind)
    if (!kind) return
    attachLightIcon(node.object, kind)
    if (kind === 'directional' || kind === 'spot') attachLightArrow(node.object)
    if (kind === 'spot') attachSpotCone(node.object)
  }

  private updateLightIcons(): void {
    const camera = this.camera
    const visible = this.chromeVisible && !this.playing
    const height = this.starter?.ctx.renderer.domElement.clientHeight || 800
    const fov = camera instanceof THREE.PerspectiveCamera ? THREE.MathUtils.degToRad(camera.fov) : 1
    for (const node of this.nodes.values()) {
      const show = visible && node.object.visible
      const arrow = node.object.getObjectByName('LightArrow')
      if (arrow) arrow.visible = show
      const cone = node.object.getObjectByName('SpotCone')
      if (cone) {
        cone.visible = show
        if (show) updateSpotCone(node.object)
      }
      const icon = node.object.getObjectByName('LightIcon') ?? node.object.getObjectByName('CameraIcon')
      if (!icon) continue
      icon.visible = show && this.activeCameraId() !== node.id
      if (!icon.visible || !camera) continue
      node.object.getWorldPosition(this.tmp)
      const distance = Math.max(camera.position.distanceTo(this.tmp), 0.5)
      const world = camera instanceof THREE.OrthographicCamera
        ? (Math.abs(camera.top - camera.bottom) / Math.max(camera.zoom, 0.001)) * (64 / Math.max(height, 1))
        : 2 * Math.tan(fov / 2) * distance * (64 / Math.max(height, 1))
      icon.scale.set(world, world, 1)
    }
  }

  private measureBounds(object: THREE.Object3D, target: THREE.Box3): THREE.Box3 {
    const hidden: { object: THREE.Object3D, visible: boolean }[] = []
    for (const name of ['LightIcon', 'LightArrow', 'CameraIcon', 'SpotCone']) {
      const child = object.getObjectByName(name)
      if (!child) continue
      hidden.push({ object: child, visible: child.visible })
      child.visible = false
    }
    // The cone is real geometry. Hiding it does not keep it out of the bounds.
    const cone = object.getObjectByName('SpotCone')
    cone?.removeFromParent()
    target.setFromObject(object)
    if (cone) object.add(cone)
    for (const entry of hidden) entry.object.visible = entry.visible
    return target
  }

  private releaseLights(object: THREE.Object3D): void {
    const lights: THREE.Object3D[] = []
    object.traverse((child) => {
      if (child.userData.lightIcon || child.userData.lightArrow || child.userData.spotCone) return
      if (child.getObjectByName('LightIcon') || child.getObjectByName('LightArrow') || child.getObjectByName('SpotCone') || child instanceof THREE.DirectionalLight || child instanceof THREE.SpotLight) {
        lights.push(child)
      }
    })
    for (const light of lights) {
      if (light instanceof THREE.DirectionalLight || light instanceof THREE.SpotLight) light.target.removeFromParent()
      disposeLightIcon(light)
      disposeLightArrow(light)
      disposeSpotCone(light)
    }
  }

  private captureDefaults(node: EditorNode): void {
    node.defaults = this.defaultsFrom(node.object)
  }

  private defaultsFrom(object: THREE.Object3D): NodeDefaults {
    const cast = 'castShadow' in object && typeof (object as { castShadow?: unknown }).castShadow === 'boolean'
      ? (object as { castShadow: boolean }).castShadow
      : null
    return {
      position: [object.position.x, object.position.y, object.position.z],
      rotation: [
        THREE.MathUtils.radToDeg(object.rotation.x),
        THREE.MathUtils.radToDeg(object.rotation.y),
        THREE.MathUtils.radToDeg(object.rotation.z),
      ],
      scale: [object.scale.x, object.scale.y, object.scale.z],
      visible: object.visible,
      castShadow: cast,
      receiveShadow: object instanceof THREE.Mesh ? object.receiveShadow : null,
      light: lightDefaultsFrom(object),
      camera: copyStoredCamera(object),
    }
  }

  private ensureLookAt(light: THREE.DirectionalLight | THREE.SpotLight): LookAtConfig {
    const current = light.userData.lookAt as LookAtConfig | undefined
    if (current) return current
    const created: LookAtConfig = { enabled: false, x: 0, y: 0, z: 0 }
    light.userData.lookAt = created
    return created
  }

  private attachCameraChrome(node: EditorNode): void {
    const settings = readCameraSettings(node.object) ?? defaultCameraSettings()
    node.object.userData.camera = settings
    attachCameraIcon(node.object)
    this.rebuildCameraHelper(node)
    this.applyNodeCamera(node)
  }

  private rebuildCameraHelper(node: EditorNode): void {
    this.disposeCameraHelper(node.id)
    if (!(node.object instanceof THREE.Camera) || !this.scene) return
    const helper = new THREE.CameraHelper(node.object)
    helper.setColors(
      new THREE.Color('#6ec8e0'),
      new THREE.Color('#9fd8ea'),
      new THREE.Color('#7dce7a'),
      new THREE.Color('#f0d264'),
      new THREE.Color('#d0d0d0'),
    )
    helper.userData.editorHidden = true
    helper.name = 'CameraHelper'
    helper.frustumCulled = false
    helper.raycast = () => {}
    this.scene.add(helper)
    this.cameraHelpers.set(node.id, helper)
    helper.update()
  }

  private disposeCameraHelper(id: string): void {
    const helper = this.cameraHelpers.get(id)
    if (!helper) return
    helper.geometry.dispose()
    const material = helper.material
    if (!Array.isArray(material)) material.dispose()
    helper.removeFromParent()
    this.cameraHelpers.delete(id)
  }

  private releaseCameras(object: THREE.Object3D): void {
    object.traverse((child) => {
      const id = child.userData.editorId as string | undefined
      if (id) this.disposeCameraHelper(id)
      disposeCameraIcon(child)
    })
  }

  private updateCameras(): void {
    const aspect = this.viewportAspect()
    const viewing = this.activeCameraId()
    for (const node of this.nodes.values()) {
      if (node.kind !== 'Camera3D') continue
      this.applyNodeCamera(node, aspect, viewing === node.id)
      const helper = this.cameraHelpers.get(node.id)
      if (!helper) continue
      const show = this.chromeVisible && !this.playing && node.object.visible && viewing !== node.id
      helper.visible = show
      if (show) helper.update()
    }
  }

  private applyNodeCamera(node: EditorNode, aspect = this.viewportAspect(), viewing = this.activeCameraId() === node.id): void {
    const settings = readCameraSettings(node.object)
    if (!settings) return
    if (!(node.object instanceof THREE.PerspectiveCamera) && !(node.object instanceof THREE.OrthographicCamera)) return
    applyCameraSettings(node.object, settings, aspect, viewing && settings.syncAspect)
  }

  private ensureCameraClass(node: EditorNode): void {
    const settings = readCameraSettings(node.object)
    if (!settings) return
    const matches = settings.projection === 'orthographic'
      ? node.object instanceof THREE.OrthographicCamera
      : node.object instanceof THREE.PerspectiveCamera
    if (!matches) this.replaceCameraObject(node, settings)
  }

  private replaceCameraObject(node: EditorNode, settings: CameraSettings): void {
    const previous = node.object
    const next = createCameraObject(settings)
    next.name = previous.name
    next.visible = previous.visible
    next.position.copy(previous.position)
    next.quaternion.copy(previous.quaternion)
    next.scale.copy(previous.scale)
    next.rotation.order = previous.rotation.order
    next.userData = previous.userData
    next.userData.camera = settings
    const parent = previous.parent
    const index = parent ? parent.children.indexOf(previous) : -1
    for (const child of [...previous.children]) next.add(child)
    if (parent) {
      parent.remove(previous)
      parent.add(next)
      if (index >= 0) {
        const children = parent.children
        const from = children.indexOf(next)
        if (from >= 0 && from !== index) {
          children.splice(from, 1)
          children.splice(Math.min(index, children.length), 0, next)
        }
      }
    }
    const wasGizmo = this.controls?.object === previous
    node.object = next
    this.retargetBehaviours(node)
    this.rebuildCameraHelper(node)
    this.applyNodeCamera(node)
    if (wasGizmo) this.controls?.attach(next)
    next.updateMatrixWorld(true)
    this.syncViewCamera()
  }

  private retargetBehaviours(node: EditorNode): void {
    for (const instanceId of [...node.componentIds]) {
      const instance = this.componentInstances.get(instanceId)
      const resource = instance ? this.components.get(instance.resourceId) : undefined
      if (!instance || !resource) continue
      const fields = parameterFields(instance.behaviour)
      const enabled = instance.behaviour.enabled
      destroy(instance.behaviour)
      instance.behaviour = this.spawnBehaviour(node, resource, fields)
      instance.name = resource.name
      if (!enabled) instance.behaviour.disable()
    }
  }

  private activeCameraId(): string | null {
    if (this.playing) return this.findCurrentCameraId()
    if (this.previewCameraId && this.nodes.get(this.previewCameraId)?.kind === 'Camera3D') return this.previewCameraId
    return null
  }

  private findCurrentCameraId(): string | null {
    const found: string[] = []
    const walk = (id: string): void => {
      const node = this.nodes.get(id)
      if (!node) return
      const settings = readCameraSettings(node.object)
      if (node.kind === 'Camera3D' && settings?.current) found.push(node.id)
      for (const childId of node.childIds) walk(childId)
    }
    if (this.rootId) walk(this.rootId)
    return found.at(-1) ?? null
  }

  private enforceSingleCurrent(keepId?: string): void {
    const keep = keepId ?? this.findCurrentCameraId()
    for (const node of this.nodes.values()) {
      const settings = readCameraSettings(node.object)
      if (!settings || node.kind !== 'Camera3D') continue
      settings.current = node.id === keep
    }
  }

  private syncViewCamera(): void {
    const starter = this.starter
    const editor = this.editorCamera
    if (!starter || !editor) return
    const id = this.activeCameraId()
    const node = id ? this.nodes.get(id) : undefined
    const sceneCamera = node?.object
    const next = sceneCamera instanceof THREE.PerspectiveCamera || sceneCamera instanceof THREE.OrthographicCamera
      ? sceneCamera
      : editor
    const changed = this.camera !== next
    if (starter.ctx.camera !== next) {
      if (next instanceof THREE.OrthographicCamera) starter.ctx.ortho = next
      else starter.ctx.camera = next
    }
    this.camera = next
    if (this.controls && this.controls.camera !== next) this.controls.camera = next
    if (!changed) return
    const orbit = starter.ctx.modules.orbitControls.controls
    if (!this.orbitAllowed()) orbit.enabled = false
    else if (!this.controls?.dragging) orbit.enabled = true
  }

  private orbitAllowed(): boolean {
    return this.activeCameraId() === null
  }

  private viewportAspect(): number {
    const canvas = this.starter?.ctx.renderer.domElement
    if (!canvas || canvas.clientHeight < 1 || canvas.clientWidth < 1) return 1
    return canvas.clientWidth / canvas.clientHeight
  }

  private clearDuplicatedCurrent(node: EditorNode): void {
    const settings = readCameraSettings(node.object)
    if (settings?.current) {
      settings.current = false
      this.captureDefaults(node)
    }
    for (const childId of node.childIds) {
      const child = this.nodes.get(childId)
      if (child) this.clearDuplicatedCurrent(child)
    }
  }

  private cameraRecord(node: EditorNode): CameraSettings | null {
    if (node.kind !== 'Camera3D') return null
    const settings = readCameraSettings(node.object)
    return settings ? copyCameraSettings(settings) : copyCameraSettings(defaultCameraSettings())
  }

  private uniqueName(base: string): string {
    const names = new Set([...this.nodes.values()].map((node) => node.name))
    if (!names.has(base)) return base
    let index = 2
    while (names.has(`${base}${index}`)) index += 1
    return `${base}${index}`
  }

  private copyNode(id: string): EditorNode | null {
    const node = this.nodes.get(id)
    if (!node || node.isRoot || !node.parentId) return null
    const copy = this.cloneNode(node, node.parentId, node.instanceOwnerId)
    if ((copy.object as THREE.Mesh).isMesh) copy.object.position.x += 0.45
    this.clearDuplicatedCurrent(copy)
    this.captureDefaults(copy)
    this.log(`Duplicated ${node.name} as ${copy.name}`)
    return copy
  }

  private pruneSelection(fallback: string): void {
    const remaining = this.selectedIds.filter((id) => this.nodes.has(id))
    if (remaining.length === this.selectedIds.length) return
    if (remaining.length > 0) this.setSelection(remaining)
    else this.select(this.nodes.has(fallback) ? fallback : this.rootId)
  }

  private syncOrbitMouse(): void {
    const orbit = this.starter?.ctx.modules.orbitControls.controls
    if (!orbit) return
    if (this.tool === 'select') {
      // The rectangle uses the left button. Right-drag orbits, and the wheel still zooms.
      orbit.mouseButtons.LEFT = null
      orbit.mouseButtons.MIDDLE = THREE.MOUSE.PAN
      orbit.mouseButtons.RIGHT = THREE.MOUSE.ROTATE
      return
    }
    orbit.mouseButtons.LEFT = THREE.MOUSE.ROTATE
    orbit.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY
    orbit.mouseButtons.RIGHT = THREE.MOUSE.PAN
  }

  private captureSelectionDrag(): void {
    const primaryId = this.selectedId
    const primary = primaryId ? this.nodes.get(primaryId) : undefined
    if (!primary || primary.isRoot || !this.scene) {
      this.selectionDrag = null
      return
    }
    const roots = this.selectionRoots(this.selectedIds)
    const ids = new Set(roots)
    ids.add(primary.id)
    if (ids.size < 2) {
      this.selectionDrag = null
      return
    }
    this.scene.updateMatrixWorld(true)
    const entries: { id: string, world: THREE.Matrix4, position: THREE.Vector3, root: boolean }[] = []
    for (const id of ids) {
      const node = this.nodes.get(id)
      if (!node || node.isRoot) continue
      const world = node.object.matrixWorld.clone()
      entries.push({
        id,
        world,
        position: new THREE.Vector3().setFromMatrixPosition(world),
        root: roots.includes(id),
      })
    }
    this.selectionDrag = entries.length > 1 ? entries : null
  }

  private applySelectionDrag(): void {
    const drag = this.selectionDrag
    const primaryId = this.selectedId
    if (!drag || !primaryId) return
    const primary = this.nodes.get(primaryId)
    const start = drag.find((entry) => entry.id === primaryId)
    if (!primary || !start) return
    if (this.tool === 'translate') this.applyTranslationDrag(primary.object, start, drag)
    else this.applyMatrixDrag(primary.object, start, drag)
  }

  private applyTranslationDrag(
    primary: THREE.Object3D,
    start: { id: string, position: THREE.Vector3, root: boolean },
    drag: { id: string, position: THREE.Vector3, root: boolean }[],
  ): void {
    primary.getWorldPosition(this.dragPos)
    this.dragPos.sub(start.position)
    const ordered = drag
      .filter((entry) => entry.root && entry.id !== start.id)
      .sort((a, b) => this.depthOf(a.id) - this.depthOf(b.id))
    for (const entry of ordered) {
      const node = this.nodes.get(entry.id)
      if (!node) continue
      this.dragTargetPos.copy(entry.position).add(this.dragPos)
      this.writeWorldPosition(node.object, this.dragTargetPos)
    }
    if (!start.root) {
      this.dragTargetPos.copy(start.position).add(this.dragPos)
      this.writeWorldPosition(primary, this.dragTargetPos)
    }
  }

  private applyMatrixDrag(
    primary: THREE.Object3D,
    start: { id: string, world: THREE.Matrix4, root: boolean },
    drag: { id: string, world: THREE.Matrix4, root: boolean }[],
  ): void {
    primary.updateWorldMatrix(true, false)
    if (Math.abs(start.world.determinant()) < 1e-8) return
    this.dragInverse.copy(start.world).invert()
    this.dragDelta.multiplyMatrices(primary.matrixWorld, this.dragInverse)
    const ordered = drag
      .filter((entry) => entry.root && entry.id !== start.id)
      .sort((a, b) => this.depthOf(a.id) - this.depthOf(b.id))
    for (const entry of ordered) {
      const node = this.nodes.get(entry.id)
      if (!node) continue
      this.dragWorld.multiplyMatrices(this.dragDelta, entry.world)
      this.writeWorldMatrix(node.object, this.dragWorld)
    }
    if (!start.root) {
      this.dragWorld.multiplyMatrices(this.dragDelta, start.world)
      this.writeWorldMatrix(primary, this.dragWorld)
    }
  }

  private writeWorldPosition(object: THREE.Object3D, worldPosition: THREE.Vector3): void {
    const parent = object.parent
    if (!parent) {
      object.position.copy(worldPosition)
    } else {
      parent.updateWorldMatrix(true, false)
      object.position.copy(worldPosition)
      parent.worldToLocal(object.position)
    }
    object.updateMatrixWorld(true)
  }

  private writeWorldMatrix(object: THREE.Object3D, world: THREE.Matrix4): void {
    const parent = object.parent
    if (!parent) {
      world.decompose(object.position, object.quaternion, object.scale)
    } else {
      parent.updateWorldMatrix(true, false)
      this.dragInverse.copy(parent.matrixWorld).invert()
      this.dragLocal.multiplyMatrices(this.dragInverse, world)
      this.dragLocal.decompose(object.position, object.quaternion, object.scale)
    }
    object.updateMatrixWorld(true)
  }

  private depthOf(id: string): number {
    let depth = 0
    let parentId = this.nodes.get(id)?.parentId ?? null
    while (parentId) {
      depth += 1
      parentId = this.nodes.get(parentId)?.parentId ?? null
    }
    return depth
  }

  private ensureSelectionHelpers(count: number): void {
    const scene = this.scene
    if (!scene) return
    while (this.selectionHelpers.length < count) {
      const box = new THREE.Box3()
      const helper = new THREE.Box3Helper(box, 0x569eff)
      helper.userData.editorHidden = true
      helper.visible = false
      helper.frustumCulled = false
      helper.renderOrder = 999
      helper.raycast = () => {}
      scene.add(helper)
      this.selectionHelpers.push(helper)
      this.selectionBoxes.push(box)
    }
  }

  private paintSelectionHelper(helper: THREE.Box3Helper, active: boolean): void {
    const materials = Array.isArray(helper.material) ? helper.material : [helper.material]
    const color = active ? 0x569eff : 0x8eacd4
    for (const material of materials) {
      if (!(material instanceof THREE.LineBasicMaterial)) continue
      material.color.setHex(color)
      material.depthTest = false
      material.transparent = true
    }
  }

  private isDrawn(object: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = object
    while (current) {
      if (!current.visible) return false
      current = current.parent
    }
    return true
  }

  private hitsMarquee(
    node: EditorNode,
    left: number,
    top: number,
    right: number,
    bottom: number,
    width: number,
    height: number,
  ): boolean {
    if (!this.isDrawn(node.object)) return false
    node.object.updateWorldMatrix(true, false)
    const mesh = node.object instanceof THREE.Mesh ? node.object : null
    const geometry = mesh?.geometry
    if (geometry) {
      if (!geometry.boundingBox) geometry.computeBoundingBox()
      if (geometry.boundingBox && !geometry.boundingBox.isEmpty()) {
        this.marqueeBounds.copy(geometry.boundingBox).applyMatrix4(node.object.matrixWorld)
        if (!this.marqueeBounds.isEmpty()) {
          return this.boundsHitMarquee(this.marqueeBounds, left, top, right, bottom, width, height)
        }
      }
    }
    node.object.getWorldPosition(this.marqueePoint)
    return this.pointHitsMarquee(this.marqueePoint, left, top, right, bottom, width, height)
  }

  private boundsHitMarquee(
    box: THREE.Box3,
    left: number,
    top: number,
    right: number,
    bottom: number,
    width: number,
    height: number,
  ): boolean {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    let any = false
    for (let corner = 0; corner < 8; corner += 1) {
      this.marqueePoint.set(
        corner & 1 ? box.max.x : box.min.x,
        corner & 2 ? box.max.y : box.min.y,
        corner & 4 ? box.max.z : box.min.z,
      )
      if (!this.projectCanvas(this.marqueePoint, width, height)) continue
      any = true
      minX = Math.min(minX, this.marqueePoint.x)
      maxX = Math.max(maxX, this.marqueePoint.x)
      minY = Math.min(minY, this.marqueePoint.y)
      maxY = Math.max(maxY, this.marqueePoint.y)
    }
    if (!any) return false
    return minX <= right && maxX >= left && minY <= bottom && maxY >= top
  }

  private pointHitsMarquee(
    world: THREE.Vector3,
    left: number,
    top: number,
    right: number,
    bottom: number,
    width: number,
    height: number,
  ): boolean {
    this.marqueePoint.copy(world)
    if (!this.projectCanvas(this.marqueePoint, width, height)) return false
    const slop = 16
    return this.marqueePoint.x >= left - slop
      && this.marqueePoint.x <= right + slop
      && this.marqueePoint.y >= top - slop
      && this.marqueePoint.y <= bottom + slop
  }

  /** Writes canvas pixels into `marqueePoint`. False when the point is behind the camera. */
  private projectCanvas(world: THREE.Vector3, width: number, height: number): boolean {
    const camera = this.camera
    if (!camera || width < 1 || height < 1) return false
    this.marqueeView.copy(world).applyMatrix4(camera.matrixWorldInverse)
    if (this.marqueeView.z >= -1e-4) return false
    this.marqueePoint.copy(world).project(camera)
    this.marqueePoint.x = (this.marqueePoint.x * 0.5 + 0.5) * width
    this.marqueePoint.y = (-this.marqueePoint.y * 0.5 + 0.5) * height
    return Number.isFinite(this.marqueePoint.x) && Number.isFinite(this.marqueePoint.y)
  }

  private uniqueResourceName(base: string, map: Map<string, { id: string, name: string }>, ignoreId?: string): string {
    const names = new Set([...map.values()].filter((item) => item.id !== ignoreId).map((item) => item.name))
    if (!names.has(base)) return base
    let index = 2
    while (names.has(`${base}${index}`)) index += 1
    return `${base}${index}`
  }
}

function geometrySnapshot(geometry: THREE.BufferGeometry): { type: GeometryType, params: Record<string, number> } | null {
  const entry = GEOMETRY_CATALOG.find((item) => item.label === geometry.type)
  if (!entry) return null
  const parameters = (geometry as THREE.BufferGeometry & { parameters?: Record<string, unknown> }).parameters
  if (!parameters) return null
  const params = defaultParams(entry.type)
  for (const spec of entry.params) {
    const value = parameters[spec.key]
    if (typeof value === 'number' && Number.isFinite(value)) params[spec.key] = value
  }
  return { type: entry.type, params }
}

function materialSnapshot(material: THREE.Material): { source: string, side: MaterialSide, transparent: boolean, wireframe: boolean } | null {
  const stored = material.userData.tslSource
  const source = typeof stored === 'string' && stored.trim()
    ? stored
    : material instanceof THREE.MeshStandardNodeMaterial
      ? `material.colorNode = color('#${material.color.getHexString()}')
material.roughnessNode = float(${material.roughness})
material.metalnessNode = float(${material.metalness})
`
      : null
  if (!source) return null
  const side: MaterialSide = material.side === THREE.BackSide
    ? 'back'
    : material.side === THREE.DoubleSide
      ? 'double'
      : 'front'
  const wireframe = 'wireframe' in material && Boolean((material as { wireframe?: boolean }).wireframe)
  return { source, side, transparent: material.transparent, wireframe }
}

function booleanFlag(object: THREE.Object3D, key: 'castShadow' | 'receiveShadow'): boolean {
  const value = (object as unknown as Record<string, unknown>)[key]
  return typeof value === 'boolean' ? value : false
}

function copyStoredCamera(object: THREE.Object3D): CameraSettings | null {
  const settings = readCameraSettings(object)
  return settings ? copyCameraSettings(settings) : null
}

function copyLookAt(value: LookAtConfig | undefined): LookAtConfig | null {
  if (!value) return null
  return { enabled: value.enabled, x: value.x, y: value.y, z: value.z }
}

function lightDefaultsFrom(object: THREE.Object3D): LightDefaults | null {
  if (!(object instanceof THREE.Light)) return null
  if (object instanceof THREE.HemisphereLight) {
    return {
      color: `#${object.color.getHexString()}`,
      ground: `#${object.groundColor.getHexString()}`,
      intensity: object.intensity,
      range: null,
      angle: null,
      penumbra: null,
      lookAt: null,
    }
  }
  if (!(object instanceof THREE.DirectionalLight) && !(object instanceof THREE.SpotLight) && !(object instanceof THREE.PointLight)) {
    return null
  }
  return {
    color: `#${object.color.getHexString()}`,
    ground: null,
    intensity: object.intensity,
    range: object instanceof THREE.PointLight || object instanceof THREE.SpotLight ? object.distance : null,
    angle: object instanceof THREE.SpotLight ? THREE.MathUtils.radToDeg(object.angle) : null,
    penumbra: object instanceof THREE.SpotLight ? object.penumbra : null,
    lookAt: copyLookAt(object.userData.lookAt as LookAtConfig | undefined),
  }
}

function iconKind(kind: NodeKind): LightIconKind | null {
  if (kind === 'DirectionalLight3D') return 'directional'
  if (kind === 'OmniLight3D') return 'omni'
  if (kind === 'SpotLight3D') return 'spot'
  if (kind === 'HemisphereLight3D') return 'hemisphere'
  return null
}

function shadowTypeName(type: THREE.ShadowMapType | undefined): ShadowTypeName {
  if (type === THREE.BasicShadowMap) return 'basic'
  if (type === THREE.VSMShadowMap) return 'vsm'
  return 'pcf'
}

function kindOf(object: THREE.Object3D): NodeKind | null {
  const tagged = object.userData.editorKind as NodeKind | undefined
  if (tagged) return tagged
  if ((object as THREE.Mesh).isMesh) return 'MeshInstance3D'
  if ((object as THREE.Camera).isCamera && !(object as THREE.Light).isLight) return 'Camera3D'
  if ((object as THREE.DirectionalLight).isDirectionalLight) return 'DirectionalLight3D'
  if ((object as THREE.SpotLight).isSpotLight) return 'SpotLight3D'
  if ((object as THREE.HemisphereLight).isHemisphereLight) return 'HemisphereLight3D'
  if ((object as THREE.PointLight).isPointLight) return 'OmniLight3D'
  if ((object as THREE.Group).isGroup || object.type === 'Object3D' || object.type === 'Group') return 'Node3D'
  return null
}

export const NODE_TYPES: { kind: NodeKind, label: string, group: string, description: string, inherits: string }[] = [
  {
    kind: 'Node3D',
    label: 'Node',
    group: 'Node',
    description: 'An empty node. Use it to group meshes, lights, and other nodes. It has a transform and nothing else.',
    inherits: 'Node',
  },
  {
    kind: 'MeshInstance3D',
    label: 'MeshInstance',
    group: 'Mesh',
    description: 'A mesh drawn with a geometry and a TSL material.',
    inherits: 'MeshInstance < Node',
  },
  {
    kind: 'Camera3D',
    label: 'Camera',
    group: 'Camera',
    description: 'A viewpoint. Switch between perspective and orthographic. The inspector edits the full lens: field of view, focal length, film, frustum planes, zoom, clip distances, and view offset. Mark one camera Current to use it while playing.',
    inherits: 'Camera < Node',
  },
  {
    kind: 'DirectionalLight3D',
    label: 'DirectionalLight',
    group: 'Light',
    description: 'Parallel rays from a distant source. Aim it with Look at, or turn Look at off and rotate the node.',
    inherits: 'DirectionalLight < Light < Node',
  },
  {
    kind: 'OmniLight3D',
    label: 'OmniLight',
    group: 'Light',
    description: 'A point light that emits in every direction, out to a finite range.',
    inherits: 'OmniLight < Light < Node',
  },
  {
    kind: 'SpotLight3D',
    label: 'SpotLight',
    group: 'Light',
    description: 'A cone of light. Aim it with Look at, or turn Look at off and rotate the node.',
    inherits: 'SpotLight < Light < Node',
  },
  {
    kind: 'HemisphereLight3D',
    label: 'HemisphereLight',
    group: 'Light',
    description: 'Sky and ground colors used as soft ambient fill. It has no position.',
    inherits: 'HemisphereLight < Light < Node',
  },
]
