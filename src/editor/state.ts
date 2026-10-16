import * as THREE from 'three/webgpu'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { ThreeContextEvents, destroy } from 'three-start'
import type { ThreeStart } from 'three-start'

import {
  buildGeometry,
  clampParam,
  defaultParams,
  geometryEntry,
  restOffset,
  type GeometryType,
} from './geometry'
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
}

export interface GeometryResource {
  id: string
  name: string
  type: GeometryType
  params: Record<string, number>
  geometry: THREE.BufferGeometry | null
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
  Node3D: 'Node3D',
  MeshInstance3D: 'MeshInstance3D',
  DirectionalLight3D: 'DirectionalLight3D',
  OmniLight3D: 'OmniLight3D',
  SpotLight3D: 'SpotLight3D',
  HemisphereLight3D: 'HemisphereLight3D',
}

export class EditorState {
  starter: ThreeStart | null = null
  nodes = new Map<string, EditorNode>()
  geometries = new Map<string, GeometryResource>()
  materials = new Map<string, MaterialResource>()
  rootId = ''
  selectedId: string | null = null
  tool: ToolMode = 'translate'
  space: 'world' | 'local' = 'world'
  snap = false
  shading: ShadingMode = 'shaded'
  playing = false
  paused = false
  groundY = 0
  logs: LogLine[] = []
  controls: TransformControls | null = null

  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private grid: THREE.GridHelper | null = null
  private selectionHelper: THREE.Box3Helper | null = null
  private selectionBounds = new THREE.Box3()
  private readonly forward = new THREE.Vector3()
  private readonly tmp = new THREE.Vector3()
  private readonly tmpSize = new THREE.Vector3(0.5, 0.5, 0.5)
  private idCounter = 1

  log(message: string, level: LogLine['level'] = 'info'): void {
    const now = new Date()
    const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map((part) => String(part).padStart(2, '0'))
      .join(':')
    this.logs.push({ level, message, time })
    if (this.logs.length > 200) this.logs.shift()
  }

  attach(starter: ThreeStart): void {
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

    this.grid = new THREE.GridHelper(40, 40, 0x8a8a8a, 0x2a2a2a)
    this.grid.position.y = this.groundY
    this.grid.userData.editorHidden = true
    scene.add(this.grid)

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
    starter.ctx.on(ThreeContextEvents.Update, () => this.onFrame())

    const hideProfiler = () => {
      try { starter.ctx.modules.inspector.inspector.setVisible(false) } catch { /* mounts lazily */ }
    }
    hideProfiler()
    requestAnimationFrame(hideProfiler)
    setTimeout(hideProfiler, 400)

    this.log('Editor ready. Create a MeshInstance3D to define a geometry and a TSL material.')
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
    if (this.grid) this.grid.visible = !playing
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

    const bounds = new THREE.Box3().setFromObject(node.object)
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
    object.name = this.uniqueName(name?.trim() || 'Node3D')
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
    mesh.name = this.uniqueName(options.name?.trim() || 'MeshInstance3D')
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.position.copy(this.spawnPoint(restOffset(options.geometryType, options.params)))
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
      const directional = new THREE.DirectionalLight(options.color, options.intensity)
      directional.castShadow = true
      light = directional
    } else if (options.kind === 'OmniLight3D') {
      light = new THREE.PointLight(options.color, options.intensity, options.range ?? 12)
    } else if (options.kind === 'SpotLight3D') {
      const spot = new THREE.SpotLight(
        options.color,
        options.intensity,
        options.range ?? 16,
        THREE.MathUtils.degToRad(options.angle ?? 35),
        options.penumbra ?? 0.4,
      )
      light = spot
    } else {
      light = new THREE.HemisphereLight(options.color, options.groundColor ?? '#3a332c', options.intensity)
    }

    light.name = this.uniqueName(options.name?.trim() || NODE_LABEL[options.kind])
    if (options.kind !== 'HemisphereLight3D') {
      light.position.copy(this.spawnPoint(2.5))
      light.lookAt(0, this.groundY, 0)
    }
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
    this.log(`Duplicated ${node.name} as ${copy.name}`)
    this.select(copy.id)
    return copy
  }

  deleteNode(id: string): void {
    const node = this.nodes.get(id)
    if (!node || node.isRoot) return
    const ids = this.collectIds(node)
    destroy(node.object)
    for (const childId of ids) this.nodes.delete(childId)
    const parent = node.parentId ? this.nodes.get(node.parentId) : undefined
    if (parent) parent.childIds = parent.childIds.filter((childId) => childId !== id)
    this.dropOrphanResources()
    if (this.selectedId && !this.nodes.has(this.selectedId)) this.select(parent?.id ?? this.rootId)
    this.log(`Removed ${node.name}`)
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
    if (light instanceof THREE.PointLight || light instanceof THREE.SpotLight) light.distance = Math.max(0, value)
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
    const meshes: THREE.Object3D[] = []
    for (const node of this.nodes.values()) {
      if (node.object instanceof THREE.Mesh && node.object.visible) meshes.push(node.object)
    }
    const hits = raycaster.intersectObjects(meshes, true)
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
    if (this.playing) return
    this.updateSelectionBox()
    for (const node of this.nodes.values()) {
      if (node.kind === 'DirectionalLight3D' || node.kind === 'SpotLight3D') this.aimLight(node.object)
    }
  }

  private aimLight(object: THREE.Object3D): void {
    if (!(object instanceof THREE.DirectionalLight) && !(object instanceof THREE.SpotLight)) return
    const scene = this.scene
    if (!scene) return
    object.getWorldPosition(this.tmp)
    this.forward.set(0, 0, -1).applyQuaternion(object.quaternion)
    object.target.position.copy(this.tmp).add(this.forward)
    object.target.userData.editorHidden = true
    if (!object.target.parent) scene.add(object.target)
    object.target.updateMatrixWorld()
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
    this.selectionBounds.setFromObject(node.object)
    if (this.selectionBounds.isEmpty()) {
      node.object.getWorldPosition(this.tmp)
      this.selectionBounds.setFromCenterAndSize(this.tmp, this.tmpSize.set(0.45, 0.45, 0.45))
    }
    helper.visible = true
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
    hemi.name = 'HemisphereLight3D'
    const sun = new THREE.DirectionalLight('#fff4e4', 2.4)
    sun.name = 'DirectionalLight3D'
    sun.position.set(6, 10, 4)
    sun.castShadow = true
    sun.lookAt(0, 0, 0)
    world.add(hemi, sun)
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
    const resource: GeometryResource = {
      id: `geo${this.idCounter++}`,
      name: this.uniqueResourceName(name ?? geometryEntry(type).label, this.geometries),
      type,
      params: { ...defaultParams(type), ...params },
      geometry: null,
    }
    for (const spec of geometryEntry(type).params) {
      resource.params[spec.key] = clampParam(type, spec.key, resource.params[spec.key] ?? spec.default)
    }
    resource.geometry = buildGeometry(type, resource.params)
    this.geometries.set(resource.id, resource)
    return resource
  }

  private createMaterialResource(name: string, source: string, flags: MaterialFlags): MaterialResource {
    const resource: MaterialResource = {
      id: `mat${this.idCounter++}`,
      name: this.uniqueResourceName(name, this.materials),
      source,
      side: flags.side,
      transparent: flags.transparent,
      wireframe: flags.wireframe,
      material: null,
      error: null,
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
    }
    this.nodes.set(id, node)
    if (parentId) this.nodes.get(parentId)?.childIds.push(id)
    for (const child of [...object.children]) {
      if (child.userData.editorHidden) continue
      if ((child as THREE.Camera).isCamera) continue
      this.registerTree(child, id, true)
    }
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
    }
    this.nodes.set(id, node)
    this.nodes.get(parentId)?.childIds.push(id)
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
    label: 'Node3D',
    group: 'Node',
    description: 'An empty 3D node. Use it to group meshes, lights, and other nodes. It has a transform and nothing else.',
    inherits: 'Node3D < Node',
  },
  {
    kind: 'MeshInstance3D',
    label: 'MeshInstance3D',
    group: 'Node3D',
    description: 'A 3D object that draws a mesh. Pick a geometry, write a TSL material, and add it to the scene.',
    inherits: 'MeshInstance3D < GeometryInstance3D < Node3D',
  },
  {
    kind: 'DirectionalLight3D',
    label: 'DirectionalLight3D',
    group: 'Light3D',
    description: 'A distant light with parallel rays. Rotate it to aim. It lights MeshStandardNodeMaterial surfaces.',
    inherits: 'DirectionalLight3D < Light3D < Node3D',
  },
  {
    kind: 'OmniLight3D',
    label: 'OmniLight3D',
    group: 'Light3D',
    description: 'A point light that emits in every direction, out to a finite range.',
    inherits: 'OmniLight3D < Light3D < Node3D',
  },
  {
    kind: 'SpotLight3D',
    label: 'SpotLight3D',
    group: 'Light3D',
    description: 'A cone of light. Rotate the node to aim it and set the cone angle in the inspector.',
    inherits: 'SpotLight3D < Light3D < Node3D',
  },
  {
    kind: 'HemisphereLight3D',
    label: 'HemisphereLight3D',
    group: 'Light3D',
    description: 'Sky and ground colors used as soft ambient fill. It has no position.',
    inherits: 'HemisphereLight3D < Light3D < Node3D',
  },
]
