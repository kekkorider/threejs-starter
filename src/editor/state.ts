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
  buildGeometry,
  clampParam,
  defaultParams,
  geometryEntry,
  type GeometryType,
} from './geometry'
import { attachLightArrow, attachLightIcon, disposeLightArrow, disposeLightIcon, type LightIconKind } from './lightIcons'
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
  selectedId: string | null = null
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

  private attached = false
  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private grid: THREE.GridHelper | null = null
  private selectionHelper: THREE.Box3Helper | null = null
  private selectionBounds = new THREE.Box3()
  private readonly forward = new THREE.Vector3()
  private readonly tmp = new THREE.Vector3()
  private readonly tmpSize = new THREE.Vector3(0.5, 0.5, 0.5)
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

    this.selectionHelper = new THREE.Box3Helper(this.selectionBounds, 0x569eff)
    this.selectionHelper.userData.editorHidden = true
    this.selectionHelper.visible = false
    this.selectionHelper.raycast = () => {}
    scene.add(this.selectionHelper)

    this.controls = new TransformControls(camera, renderer.domElement)
    this.controls.setMode('translate')
    const helper = this.controls.getHelper()
    helper.userData.editorHidden = true
    scene.add(helper)
    this.controls.addEventListener('dragging-changed', (event) => {
      const dragging = Boolean((event as { value?: boolean }).value)
      starter.ctx.modules.orbitControls.controls.enabled = !dragging
    })

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
    return true
  }

  /** Hide the grid, gizmo, and selection box when the editor route is not showing. */
  setChromeVisible(visible: boolean): void {
    this.chromeVisible = visible
    this.applyGridVisibility()
    this.updateLightIcons()
    if (!this.controls) return
    if (!visible) {
      this.controls.detach()
      if (this.selectionHelper) this.selectionHelper.visible = false
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
  }

  setBackgroundIntensity(value: number): void {
    if (!this.scene || !Number.isFinite(value)) return
    this.scene.backgroundIntensity = Math.max(0, value)
  }

  setEnvironmentIntensity(value: number): void {
    if (!this.scene || !Number.isFinite(value)) return
    this.scene.environmentIntensity = Math.max(0, value)
  }

  setShadows(enabled: boolean): void {
    const shadow = this.starter?.ctx.renderer.shadowMap
    if (!shadow) return
    shadow.enabled = enabled
  }

  setShadowType(name: ShadowTypeName): void {
    const shadow = this.starter?.ctx.renderer.shadowMap
    if (!shadow) return
    shadow.type = SHADOW_TYPE[name]
  }

  setGridVisible(visible: boolean): void {
    this.gridVisible = visible
    this.applyGridVisibility()
  }

  setGridSize(value: number): void {
    if (!Number.isFinite(value)) return
    this.gridSize = Math.min(400, Math.max(1, value))
    this.rebuildGrid()
  }

  setGridDivisions(value: number): void {
    if (!Number.isFinite(value)) return
    this.gridDivisions = Math.min(200, Math.max(1, Math.round(value)))
    this.rebuildGrid()
  }

  setGridCenter(color: string): void {
    this.gridCenter = color
    this.rebuildGrid()
  }

  setGridColor(color: string): void {
    this.gridColor = color
    this.rebuildGrid()
  }

  setGridPosition(axis: 'x' | 'y' | 'z', value: number): void {
    if (!Number.isFinite(value)) return
    this.gridPosition[axis] = value
    this.applyGridPosition()
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
    }
  }

  selected(): EditorNode | null {
    if (!this.selectedId) return null
    return this.nodes.get(this.selectedId) ?? null
  }

  select(id: string | null): void {
    if (id && !this.nodes.has(id)) id = null
    this.selectedId = id
    this.syncGizmo()
    this.updateSelectionBox()
  }

  setTool(tool: ToolMode): void {
    this.tool = tool
    if (this.controls && tool !== 'select') this.controls.setMode(tool)
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
    const node = this.selected()
    const camera = this.camera
    const orbit = this.starter?.ctx.modules.orbitControls.controls
    if (!node || !camera || !orbit || node.isRoot) return

    const bounds = this.measureBounds(node.object, new THREE.Box3())
    const center = bounds.isEmpty()
      ? node.object.getWorldPosition(new THREE.Vector3())
      : bounds.getCenter(new THREE.Vector3())
    const size = bounds.isEmpty() ? 1.5 : Math.max(bounds.getSize(new THREE.Vector3()).length(), 0.8)
    const direction = camera.position.clone().sub(center)
    if (direction.lengthSq() < 1e-6) direction.set(1, 0.6, 1)
    direction.normalize().multiplyScalar(Math.max(size * 1.8, 2.5))
    camera.position.copy(center).add(direction)
    orbit.target.copy(center)
    camera.lookAt(center)
    orbit.update()
  }

  setView(which: 'persp' | 'top' | 'front' | 'right'): void {
    const camera = this.camera
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

  duplicate(id: string): EditorNode | null {
    const node = this.nodes.get(id)
    if (!node || node.isRoot || !node.parentId) return null
    const copy = this.cloneNode(node, node.parentId)
    if ((copy.object as THREE.Mesh).isMesh) copy.object.position.x += 0.45
    this.captureDefaults(copy)
    this.log(`Duplicated ${node.name} as ${copy.name}`)
    this.select(copy.id)
    return copy
  }

  deleteNode(id: string): void {
    const node = this.nodes.get(id)
    if (!node || node.isRoot) return
    const ids = this.collectIds(node)
    this.releaseLights(node.object)
    for (const childId of ids) this.forgetNodeComponents(childId)
    destroy(node.object)
    for (const childId of ids) this.nodes.delete(childId)
    const parent = node.parentId ? this.nodes.get(node.parentId) : undefined
    if (parent) parent.childIds = parent.childIds.filter((childId) => childId !== id)
    this.dropOrphanResources()
    if (this.selectedId && !this.nodes.has(this.selectedId)) this.select(parent?.id ?? this.rootId)
    this.log(`Removed ${node.name}`)
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
      return null
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      resource.error = message
      this.log(message, 'error')
      return message
    }
  }

  attachComponent(resourceId: string, nodeId: string): ComponentInstance | null {
    const resource = this.components.get(resourceId)
    const node = this.nodes.get(nodeId)
    if (!resource || !node) return null
    try {
      const behaviour = this.spawnBehaviour(node, resource)
      const instance = this.trackInstance(node, resource, behaviour)
      this.log(`Added ${resource.name} to ${node.name}`)
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
  }

  removeComponent(instanceId: string): void {
    const instance = this.componentInstances.get(instanceId)
    if (!instance) return
    const node = this.nodes.get(instance.nodeId)
    destroy(instance.behaviour)
    this.componentInstances.delete(instanceId)
    if (node) node.componentIds = node.componentIds.filter((id) => id !== instanceId)
    this.log(`Removed ${instance.name}${node ? ` from ${node.name}` : ''}`)
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
  }

  parametersOf(instanceId: string): ComponentParameter[] {
    const instance = this.componentInstances.get(instanceId)
    return instance ? readParameters(instance.behaviour) : []
  }

  setComponentParameter(instanceId: string, key: string, value: number | string | boolean): void {
    const instance = this.componentInstances.get(instanceId)
    if (!instance) return
    applyParameters(instance.behaviour, { [key]: value })
  }

  setComponentEnabled(instanceId: string, enabled: boolean): void {
    const instance = this.componentInstances.get(instanceId)
    if (!instance) return
    instance.behaviour.setEnabled(enabled)
  }

  rename(id: string, name: string): void {
    const node = this.nodes.get(id)
    const next = name.trim()
    if (!node || !next || node.isRoot) return
    node.name = next
    node.object.name = next
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
  }

  setPosition(id: string, axis: 'x' | 'y' | 'z', value: number): void {
    const node = this.nodes.get(id)
    if (!node || !Number.isFinite(value)) return
    node.object.position[axis] = value
  }

  setRotationDegrees(id: string, axis: 'x' | 'y' | 'z', degrees: number): void {
    const node = this.nodes.get(id)
    if (!node || !Number.isFinite(degrees)) return
    node.object.rotation[axis] = THREE.MathUtils.degToRad(degrees)
    this.syncLookAtFromRotation(node.object)
  }

  setScale(id: string, axis: 'x' | 'y' | 'z', value: number): void {
    const node = this.nodes.get(id)
    if (!node || !Number.isFinite(value)) return
    node.object.scale[axis] = value === 0 ? 0.001 : value
  }

  setVisible(id: string, visible: boolean): void {
    const node = this.nodes.get(id)
    if (!node) return
    node.object.visible = visible
  }

  setCastShadow(id: string, enabled: boolean): void {
    const node = this.nodes.get(id)
    const object = node?.object as THREE.Object3D & { castShadow?: boolean }
    if (!object || !('castShadow' in object)) return
    object.castShadow = enabled
  }

  setReceiveShadow(id: string, enabled: boolean): void {
    const node = this.nodes.get(id)
    const mesh = node?.object
    if (!(mesh instanceof THREE.Mesh)) return
    mesh.receiveShadow = enabled
  }

  setGeometryType(nodeId: string, type: GeometryType): void {
    const resource = this.geometryOf(nodeId)
    if (!resource) return
    resource.type = type
    resource.params = defaultParams(type)
    resource.name = this.uniqueResourceName(geometryEntry(type).label, this.geometries, resource.id)
    this.rebuildGeometry(resource.id)
  }

  setGeometryParam(nodeId: string, key: string, value: number): void {
    const resource = this.geometryOf(nodeId)
    if (!resource) return
    resource.params[key] = clampParam(resource.type, key, value)
    this.rebuildGeometry(resource.id)
  }

  resetGeometryType(nodeId: string): void {
    const resource = this.geometryOf(nodeId)
    if (!resource) return
    resource.type = resource.defaults.type
    resource.params = { ...resource.defaults.params }
    this.rebuildGeometry(resource.id)
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
  }

  assignGeometry(nodeId: string, geometryId: string): void {
    const node = this.nodes.get(nodeId)
    const resource = this.geometries.get(geometryId)
    if (!node || node.kind !== 'MeshInstance3D' || !resource?.geometry) return
    node.geometryId = geometryId
    ;(node.object as THREE.Mesh).geometry = resource.geometry
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
  }

  setMaterialName(materialId: string, name: string): void {
    const resource = this.materials.get(materialId)
    const next = name.trim().replace(/[\\/]/g, '')
    if (!resource || !next) return
    resource.name = this.uniqueResourceName(next, this.materials, resource.id)
    if (resource.material) resource.material.name = resource.name
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
  }

  setLightColor(id: string, color: string, which: 'color' | 'ground' = 'color'): void {
    const light = this.lightOf(id)
    if (!light) return
    if (which === 'ground' && light instanceof THREE.HemisphereLight) light.groundColor.set(color)
    else light.color.set(color)
  }

  setLightIntensity(id: string, value: number): void {
    const light = this.lightOf(id)
    if (!light || !Number.isFinite(value)) return
    light.intensity = value
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
  }

  setSpotAngle(id: string, degrees: number): void {
    const light = this.lightOf(id)
    if (!(light instanceof THREE.SpotLight) || !Number.isFinite(degrees)) return
    light.angle = THREE.MathUtils.degToRad(Math.min(90, Math.max(1, degrees)))
  }

  setSpotPenumbra(id: string, value: number): void {
    const light = this.lightOf(id)
    if (!(light instanceof THREE.SpotLight) || !Number.isFinite(value)) return
    light.penumbra = Math.min(1, Math.max(0, value))
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
  }

  setLookAt(id: string, axis: 'x' | 'y' | 'z', value: number): void {
    const light = this.lightOf(id)
    if (!(light instanceof THREE.DirectionalLight) && !(light instanceof THREE.SpotLight)) return
    if (!Number.isFinite(value)) return
    const look = this.ensureLookAt(light)
    look[axis] = value
    look.enabled = true
    this.aimLight(light)
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
      const icon = node.object.getObjectByName('LightIcon')
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

  private onFrame(): void {
    for (const node of this.nodes.values()) {
      if (node.kind === 'DirectionalLight3D' || node.kind === 'SpotLight3D') this.aimLight(node.object)
    }
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
    const dragging = Boolean(this.controls?.dragging && this.tool === 'rotate' && this.selectedId === object.userData.editorId)
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
    const helper = this.selectionHelper
    if (!helper) return
    const node = this.selected()
    if (!node || node.isRoot || this.playing || this.tool !== 'select') {
      helper.visible = false
      return
    }
    this.measureBounds(node.object, this.selectionBounds)
    if (this.selectionBounds.isEmpty()) {
      node.object.getWorldPosition(this.tmp)
      this.selectionBounds.setFromCenterAndSize(this.tmp, this.tmpSize.set(0.45, 0.45, 0.45))
    }
    helper.visible = true
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
      defaults: this.defaultsFrom(object),
    }
    this.nodes.set(id, node)
    this.nodes.get(parentId)?.childIds.push(id)
    this.attachIcon(node)
    this.captureDefaults(node)
    return node
  }

  private cloneNode(node: EditorNode, parentId: string): EditorNode {
    const object = node.object.clone(false)
    object.name = this.uniqueName(node.name)
    const parent = this.nodes.get(parentId)
    parent?.object.add(object)
    const copy = this.addNode(object, parentId, node.kind, node.imported)
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
    for (const childId of node.childIds) {
      const child = this.nodes.get(childId)
      if (child) this.cloneNode(child, copy.id)
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
  }

  private updateLightIcons(): void {
    const camera = this.camera
    const visible = this.chromeVisible && !this.playing
    const height = this.starter?.ctx.renderer.domElement.clientHeight || 800
    const fov = camera ? THREE.MathUtils.degToRad(camera.fov) : 1
    for (const node of this.nodes.values()) {
      const show = visible && node.object.visible
      const arrow = node.object.getObjectByName('LightArrow')
      if (arrow) arrow.visible = show
      const icon = node.object.getObjectByName('LightIcon')
      if (!icon) continue
      icon.visible = show
      if (!icon.visible || !camera) continue
      node.object.getWorldPosition(this.tmp)
      const distance = Math.max(camera.position.distanceTo(this.tmp), 0.5)
      const world = 2 * Math.tan(fov / 2) * distance * (64 / Math.max(height, 1))
      icon.scale.set(world, world, 1)
    }
  }

  private measureBounds(object: THREE.Object3D, target: THREE.Box3): THREE.Box3 {
    const hidden: { object: THREE.Object3D, visible: boolean }[] = []
    for (const name of ['LightIcon', 'LightArrow']) {
      const child = object.getObjectByName(name)
      if (!child) continue
      hidden.push({ object: child, visible: child.visible })
      child.visible = false
    }
    target.setFromObject(object)
    for (const entry of hidden) entry.object.visible = entry.visible
    return target
  }

  private releaseLights(object: THREE.Object3D): void {
    const lights: THREE.Object3D[] = []
    object.traverse((child) => {
      if (child.userData.lightIcon || child.userData.lightArrow) return
      if (child.getObjectByName('LightIcon') || child.getObjectByName('LightArrow') || child instanceof THREE.DirectionalLight || child instanceof THREE.SpotLight) {
        lights.push(child)
      }
    })
    for (const light of lights) {
      if (light instanceof THREE.DirectionalLight || light instanceof THREE.SpotLight) light.target.removeFromParent()
      disposeLightIcon(light)
      disposeLightArrow(light)
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
    }
  }

  private ensureLookAt(light: THREE.DirectionalLight | THREE.SpotLight): LookAtConfig {
    const current = light.userData.lookAt as LookAtConfig | undefined
    if (current) return current
    const created: LookAtConfig = { enabled: false, x: 0, y: 0, z: 0 }
    light.userData.lookAt = created
    return created
  }

  private uniqueName(base: string): string {
    const names = new Set([...this.nodes.values()].map((node) => node.name))
    if (!names.has(base)) return base
    let index = 2
    while (names.has(`${base}${index}`)) index += 1
    return `${base}${index}`
  }

  private uniqueResourceName(base: string, map: Map<string, { id: string, name: string }>, ignoreId?: string): string {
    const names = new Set([...map.values()].filter((item) => item.id !== ignoreId).map((item) => item.name))
    if (!names.has(base)) return base
    let index = 2
    while (names.has(`${base}${index}`)) index += 1
    return `${base}${index}`
  }
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
