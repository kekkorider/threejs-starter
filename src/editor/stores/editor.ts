import { defineStore } from 'pinia'
import { computed, markRaw, ref, shallowRef } from 'vue'
import * as THREE from 'three/webgpu'
import { ThreeContextEvents } from 'three-start'
import type { ThreeStart } from 'three-start'
import { GEOMETRY_CATALOG, triangleCount, type GeometryType } from '../geometry'
import type { NodeKind, ToolMode } from '../state'
import { EditorState, NODE_TYPES, type EditorNode, type GridSettings, type LogLine, type SceneSettings, type ShadowTypeName } from '../state'
import type { ComponentParameter } from '../behaviors'
import { EditorHistory, sameScene, type HistoryRow, type SelectionBookmark } from '../history'
import { hasSceneFile, normalizeScenePath, readSceneLibrary, sceneFileName, type SceneFile } from '../sceneFile'
import { DEFAULT_FLAGS, TSL_PRESETS, matchingPresetId, type MaterialSide } from '../tsl'
import { setViewportShading } from '../../webgl'

export type ScreenName = '3d' | 'script' | 'game' | 'asset'

export interface MenuItem {
  label: string
  shortcut?: string
  disabled?: boolean
  separator?: boolean
  action: () => void
}

export interface NodeSnapshot {
  id: string
  name: string
  kind: NodeKind
  parentId: string | null
  childIds: string[]
  componentIds: string[]
  isRoot: boolean
  instancePath: string | null
}

export interface ComponentFileSnapshot {
  id: string
  name: string
  source: string
  builtin: boolean
  path: string
}

export interface ComponentInstanceSnapshot {
  id: string
  name: string
  resourceId: string
  nodeId: string
  enabled: boolean
  builtin: boolean
  path: string
  nodeName: string
  parameters: ComponentParameter[]
}

export interface ComponentUse {
  id: string
  objectName: string
  componentName: string
}

export interface ComponentWarning {
  resourceId: string
  name: string
  uses: ComponentUse[]
}

export interface InspectorView {
  id: string
  name: string
  kind: NodeKind
  isRoot: boolean
  inherits: string
  instancePath: string | null
  visible: boolean
  castShadow: boolean | null
  receiveShadow: boolean | null
  hasGeometry: boolean
  geometry: {
    id: string
    name: string
    type: GeometryType
    params: Record<string, number>
    users: number
  } | null
  material: {
    id: string
    name: string
    side: MaterialSide
    transparent: boolean
    wireframe: boolean
    error: string | null
    presetId: string
    users: number
  } | null
  light: {
    color: string
    intensity: number
    ground: string | null
    range: number | null
    angle: number | null
    penumbra: number | null
    aimable: boolean
    lookAt: { enabled: boolean, x: number, y: number, z: number } | null
  } | null
}

export interface CreateDraft {
  kind: NodeKind
  name: string
  geometryType: GeometryType
  params: Record<string, number>
  source: string
  color: string
  ground: string
  intensity: number
  range: number
  angle: number
  penumbra: number
}

export interface PopupState {
  x: number
  y: number
  alignStart: boolean
  items: MenuItem[]
}

const MENUS = ['Scene', 'Project', 'Debug', 'Editor', 'Help'] as const

export const useEditorStore = defineStore('editor', () => {
  const engine = markRaw(new EditorState())
  const revision = ref(0)
  const ready = ref(false)
  const bootError = ref('')
  const screen = ref<ScreenName>('3d')
  const playing = ref(false)
  const paused = ref(false)
  const tool = ref<ToolMode>('translate')
  const space = ref<'world' | 'local'>('world')
  const snap = ref(false)
  const shading = ref<'shaded' | 'debug'>('shaded')
  const selectedId = ref<string | null>(null)
  const rootId = ref('')
  const boundMaterialId = ref<string | null>(null)
  const tslSource = ref('// Select a mesh and assign a TSL material.\n')
  const tslDisabled = ref(true)
  const tslPresetId = ref('custom')
  const tslStatus = ref('')
  const tslError = ref(false)
  const tslName = ref('No TSL material')
  const logs = shallowRef<LogLine[]>([])
  const sceneFilter = ref('')
  const fileFilter = ref('')
  const inspectorFilter = ref('')
  const expanded = ref(new Set<string>())
  const collapsed = ref(new Set<string>())
  const bottomTab = ref<'tsl' | 'output' | 'history'>('tsl')
  const bottomCollapsed = ref(false)
  const distraction = ref(false)
  const renamingId = ref<string | null>(null)
  const createOpen = ref(false)
  const createKind = ref<NodeKind>('MeshInstance3D')
  const createPreset = ref('')
  const createNonce = ref(0)
  const componentOpen = ref(false)
  const componentFocusId = ref('')
  const componentNonce = ref(0)
  const selectedComponentId = ref<string | null>(null)
  const componentWarning = ref<ComponentWarning | null>(null)
  const openScriptIds = ref<string[]>([])
  const activeScriptId = ref<string | null>(null)
  const scriptSource = ref('')
  const scriptStatus = ref('')
  const scriptStatusKey = ref(0)
  const scriptError = ref(false)
  const scriptDrafts = ref<Record<string, string>>({})
  const helpTopic = ref<'' | 'tsl' | 'shortcuts'>('')
  const popup = ref<PopupState | null>(null)
  const openMenuName = ref('')
  const transformTick = ref(0)
  const scenePath = ref(engine.scenePath)
  const sceneDirty = ref(true)
  const sceneSaved = ref(false)
  const sceneDialog = ref<'' | 'save-as' | 'unsaved' | 'instance'>('')
  const sceneDialogPath = ref('res://NewScene.tscn')
  const sceneDialogError = ref('')
  const pendingScenePath = ref('')
  const metaName = ref('')
  const metaTris = ref(0)
  let compileTimer = 0
  let scriptStatusTimer = 0
  let viewportBound = false
  const history = new EditorHistory()
  const historyTick = ref(0)
  let replaying = false
  let gesture: { label: string, before: SceneFile, beforeSelection: SelectionBookmark } | null = null

  const nodes = computed(() => {
    void revision.value
    const list: NodeSnapshot[] = []
    for (const node of engine.nodes.values()) {
      list.push({
        id: node.id,
        name: node.name,
        kind: node.kind,
        parentId: node.parentId,
        childIds: [...node.childIds],
        componentIds: [...node.componentIds],
        isRoot: node.isRoot,
        instancePath: node.instancePath,
      })
    }
    return list
  })

  const nodeById = computed(() => {
    const map = new Map<string, NodeSnapshot>()
    for (const node of nodes.value) map.set(node.id, node)
    return map
  })

  const geometryFiles = computed(() => {
    void revision.value
    return [...engine.geometries.values()].map((geometry) => ({ id: geometry.id, name: geometry.name }))
  })

  const materialFiles = computed(() => {
    void revision.value
    return [...engine.materials.values()].map((material) => ({ id: material.id, name: material.name }))
  })

  const componentFiles = computed((): ComponentFileSnapshot[] => {
    void revision.value
    return [...engine.components.values()]
      .map((resource) => ({
        id: resource.id,
        name: resource.name,
        source: resource.source,
        builtin: resource.builtin,
        path: `res://components/${resource.name}.ts`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  const componentById = computed(() => {
    void revision.value
    const map = new Map<string, ComponentInstanceSnapshot>()
    for (const instance of engine.componentInstances.values()) {
      const resource = engine.components.get(instance.resourceId)
      if (!resource) continue
      map.set(instance.id, {
        id: instance.id,
        name: resource.name,
        resourceId: resource.id,
        nodeId: instance.nodeId,
        enabled: instance.behaviour.enabled,
        builtin: resource.builtin,
        path: `res://components/${resource.name}.ts`,
        nodeName: engine.nodes.get(instance.nodeId)?.name ?? '',
        parameters: engine.parametersOf(instance.id),
      })
    }
    return map
  })

  const selectedComponent = computed(() => {
    const id = selectedComponentId.value
    if (!id) return null
    return componentById.value.get(id) ?? null
  })

  const openScripts = computed(() => {
    const files = componentFiles.value
    return openScriptIds.value.flatMap((id) => {
      const file = files.find((item) => item.id === id)
      return file ? [file] : []
    })
  })

  const sceneLabel = computed(() => {
    const name = sceneFileName(scenePath.value)
    return sceneDirty.value ? `${name} (*)` : name
  })

  const sceneFiles = computed(() => {
    void revision.value
    const saved = new Set(readSceneLibrary().map((file) => file.path))
    const paths = new Set(saved)
    paths.add(scenePath.value)
    return [...paths]
      .sort((a, b) => a.localeCompare(b))
      .map((path) => ({
        path,
        open: path === scenePath.value,
        saved: saved.has(path),
      }))
  })

  const instanceChoices = computed(() => sceneFiles.value.filter((file) => file.saved && !file.open))

  const sceneSaveAsReplaces = computed(() => {
    const path = normalizeScenePath(sceneDialogPath.value)
    return Boolean(path && path !== scenePath.value && hasSceneFile(path))
  })

  const canUndo = computed(() => {
    void historyTick.value
    void playing.value
    return history.canUndo && !playing.value
  })

  const canRedo = computed(() => {
    void historyTick.value
    void playing.value
    return history.canRedo && !playing.value
  })

  const undoTitle = computed(() => {
    void historyTick.value
    const label = history.undoLabel
    return label ? `Undo ${label} (Ctrl+Z)` : 'Undo (Ctrl+Z)'
  })

  const redoTitle = computed(() => {
    void historyTick.value
    const label = history.redoLabel
    return label ? `Redo ${label} (Ctrl+Shift+Z)` : 'Redo (Ctrl+Shift+Z)'
  })

  const historyEntries = computed((): HistoryRow[] => {
    void historyTick.value
    return history.entries()
  })

  const historyCursor = computed(() => {
    void historyTick.value
    return history.appliedCount
  })

  const selected = computed(() => {
    void revision.value
    const id = selectedId.value
    if (!id) return null
    const node = engine.nodes.get(id)
    if (!node) return null
    return describe(node)
  })

  const sceneSettings = computed((): SceneSettings => {
    void revision.value
    return engine.sceneSettings()
  })

  const gridSettings = computed((): GridSettings => {
    void revision.value
    return engine.gridSettings()
  })

  function describe(node: EditorNode): InspectorView {
    const entry = NODE_TYPES.find((item) => item.kind === node.kind)
    const geometry = engine.geometryOf(node.id)
    const material = engine.materialOf(node.id)
    let light: InspectorView['light'] = null
    if (node.object instanceof THREE.Light && node.kind !== 'Node3D' && node.kind !== 'MeshInstance3D') {
      const object = node.object
      light = {
        color: `#${object.color.getHexString()}`,
        intensity: object.intensity,
        ground: object instanceof THREE.HemisphereLight ? `#${object.groundColor.getHexString()}` : null,
        range: object instanceof THREE.PointLight || object instanceof THREE.SpotLight ? object.distance : null,
        angle: object instanceof THREE.SpotLight ? THREE.MathUtils.radToDeg(object.angle) : null,
        penumbra: object instanceof THREE.SpotLight ? object.penumbra : null,
        aimable: node.kind === 'DirectionalLight3D' || node.kind === 'SpotLight3D',
        lookAt: node.kind === 'DirectionalLight3D' || node.kind === 'SpotLight3D'
          ? engine.readLookAt(node.id) ?? { enabled: false, x: 0, y: 0, z: 0 }
          : null,
      }
    }
    return {
      id: node.id,
      name: node.name,
      kind: node.kind,
      isRoot: node.isRoot,
      inherits: entry?.inherits ?? node.kind,
      instancePath: node.instancePath,
      visible: node.object.visible,
      castShadow: castShadowOf(node.object),
      receiveShadow: node.object instanceof THREE.Mesh ? node.object.receiveShadow : null,
      hasGeometry: node.kind === 'MeshInstance3D',
      geometry: geometry
        ? {
            id: geometry.id,
            name: geometry.name,
            type: geometry.type,
            params: { ...geometry.params },
            users: engine.usersOfGeometry(geometry.id).length,
          }
        : null,
      material: material
        ? {
            id: material.id,
            name: material.name,
            side: material.side,
            transparent: material.transparent,
            wireframe: material.wireframe,
            error: material.error,
            presetId: matchingPresetId(material.source) ?? 'custom',
            users: engine.usersOfMaterial(material.id).length,
          }
        : null,
      light,
    }
  }

  function touch(forceMaterial = false): void {
    selectedId.value = engine.selectedId
    rootId.value = engine.rootId
    playing.value = engine.playing
    paused.value = engine.paused
    tool.value = engine.tool
    space.value = engine.space
    snap.value = engine.snap
    logs.value = engine.logs.slice()
    scenePath.value = engine.scenePath
    sceneDirty.value = engine.sceneDirty
    sceneSaved.value = engine.hasSavedScene()
    revision.value += 1
    syncMaterial(forceMaterial)
    writeMeta()
  }

  function nodeLabel(id: string | null | undefined): string {
    if (!id) return 'Node'
    return engine.nodes.get(id)?.name || 'Node'
  }

  function bookmark(): SelectionBookmark {
    const path: number[] = []
    let current = engine.selectedId ? engine.nodes.get(engine.selectedId) : undefined
    while (current && !current.isRoot && current.parentId) {
      const parent = engine.nodes.get(current.parentId)
      if (!parent) break
      const index = parent.childIds.indexOf(current.id)
      if (index < 0) break
      path.push(index)
      current = parent
    }
    path.reverse()
    let componentIndex: number | null = null
    if (selectedComponentId.value && engine.selectedId) {
      const node = engine.nodes.get(engine.selectedId)
      const index = node?.componentIds.indexOf(selectedComponentId.value) ?? -1
      if (index >= 0) componentIndex = index
    }
    return { path, componentIndex }
  }

  function nodeAtPath(path: number[]): string | null {
    let id = engine.rootId
    if (!id) return null
    for (const index of path) {
      const node = engine.nodes.get(id)
      const childId = node?.childIds[index]
      if (!childId) return id
      id = childId
    }
    return id
  }

  function applyBookmark(mark: SelectionBookmark): void {
    const id = nodeAtPath(mark.path)
    engine.select(id)
    selectedComponentId.value = null
    if (mark.componentIndex !== null && id) {
      const instanceId = engine.nodes.get(id)?.componentIds[mark.componentIndex]
      if (instanceId) selectedComponentId.value = instanceId
    }
  }

  function takeSnapshot(): SceneFile | null {
    if (!engine.rootId || !engine.nodes.has(engine.rootId)) return null
    try {
      return engine.captureHistory()
    } catch {
      return null
    }
  }

  function record(label: string, mutate: () => string | void, options?: { material?: boolean, merge?: boolean }): void {
    if (replaying || gesture) {
      mutate()
      touch(options?.material)
      return
    }
    const before = takeSnapshot()
    const beforeSelection = bookmark()
    const renamed = mutate()
    const after = before ? takeSnapshot() : null
    if (before && after && !sameScene(before, after)) {
      history.push({
        label: renamed || label,
        before,
        after,
        beforeSelection,
        afterSelection: bookmark(),
        at: Date.now(),
      }, options?.merge !== false)
      historyTick.value += 1
    }
    touch(options?.material)
  }

  function gestureLabel(): string {
    const name = nodeLabel(engine.selectedId)
    if (engine.tool === 'rotate') return `Rotate ${name}`
    if (engine.tool === 'scale') return `Scale ${name}`
    return `Move ${name}`
  }

  function beginGesture(label: string): void {
    if (replaying || gesture || playing.value) return
    const before = takeSnapshot()
    if (!before) return
    gesture = { label, before, beforeSelection: bookmark() }
  }

  function endGesture(): void {
    const current = gesture
    gesture = null
    if (!current || replaying) return
    const after = takeSnapshot()
    if (!after) return
    // A translate or scale drag should not also rewind the cube's spin.
    if (engine.tool !== 'rotate') {
      for (let index = 0; index < current.before.nodes.length; index++) {
        const next = after.nodes[index]
        const prev = current.before.nodes[index]
        if (!next || next.name !== prev.name) continue
        prev.rotation = [next.rotation[0], next.rotation[1], next.rotation[2]]
      }
    }
    if (sameScene(current.before, after)) return
    history.push({
      label: current.label,
      before: current.before,
      after,
      beforeSelection: current.beforeSelection,
      afterSelection: bookmark(),
      at: Date.now(),
    }, false)
    historyTick.value += 1
    touch()
  }

  function clearHistory(): void {
    gesture = null
    history.clear()
    historyTick.value += 1
  }

  function undo(): void {
    if (playing.value || engine.controls?.dragging || gesture) return
    const entry = history.undo()
    if (!entry) return
    replaying = true
    try {
      engine.restoreHistory(entry.before)
      applyBookmark(entry.beforeSelection)
      rememberExpanded()
    } finally {
      replaying = false
    }
    historyTick.value += 1
    touch(true)
  }

  function redo(): void {
    if (playing.value || engine.controls?.dragging || gesture) return
    const entry = history.redo()
    if (!entry) return
    replaying = true
    try {
      engine.restoreHistory(entry.after)
      applyBookmark(entry.afterSelection)
      rememberExpanded()
    } finally {
      replaying = false
    }
    historyTick.value += 1
    touch(true)
  }

  function goToHistory(cursor: number): void {
    if (playing.value || engine.controls?.dragging || gesture) return
    while (history.appliedCount > cursor) {
      if (!history.canUndo) break
      undo()
    }
    while (history.appliedCount < cursor) {
      if (!history.canRedo) break
      redo()
    }
  }

  function showHistory(): void {
    bottomCollapsed.value = false
    bottomTab.value = 'history'
  }

  function writeMeta(): void {
    const node = engine.selected()
    if (!node) {
      metaName.value = ''
      metaTris.value = 0
      return
    }
    metaName.value = node.name
    const mesh = node.object instanceof THREE.Mesh ? node.object : null
    metaTris.value = mesh ? Math.round(triangleCount(mesh.geometry)) : 0
  }

  function refreshTslBar(): void {
    const resource = boundMaterialId.value ? engine.materials.get(boundMaterialId.value) : undefined
    tslName.value = resource ? `${resource.name}.tsl` : 'No TSL material'
    tslPresetId.value = resource ? matchingPresetId(resource.source) ?? 'custom' : 'custom'
    tslError.value = Boolean(resource?.error)
    tslStatus.value = resource?.error ?? (resource ? 'Compiled' : '')
    tslDisabled.value = !resource
  }

  function syncMaterial(force: boolean, explicitId?: string | null): void {
    const id = explicitId === undefined ? engine.selected()?.materialId ?? null : explicitId
    if (!force && id === boundMaterialId.value) {
      refreshTslBar()
      return
    }
    boundMaterialId.value = id
    const resource = id ? engine.materials.get(id) : undefined
    tslDisabled.value = !resource
    tslSource.value = resource?.source ?? (id ? '' : '// Select a mesh and assign a TSL material.\n')
    refreshTslBar()
  }

  function nodeMatches(id: string, query: string): boolean {
    if (!query) return true
    const node = nodeById.value.get(id)
    if (!node) return false
    if (node.name.toLowerCase().includes(query)) return true
    if (node.componentIds.some((componentId) => componentById.value.get(componentId)?.name.toLowerCase().includes(query))) return true
    return node.childIds.some((childId) => nodeMatches(childId, query))
  }

  function select(id: string | null): void {
    selectedComponentId.value = null
    engine.select(id)
    touch()
  }

  function selectComponent(id: string): void {
    const instance = engine.componentInstances.get(id)
    if (!instance) return
    selectedComponentId.value = id
    engine.select(instance.nodeId)
    touch()
    const resource = engine.components.get(instance.resourceId)
    if (resource) {
      metaName.value = resource.name
      metaTris.value = 0
    }
  }

  function attach(starter: ThreeStart): void {
    const first = engine.attach(starter)
    if (first) {
      const next = new Set<string>()
      for (const node of engine.nodes.values()) next.add(node.id)
      expanded.value = next
      engine.select(engine.rootId)
      bindViewport(starter)
      starter.ctx.on(ThreeContextEvents.Update, () => {
        sceneDirty.value = engine.sceneDirty
        if (!engine.chromeVisible || screen.value === 'game') return
        transformTick.value += 1
      })
      engine.setChromeVisible(true)
    }
    ready.value = true
    touch(true)
  }

  function hideChrome(): void {
    engine.setChromeVisible(false)
  }

  function failBoot(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error)
    engine.log(message, 'error')
    bootError.value = message
    bottomTab.value = 'output'
    logs.value = engine.logs.slice()
  }

  function bindViewport(starter: ThreeStart): void {
    if (viewportBound) return
    viewportBound = true
    const canvas = starter.ctx.renderer.domElement
    let originX = 0
    let originY = 0
    let gizmoPointer = false
    canvas.addEventListener('pointerdown', (event) => {
      gizmoPointer = Boolean(engine.controls?.dragging || engine.controls?.axis)
      if (event.button === 0) {
        originX = event.clientX
        originY = event.clientY
      }
    })
    canvas.addEventListener('pointerup', (event) => {
      if (!engine.chromeVisible) return
      if (event.button !== 0 || gizmoPointer || engine.playing || screen.value === 'game') return
      if (Math.hypot(event.clientX - originX, event.clientY - originY) > 5) return
      const rect = canvas.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) return
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      select(engine.pick(x, y))
    })
    canvas.addEventListener('contextmenu', (event) => {
      if (engine.chromeVisible) event.preventDefault()
    })
    engine.controls?.addEventListener('objectChange', () => {
      transformTick.value += 1
      engine.markDirty()
      sceneDirty.value = true
    })
    engine.controls?.addEventListener('mouseDown', () => {
      beginGesture(gestureLabel())
    })
    engine.controls?.addEventListener('mouseUp', () => {
      endGesture()
    })
    window.addEventListener('pointerup', () => {
      if (gesture) endGesture()
    })
  }

  function readTransform(id: string): {
    position: { x: number, y: number, z: number }
    rotation: { x: number, y: number, z: number }
    scale: { x: number, y: number, z: number }
  } | null {
    const node = engine.nodes.get(id)
    if (!node) return null
    const position = node.object.position
    const rotation = node.object.rotation
    const scale = node.object.scale
    return {
      position: { x: position.x, y: position.y, z: position.z },
      rotation: {
        x: THREE.MathUtils.radToDeg(rotation.x),
        y: THREE.MathUtils.radToDeg(rotation.y),
        z: THREE.MathUtils.radToDeg(rotation.z),
      },
      scale: { x: scale.x, y: scale.y, z: scale.z },
    }
  }

  function setScreen(next: ScreenName): void {
    if (next === 'game') {
      setPlaying(true)
      return
    }
    if (engine.playing) setPlaying(false)
    screen.value = next
    if (next === '3d' || next === 'script') bottomTab.value = 'tsl'
  }

  function setPlaying(next: boolean): void {
    if (!ready.value && next) return
    engine.setPlaying(next)
    playing.value = engine.playing
    paused.value = false
    if (next) screen.value = 'game'
    else if (screen.value === 'game') screen.value = '3d'
    writeMeta()
  }

  function togglePause(): void {
    engine.setPaused(!engine.paused)
    paused.value = engine.paused
  }

  function setTool(next: ToolMode): void {
    engine.setTool(next)
    tool.value = engine.tool
  }

  function toggleSpace(): void {
    engine.setSpace(engine.space === 'world' ? 'local' : 'world')
    space.value = engine.space
  }

  function toggleSnap(): void {
    engine.setSnap(!engine.snap)
    snap.value = engine.snap
  }

  function setShading(mode: 'shaded' | 'debug'): void {
    shading.value = mode
    engine.shading = mode
    setViewportShading(mode)
  }

  function setView(which: 'persp' | 'top' | 'front' | 'right'): void {
    engine.setView(which)
  }

  function toggleExpanded(id: string): void {
    const next = new Set(expanded.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    expanded.value = next
  }

  function toggleSection(key: string): void {
    const next = new Set(collapsed.value)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    collapsed.value = next
  }

  function duplicateSelection(): void {
    const id = engine.selectedId
    if (!ready.value || !id) return
    const name = nodeLabel(id)
    record(`Duplicate ${name}`, () => {
      engine.duplicate(id)
      const selectedNode = engine.selectedId
      if (selectedNode) {
        const next = new Set(expanded.value)
        next.add(engine.nodes.get(selectedNode)?.parentId ?? selectedNode)
        expanded.value = next
      }
    }, { merge: false })
  }

  function deleteSelection(): void {
    if (selectedComponentId.value) {
      removeComponent(selectedComponentId.value)
      return
    }
    const id = engine.selectedId
    if (!ready.value || !id) return
    const name = nodeLabel(id)
    record(`Delete ${name}`, () => {
      engine.deleteNode(id)
    }, { merge: false })
  }

  function rename(id: string, name: string): void {
    const previous = nodeLabel(id)
    record(`Rename ${previous}`, () => {
      engine.rename(id, name)
    }, { merge: false })
  }

  function beginRename(id: string): void {
    const node = engine.nodes.get(id)
    if (!node || node.isRoot) return
    renamingId.value = id
  }

  function commitRename(id: string, name: string): void {
    if (renamingId.value !== id) return
    const previous = nodeLabel(id)
    renamingId.value = null
    record(`Rename ${previous}`, () => {
      engine.rename(id, name)
    }, { merge: false })
  }

  function reparent(id: string, parentId: string): void {
    record(`Reparent ${nodeLabel(id)}`, () => {
      engine.reparent(id, parentId)
    }, { merge: false })
  }

  function setPosition(id: string, axis: 'x' | 'y' | 'z', value: number): void {
    record(`Move ${nodeLabel(id)}`, () => {
      engine.setPosition(id, axis, value)
    })
  }

  function setRotation(id: string, axis: 'x' | 'y' | 'z', value: number): void {
    record(`Rotate ${nodeLabel(id)}`, () => {
      engine.setRotationDegrees(id, axis, value)
    })
  }

  function setScale(id: string, axis: 'x' | 'y' | 'z', value: number): void {
    record(`Scale ${nodeLabel(id)}`, () => {
      engine.setScale(id, axis, value)
    })
  }

  function setVisible(id: string, visible: boolean): void {
    record(`Visible ${nodeLabel(id)}`, () => {
      engine.setVisible(id, visible)
    }, { merge: false })
  }

  function setCastShadow(id: string, enabled: boolean): void {
    record(`Cast Shadow ${nodeLabel(id)}`, () => {
      engine.setCastShadow(id, enabled)
    }, { merge: false })
  }

  function setReceiveShadow(id: string, enabled: boolean): void {
    record(`Receive Shadow ${nodeLabel(id)}`, () => {
      engine.setReceiveShadow(id, enabled)
    }, { merge: false })
  }

  function setBackground(color: string): void {
    record('Background', () => {
      engine.setBackground(color)
    })
  }

  function setBackgroundIntensity(value: number): void {
    record('Background Intensity', () => {
      engine.setBackgroundIntensity(value)
    })
  }

  function setEnvironmentIntensity(value: number): void {
    record('Environment Intensity', () => {
      engine.setEnvironmentIntensity(value)
    })
  }

  function setShadows(enabled: boolean): void {
    record('Shadows', () => {
      engine.setShadows(enabled)
    }, { merge: false })
  }

  function setShadowType(name: ShadowTypeName): void {
    record('Shadow Type', () => {
      engine.setShadowType(name)
    }, { merge: false })
  }

  function setGridVisible(visible: boolean): void {
    record('Grid Visible', () => {
      engine.setGridVisible(visible)
    }, { merge: false })
  }

  function setGridSize(value: number): void {
    record('Grid Size', () => {
      engine.setGridSize(value)
    })
  }

  function setGridDivisions(value: number): void {
    record('Grid Divisions', () => {
      engine.setGridDivisions(value)
    })
  }

  function setGridCenter(color: string): void {
    record('Grid Center', () => {
      engine.setGridCenter(color)
    })
  }

  function setGridColor(color: string): void {
    record('Grid Cell', () => {
      engine.setGridColor(color)
    })
  }

  function setGridPosition(axis: 'x' | 'y' | 'z', value: number): void {
    record('Grid Position', () => {
      engine.setGridPosition(axis, value)
    })
  }

  function resetGrid(field: 'visible' | 'size' | 'divisions' | 'center' | 'color' | 'position'): void {
    record('Reset Grid', () => {
      engine.resetGrid(field)
    }, { merge: false })
  }

  function resetScene(field: 'background' | 'backgroundIntensity' | 'environmentIntensity' | 'shadows' | 'shadowType'): void {
    record('Reset Scene', () => {
      engine.resetScene(field)
    }, { merge: false })
  }

  function setGeometryType(id: string, type: GeometryType): void {
    record(`Geometry ${nodeLabel(id)}`, () => {
      engine.setGeometryType(id, type)
    }, { merge: false })
  }

  function setGeometryParam(id: string, key: string, value: number): void {
    record(`Geometry ${nodeLabel(id)} ${key}`, () => {
      engine.setGeometryParam(id, key, value)
    })
  }

  function resetGeometryType(id: string): void {
    record(`Reset Geometry ${nodeLabel(id)}`, () => {
      engine.resetGeometryType(id)
    }, { merge: false })
  }

  function resetGeometryParam(id: string, key: string): void {
    record(`Reset ${key}`, () => {
      engine.resetGeometryParam(id, key)
    }, { merge: false })
  }

  function setLightColor(id: string, color: string, which: 'color' | 'ground' = 'color'): void {
    const label = which === 'ground' ? `Ground ${nodeLabel(id)}` : `Color ${nodeLabel(id)}`
    record(label, () => {
      engine.setLightColor(id, color, which)
    })
  }

  function setLightIntensity(id: string, value: number): void {
    record(`Energy ${nodeLabel(id)}`, () => {
      engine.setLightIntensity(id, value)
    })
  }

  function setLightRange(id: string, value: number): void {
    record(`Range ${nodeLabel(id)}`, () => {
      engine.setLightRange(id, value)
    })
  }

  function setSpotAngle(id: string, degrees: number): void {
    record(`Angle ${nodeLabel(id)}`, () => {
      engine.setSpotAngle(id, degrees)
    })
  }

  function setSpotPenumbra(id: string, value: number): void {
    record(`Penumbra ${nodeLabel(id)}`, () => {
      engine.setSpotPenumbra(id, value)
    })
  }

  function readLookAt(id: string): { enabled: boolean, x: number, y: number, z: number } | null {
    return engine.readLookAt(id)
  }

  function setLookAtEnabled(id: string, enabled: boolean): void {
    record(`Look At ${nodeLabel(id)}`, () => {
      engine.setLookAtEnabled(id, enabled)
    }, { merge: false })
  }

  function setLookAt(id: string, axis: 'x' | 'y' | 'z', value: number): void {
    record(`Target ${nodeLabel(id)}`, () => {
      engine.setLookAt(id, axis, value)
    })
  }

  function resetLookAtEnabled(id: string): void {
    record(`Reset Look At ${nodeLabel(id)}`, () => {
      engine.resetLookAtEnabled(id)
    }, { merge: false })
  }

  function resetLookAt(id: string): void {
    record(`Reset Target ${nodeLabel(id)}`, () => {
      engine.resetLookAt(id)
    }, { merge: false })
  }

  function resetLight(id: string, field: 'color' | 'ground' | 'intensity' | 'range' | 'angle' | 'penumbra'): void {
    record(`Reset ${field} ${nodeLabel(id)}`, () => {
      engine.resetLight(id, field)
    }, { merge: false })
  }

  function resetTransform(id: string, part: 'pos' | 'rot' | 'scl'): void {
    const label = part === 'pos' ? 'Reset Position' : part === 'rot' ? 'Reset Rotation' : 'Reset Scale'
    record(`${label} ${nodeLabel(id)}`, () => {
      engine.resetTransform(id, part)
    }, { merge: false })
  }

  function resetVisible(id: string): void {
    record(`Reset Visible ${nodeLabel(id)}`, () => {
      engine.resetVisible(id)
    }, { merge: false })
  }

  function resetCastShadow(id: string): void {
    record(`Reset Cast Shadow ${nodeLabel(id)}`, () => {
      engine.resetCastShadow(id)
    }, { merge: false })
  }

  function resetReceiveShadow(id: string): void {
    record(`Reset Receive Shadow ${nodeLabel(id)}`, () => {
      engine.resetReceiveShadow(id)
    }, { merge: false })
  }

  function materialLabel(id: string): string {
    return engine.materials.get(id)?.name ?? 'Material'
  }

  function setMaterialFlags(id: string, patch: { side?: MaterialSide, transparent?: boolean, wireframe?: boolean }): void {
    const part = patch.side ? 'Cull' : patch.transparent !== undefined ? 'Transparent' : 'Wireframe'
    record(`${part} ${materialLabel(id)}`, () => {
      engine.setMaterialFlags(id, patch)
    }, { merge: false })
  }

  function setMaterialName(id: string, name: string): void {
    record(`Rename ${materialLabel(id)}`, () => {
      engine.setMaterialName(id, name)
    }, { merge: false })
  }

  function resetMaterialName(id: string): void {
    record(`Reset ${materialLabel(id)}`, () => {
      engine.resetMaterialName(id)
    }, { merge: false })
  }

  function resetMaterialSource(id: string): void {
    record(`Reset ${materialLabel(id)}`, () => {
      engine.resetMaterialSource(id)
    }, { material: true, merge: false })
  }

  function resetMaterialFlag(id: string, flag: 'side' | 'transparent' | 'wireframe'): void {
    record(`Reset ${flag} ${materialLabel(id)}`, () => {
      engine.resetMaterialFlag(id, flag)
    }, { merge: false })
  }

  function applyBoundPreset(presetId: string): void {
    const id = boundMaterialId.value
    if (!id || presetId === 'custom') return
    record(`Preset ${materialLabel(id)}`, () => {
      engine.applyPreset(id, presetId)
    }, { material: true, merge: false })
  }

  function applyNodePreset(presetId: string): void {
    const node = engine.selected()
    if (!node || presetId === 'custom') return
    const material = engine.materialOf(node.id)
    if (!material) return
    record(`Preset ${material.name}`, () => {
      engine.applyPreset(material.id, presetId)
    }, { material: true, merge: false })
  }

  function onTslChange(source: string): void {
    const id = boundMaterialId.value
    if (!id) return
    record(`Edit ${materialLabel(id)}`, () => {
      engine.setMaterialSource(id, source)
      tslPresetId.value = matchingPresetId(source) ?? 'custom'
      window.clearTimeout(compileTimer)
      compileTimer = window.setTimeout(() => compileBound(false), 380)
    })
  }

  function compileBound(log: boolean): void {
    const id = boundMaterialId.value
    if (!id) return
    const result = engine.compileMaterial(id)
    if (!result.ok && log) engine.log(result.error, 'error')
    refreshTslBar()
    if (log) {
      logs.value = engine.logs.slice()
      if (!result.ok) bottomTab.value = 'output'
    }
  }

  function rememberExpanded(): void {
    const next = new Set<string>()
    for (const node of engine.nodes.values()) next.add(node.id)
    expanded.value = next
  }

  function saveOpenScene(): void {
    const saved = engine.saveOpenScene()
    touch(true)
    if (!saved) bottomTab.value = 'output'
  }

  function loadOpenScene(): void {
    const loaded = engine.loadOpenScene()
    if (loaded) {
      rememberExpanded()
      selectedComponentId.value = null
      clearHistory()
    }
    touch(true)
    if (!loaded) bottomTab.value = 'output'
  }

  function finishOpenScene(path: string): void {
    const opened = engine.openScene(path)
    if (opened) {
      rememberExpanded()
      selectedComponentId.value = null
      clearHistory()
    }
    touch(true)
    if (!opened) bottomTab.value = 'output'
  }

  function openSceneFile(path: string): void {
    if (path === engine.scenePath) {
      select(engine.rootId)
      return
    }
    if (engine.playing) {
      engine.log('Stop the scene before opening another one.', 'warn')
      touch()
      bottomTab.value = 'output'
      return
    }
    if (engine.sceneDirty) {
      pendingScenePath.value = path
      sceneDialogError.value = ''
      sceneDialog.value = 'unsaved'
      return
    }
    finishOpenScene(path)
  }

  function openSaveAs(): void {
    if (!ready.value) return
    closePopups()
    helpTopic.value = ''
    createOpen.value = false
    componentOpen.value = false
    const current = engine.scenePath
    const name = sceneFileName(current).replace(/\.tscn$/, '') || 'Scene'
    const folder = current.slice(0, current.length - sceneFileName(current).length)
    sceneDialogPath.value = `${folder}${name}2.tscn`
    sceneDialogError.value = ''
    sceneDialog.value = 'save-as'
  }

  function confirmSaveAs(): void {
    const saved = engine.saveSceneAs(sceneDialogPath.value)
    if (!saved) {
      sceneDialogError.value = engine.logs.at(-1)?.message ?? 'Could not save the scene.'
      touch()
      bottomTab.value = 'output'
      return
    }
    sceneDialog.value = ''
    sceneDialogError.value = ''
    touch(true)
  }

  function confirmSaveAndOpen(): void {
    const pending = pendingScenePath.value
    const saved = engine.saveOpenScene()
    if (!saved) {
      sceneDialog.value = ''
      touch()
      bottomTab.value = 'output'
      return
    }
    sceneDialog.value = ''
    finishOpenScene(pending)
  }

  function discardAndOpen(): void {
    const pending = pendingScenePath.value
    sceneDialog.value = ''
    finishOpenScene(pending)
  }

  function cancelSceneDialog(): void {
    sceneDialog.value = ''
    sceneDialogError.value = ''
  }

  function deleteSceneFile(path: string): void {
    const removed = engine.deleteScene(path)
    touch()
    if (!removed) bottomTab.value = 'output'
  }

  function openInstanceDialog(): void {
    if (!ready.value) return
    closePopups()
    helpTopic.value = ''
    createOpen.value = false
    componentOpen.value = false
    sceneDialogError.value = ''
    sceneDialog.value = 'instance'
  }

  function instanceScene(path: string, parentId?: string | null): void {
    sceneDialog.value = ''
    let placed = false
    record(`Instance ${sceneFileName(path)}`, () => {
      const node = engine.instanceScene(path, parentId === undefined ? engine.selectedId : parentId)
      placed = !!node
      if (node) {
        const next = new Set(expanded.value)
        const walk = (id: string): void => {
          next.add(id)
          const current = engine.nodes.get(id)
          if (!current) return
          for (const childId of current.childIds) walk(childId)
        }
        if (node.parentId) next.add(node.parentId)
        walk(node.id)
        expanded.value = next
      }
    }, { merge: false })
    if (!placed) bottomTab.value = 'output'
  }

  function makeLocal(id: string): void {
    record(`Make Local ${nodeLabel(id)}`, () => {
      engine.makeLocal(id)
    }, { merge: false })
  }

  function openCreate(kind: NodeKind = 'MeshInstance3D', presetId?: string): void {
    if (!ready.value) return
    closePopups()
    helpTopic.value = ''
    createKind.value = kind
    createPreset.value = presetId ?? ''
    createNonce.value += 1
    componentOpen.value = false
    createOpen.value = true
  }

  function openComponentDialog(resourceId = ''): void {
    if (!ready.value) return
    closePopups()
    helpTopic.value = ''
    createOpen.value = false
    componentFocusId.value = resourceId
    componentNonce.value += 1
    componentOpen.value = true
  }

  function createComponent(name: string, source: string): { id: string } | { error: string } {
    const result = engine.createComponent(name, source)
    touch()
    if ('id' in result) {
      componentFocusId.value = result.id
      expanded.value = new Set(expanded.value)
    }
    return result
  }

  function updateComponent(id: string, source: string): string | null {
    const error = engine.updateComponentSource(id, source)
    touch()
    return error
  }

  function attachComponent(resourceId: string, nodeId: string): void {
    const resourceName = engine.components.get(resourceId)?.name ?? 'Component'
    let failed = false
    record(`Add ${resourceName}`, () => {
      const instance = engine.attachComponent(resourceId, nodeId)
      if (!instance) {
        failed = true
        return
      }
      const opened = new Set(expanded.value)
      opened.add(nodeId)
      expanded.value = opened
      selectedComponentId.value = instance.id
      engine.select(nodeId)
      metaName.value = instance.name
    }, { merge: false })
    if (failed) bottomTab.value = 'output'
  }

  function moveComponent(instanceId: string, nodeId: string): void {
    const name = engine.componentInstances.get(instanceId)?.name ?? 'Component'
    record(`Move ${name}`, () => {
      engine.moveComponent(instanceId, nodeId)
      const opened = new Set(expanded.value)
      opened.add(nodeId)
      expanded.value = opened
      selectedComponentId.value = instanceId
      engine.select(nodeId)
    }, { merge: false })
  }

  function removeComponent(instanceId: string): void {
    const instance = engine.componentInstances.get(instanceId)
    record(`Remove ${instance?.name ?? 'Component'}`, () => {
      engine.removeComponent(instanceId)
      if (selectedComponentId.value === instanceId) selectedComponentId.value = null
      if (instance) engine.select(instance.nodeId)
    }, { merge: false })
  }

  function setComponentEnabled(instanceId: string, enabled: boolean): void {
    const name = engine.componentInstances.get(instanceId)?.name ?? 'Component'
    record(`Enabled ${name}`, () => {
      engine.setComponentEnabled(instanceId, enabled)
    }, { merge: false })
  }

  function setComponentParameter(instanceId: string, key: string, value: number | string | boolean): void {
    const name = engine.componentInstances.get(instanceId)?.name ?? 'Component'
    record(`${name} ${key}`, () => {
      engine.setComponentParameter(instanceId, key, value)
    })
  }

  function addComponentToSelection(resourceId: string): void {
    const nodeId = engine.selectedId || engine.rootId
    if (!nodeId) return
    attachComponent(resourceId, nodeId)
    componentOpen.value = false
  }

  function requestDeleteComponent(resourceId: string): void {
    const resource = engine.components.get(resourceId)
    if (!resource) return
    const uses = engine.usesOf(resourceId)
    if (uses.length === 0) {
      finishDeleteComponent(resourceId)
      return
    }
    componentWarning.value = { resourceId, name: resource.name, uses }
  }

  function cancelDeleteComponent(): void {
    componentWarning.value = null
  }

  function confirmDeleteComponent(): void {
    const warning = componentWarning.value
    if (!warning) return
    finishDeleteComponent(warning.resourceId)
  }

  function finishDeleteComponent(resourceId: string): void {
    engine.deleteComponent(resourceId)
    dropScriptDraft(resourceId)
    openScriptIds.value = openScriptIds.value.filter((id) => id !== resourceId)
    if (activeScriptId.value === resourceId) {
      activeScriptId.value = openScriptIds.value.at(-1) ?? null
      syncScriptSource()
    }
    if (selectedComponentId.value && !engine.componentInstances.has(selectedComponentId.value)) {
      selectedComponentId.value = null
    }
    componentWarning.value = null
    touch()
  }

  function dropScriptDraft(id: string): void {
    if (!(id in scriptDrafts.value)) return
    const next = { ...scriptDrafts.value }
    delete next[id]
    scriptDrafts.value = next
  }

  function rememberDraft(id: string): void {
    const saved = engine.components.get(id)?.source ?? ''
    if (scriptSource.value === saved) {
      dropScriptDraft(id)
      return
    }
    scriptDrafts.value = { ...scriptDrafts.value, [id]: scriptSource.value }
  }

  function syncScriptSource(): void {
    const id = activeScriptId.value
    const resource = id ? engine.components.get(id) : undefined
    const draft = id !== null && Object.hasOwn(scriptDrafts.value, id) ? scriptDrafts.value[id] : undefined
    scriptSource.value = draft ?? resource?.source ?? ''
    scriptStatus.value = ''
    scriptError.value = false
  }

  const scriptDirty = computed(() => {
    void revision.value
    const id = activeScriptId.value
    if (!id) return false
    const saved = engine.components.get(id)?.source
    return saved !== undefined && scriptSource.value !== saved
  })

  function showScript(resourceId: string): void {
    if (!openScriptIds.value.includes(resourceId)) {
      openScriptIds.value = [...openScriptIds.value, resourceId]
    }
    if (activeScriptId.value && activeScriptId.value !== resourceId) rememberDraft(activeScriptId.value)
    activeScriptId.value = resourceId
    syncScriptSource()
    setScreen('script')
  }

  function closeScript(resourceId: string): void {
    if (activeScriptId.value === resourceId) rememberDraft(resourceId)
    openScriptIds.value = openScriptIds.value.filter((id) => id !== resourceId)
    if (activeScriptId.value !== resourceId) return
    activeScriptId.value = openScriptIds.value.at(-1) ?? null
    syncScriptSource()
  }

  function editComponent(instanceId: string): void {
    const instance = engine.componentInstances.get(instanceId)
    if (!instance) return
    showScript(instance.resourceId)
  }

  function saveActiveScript(log: boolean): void {
    const id = activeScriptId.value
    if (!id) return
    window.clearTimeout(scriptStatusTimer)
    const error = engine.updateComponentSource(id, scriptSource.value)
    scriptStatus.value = error ?? 'Applied'
    scriptError.value = Boolean(error)
    scriptStatusKey.value += 1
    if (error) {
      if (log) bottomTab.value = 'output'
    } else {
      dropScriptDraft(id)
      scriptStatusTimer = window.setTimeout(() => {
        if (scriptStatus.value === 'Applied') scriptStatus.value = ''
      }, 1400)
    }
    touch()
  }

  function onScriptChange(source: string): void {
    scriptSource.value = source
    const id = activeScriptId.value
    if (!id) return
    const saved = engine.components.get(id)?.source ?? ''
    if (source === saved) dropScriptDraft(id)
    else scriptDrafts.value = { ...scriptDrafts.value, [id]: source }
    if (scriptStatus.value) {
      window.clearTimeout(scriptStatusTimer)
      scriptStatus.value = ''
      scriptError.value = false
    }
  }

  function createFromDraft(draft: CreateDraft): string | null {
    if (!ready.value) return 'Editor is not ready.'
    const parentId = engine.selectedId
    let message: string | null = null
    record(`Create ${draft.name.trim() || 'Node'}`, () => {
      try {
        if (draft.kind === 'Node3D') {
          engine.createNode3D(parentId, draft.name)
        } else if (draft.kind === 'MeshInstance3D') {
          engine.createMesh({
            name: draft.name,
            parentId,
            geometryType: draft.geometryType,
            params: { ...draft.params },
            source: draft.source,
            flags: { ...DEFAULT_FLAGS },
          })
        } else {
          engine.createLight({
            kind: draft.kind,
            name: draft.name,
            parentId,
            color: draft.color,
            intensity: draft.intensity,
            range: draft.range,
            angle: draft.angle,
            penumbra: draft.penumbra,
            groundColor: draft.ground,
          })
        }
        const created = engine.selectedId
        if (created) {
          const next = new Set(expanded.value)
          const parent = engine.nodes.get(created)?.parentId
          if (parent) next.add(parent)
          next.add(created)
          expanded.value = next
        }
        createOpen.value = false
        bottomTab.value = 'tsl'
        return `Create ${nodeLabel(engine.selectedId)}`
      } catch (error) {
        message = error instanceof Error ? error.message : String(error)
        engine.log(message, 'error')
      }
    }, { material: true, merge: false })
    if (message) bottomTab.value = 'output'
    return message
  }

  function openHelp(topic: 'tsl' | 'shortcuts'): void {
    closePopups()
    createOpen.value = false
    componentOpen.value = false
    helpTopic.value = topic
  }

  function closeHelp(): void {
    helpTopic.value = ''
  }

  function selectMaterialFile(id: string): void {
    const user = engine.usersOfMaterial(id)[0]
    if (user) select(user.id)
    else syncMaterial(true, id)
    if (screen.value === 'asset') setScreen('3d')
    bottomTab.value = 'tsl'
  }

  function selectGeometryFile(id: string): void {
    const user = engine.usersOfGeometry(id)[0]
    if (user) select(user.id)
  }

  function applyAssetPreset(presetId: string): void {
    const node = engine.selected()
    if (!node || node.kind !== 'MeshInstance3D') {
      engine.log('Select a MeshInstance to apply this material.', 'warn')
      logs.value = engine.logs.slice()
      bottomTab.value = 'output'
      return
    }
    record(`Preset ${node.name}`, () => {
      if (node.materialId) engine.applyPreset(node.materialId, presetId)
      else engine.newMaterialFor(node.id, presetId)
      setScreen('3d')
    }, { material: true, merge: false })
  }

  function closePopups(): void {
    popup.value = null
    openMenuName.value = ''
  }

  function showPopup(rect: DOMRect, items: MenuItem[], alignStart: boolean): void {
    closePopups()
    popup.value = { x: rect.left, y: rect.bottom, items, alignStart }
  }

  function openPropertyMenu(x: number, y: number, reset: () => void): void {
    showPopup(new DOMRect(x, y, 0, 0), [{ label: 'Reset', action: reset }], false)
  }

  function openMenu(name: string, anchor: HTMLElement): void {
    showPopup(anchor.getBoundingClientRect(), menuItems(name), true)
    openMenuName.value = name
  }

  function menuItems(name: string): MenuItem[] {
    const current = engine.selected()
    const locked = !current || current.isRoot
    if (name === 'Scene') {
      return [
        { label: 'Undo', shortcut: 'Ctrl+Z', disabled: !canUndo.value, action: () => undo() },
        { label: 'Redo', shortcut: 'Ctrl+Shift+Z', disabled: !canRedo.value, action: () => redo() },
        { separator: true, label: '', action: () => {} },
        { label: 'Save Scene', shortcut: 'Ctrl+Shift+S', action: () => saveOpenScene() },
        { label: 'Save Scene As…', shortcut: 'Ctrl+Alt+S', action: () => openSaveAs() },
        { label: 'Instance Scene…', shortcut: 'Ctrl+Shift+A', disabled: instanceChoices.value.length === 0, action: () => openInstanceDialog() },
        { label: 'Load Scene', shortcut: 'Ctrl+Shift+L', disabled: !engine.hasSavedScene(), action: () => loadOpenScene() },
        { separator: true, label: '', action: () => {} },
        { label: 'Create Node…', shortcut: 'Ctrl+A', action: () => openCreate() },
        { label: 'Create Component…', shortcut: 'Ctrl+C', action: () => openComponentDialog() },
        { label: 'Duplicate', shortcut: 'Ctrl+D', disabled: locked, action: () => duplicateSelection() },
        { label: 'Rename', shortcut: 'F2', disabled: locked, action: () => current && beginRename(current.id) },
        { label: 'Delete', shortcut: 'Del', disabled: locked, action: () => deleteSelection() },
        { separator: true, label: '', action: () => {} },
        { label: 'Focus Selection', shortcut: 'F', disabled: locked, action: () => engine.focusSelected() },
      ]
    }
    if (name === 'Project') return [{ label: 'Project Settings', disabled: true, action: () => {} }]
    if (name === 'Debug') {
      return [
        { label: engine.paused ? 'Resume Simulation' : 'Pause Simulation', action: () => togglePause() },
        { label: 'Three.js Profiler', action: () => engine.toggleProfiler() },
      ]
    }
    if (name === 'Editor') {
      return [
        { label: 'History', action: () => showHistory() },
        { label: 'Bottom Panel', action: () => { bottomCollapsed.value = !bottomCollapsed.value } },
        { label: 'Distraction Free Mode', action: () => { distraction.value = !distraction.value } },
      ]
    }
    return [
      { label: 'TSL Material Reference', action: () => openHelp('tsl') },
      { label: 'Editor Shortcuts', action: () => openHelp('shortcuts') },
    ]
  }

  function openContextMenu(id: string, x: number, y: number): void {
    select(id)
    const node = engine.nodes.get(id)
    if (!node) return
    const items: MenuItem[] = [
      { label: 'Add Child Node…', action: () => openCreate() },
      { label: 'Instance Scene…', disabled: instanceChoices.value.length === 0, action: () => openInstanceDialog() },
    ]
    if (node.instancePath) items.push({ label: 'Make Local', action: () => makeLocal(id) })
    items.push(
      { label: 'Add Component…', action: () => openComponentDialog() },
      { label: 'Rename', disabled: node.isRoot, action: () => beginRename(id) },
      { label: 'Duplicate', disabled: node.isRoot, action: () => duplicateSelection() },
      { label: 'Delete', disabled: node.isRoot, action: () => deleteSelection() },
      { separator: true, label: '', action: () => {} },
      { label: 'Focus', disabled: node.isRoot, action: () => engine.focusSelected() },
    )
    showPopup(new DOMRect(x, y, 0, 0), items, false)
  }

  function openComponentMenu(id: string, x: number, y: number): void {
    selectComponent(id)
    showPopup(new DOMRect(x, y, 0, 0), [
      { label: 'Edit', action: () => editComponent(id) },
      { label: 'Delete', action: () => removeComponent(id) },
    ], false)
  }

  function openComponentFileMenu(resourceId: string, x: number, y: number): void {
    showPopup(new DOMRect(x, y, 0, 0), [
      { label: 'Delete', action: () => requestDeleteComponent(resourceId) },
    ], false)
  }

  function openGeometryMenu(nodeId: string, anchor: HTMLElement): void {
    const items: MenuItem[] = GEOMETRY_CATALOG.map((entry) => ({
      label: `New ${entry.label}`,
      action: () => {
        record(`Geometry ${nodeLabel(nodeId)}`, () => {
          engine.newGeometryFor(nodeId, entry.type)
        }, { merge: false })
      },
    }))
    const current = engine.geometryOf(nodeId)
    if (current) {
      items.push({ separator: true, label: '', action: () => {} })
      items.push({
        label: 'Make Unique',
        action: () => {
          record(`Unique Geometry ${nodeLabel(nodeId)}`, () => {
            engine.makeGeometryUnique(nodeId)
          }, { merge: false })
        },
      })
      for (const resource of engine.geometries.values()) {
        if (resource.id === current.id) continue
        items.push({
          label: resource.name,
          action: () => {
            record(`Geometry ${nodeLabel(nodeId)}`, () => {
              engine.assignGeometry(nodeId, resource.id)
            }, { merge: false })
          },
        })
      }
    }
    showPopup(anchor.getBoundingClientRect(), items, false)
  }

  function openMaterialMenu(nodeId: string, anchor: HTMLElement): void {
    const items: MenuItem[] = TSL_PRESETS.map((preset) => ({
      label: `New ${preset.name}`,
      action: () => {
        record(`Material ${nodeLabel(nodeId)}`, () => {
          engine.newMaterialFor(nodeId, preset.id)
          bottomTab.value = 'tsl'
        }, { material: true, merge: false })
      },
    }))
    const current = engine.materialOf(nodeId)
    if (current) {
      items.push({ separator: true, label: '', action: () => {} })
      items.push({
        label: 'Make Unique',
        action: () => {
          record(`Unique Material ${nodeLabel(nodeId)}`, () => {
            engine.makeMaterialUnique(nodeId)
          }, { material: true, merge: false })
        },
      })
      for (const resource of engine.materials.values()) {
        if (resource.id === current.id) continue
        items.push({
          label: resource.name,
          action: () => {
            record(`Material ${nodeLabel(nodeId)}`, () => {
              engine.assignMaterial(nodeId, resource.id)
            }, { material: true, merge: false })
          },
        })
      }
    }
    showPopup(anchor.getBoundingClientRect(), items, false)
  }

  function onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null
    const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === 's') {
      event.preventDefault()
      if (sceneDialog.value !== 'save-as') openSaveAs()
      return
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 's') {
      event.preventDefault()
      saveOpenScene()
      return
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'l') {
      event.preventDefault()
      loadOpenScene()
      return
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      compileBound(true)
      return
    }
    if (event.key === 'Escape' && !typing) {
      if (sceneDialog.value) {
        sceneDialog.value = ''
        return
      }
      if (componentWarning.value) {
        componentWarning.value = null
        return
      }
      if (componentOpen.value) {
        componentOpen.value = false
        return
      }
      if (createOpen.value) {
        createOpen.value = false
        return
      }
      if (helpTopic.value) {
        helpTopic.value = ''
        return
      }
    }
    if (typing || createOpen.value || componentOpen.value || helpTopic.value || sceneDialog.value) return
    const key = event.key.toLowerCase()
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === 'z') {
      event.preventDefault()
      redo()
      return
    }
    if ((event.ctrlKey || event.metaKey) && key === 'z') {
      event.preventDefault()
      undo()
      return
    }
    if ((event.ctrlKey || event.metaKey) && key === 'y') {
      event.preventDefault()
      redo()
      return
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === 'a') {
      event.preventDefault()
      openInstanceDialog()
    } else if ((event.ctrlKey || event.metaKey) && key === 'a') {
      event.preventDefault()
      openCreate()
    } else if ((event.ctrlKey || event.metaKey) && key === 'c') {
      event.preventDefault()
      openComponentDialog()
    } else if ((event.ctrlKey || event.metaKey) && key === 'd') {
      event.preventDefault()
      duplicateSelection()
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      if (selectedComponentId.value) removeComponent(selectedComponentId.value)
      else deleteSelection()
    } else if (event.key === 'F2') {
      const id = engine.selectedId
      if (id) beginRename(id)
    } else if (key === 'f' && !event.ctrlKey && !event.metaKey) {
      engine.focusSelected()
    } else if (key === 'q') setTool('select')
    else if (key === 'w') setTool('translate')
    else if (key === 'e') setTool('rotate')
    else if (key === 'r') setTool('scale')
    else if (key === 'y') toggleSnap()
    else if (event.key === 'F5') {
      event.preventDefault()
      setPlaying(true)
    } else if (event.key === 'F8') {
      event.preventDefault()
      setPlaying(false)
    } else if (event.key === 'Escape' && screen.value === 'game') setPlaying(false)
  }

  function onPointerDown(event: PointerEvent): void {
    const target = event.target as HTMLElement | null
    if (!target?.closest('.menu-pop')) closePopups()
  }

  return {
    menus: MENUS,
    revision,
    ready,
    bootError,
    screen,
    playing,
    paused,
    tool,
    space,
    snap,
    shading,
    selectedId,
    rootId,
    boundMaterialId,
    tslSource,
    tslDisabled,
    tslPresetId,
    tslStatus,
    tslError,
    tslName,
    logs,
    sceneFilter,
    fileFilter,
    inspectorFilter,
    expanded,
    collapsed,
    bottomTab,
    bottomCollapsed,
    distraction,
    renamingId,
    createOpen,
    createKind,
    createPreset,
    createNonce,
    componentOpen,
    componentFocusId,
    componentNonce,
    componentWarning,
    selectedComponentId,
    openScriptIds,
    activeScriptId,
    scriptSource,
    scriptStatus,
    scriptStatusKey,
    scriptError,
    scriptDirty,
    helpTopic,
    popup,
    openMenuName,
    transformTick,
    scenePath,
    sceneDirty,
    sceneSaved,
    sceneLabel,
    sceneFiles,
    instanceChoices,
    sceneDialog,
    sceneDialogPath,
    sceneDialogError,
    sceneSaveAsReplaces,
    canUndo,
    canRedo,
    undoTitle,
    redoTitle,
    historyEntries,
    historyCursor,
    metaName,
    metaTris,
    nodes,
    nodeById,
    geometryFiles,
    materialFiles,
    componentFiles,
    componentById,
    openScripts,
    selected,
    selectedComponent,
    sceneSettings,
    gridSettings,
    nodeMatches,
    select,
    selectComponent,
    attach,
    hideChrome,
    failBoot,
    readTransform,
    setScreen,
    setPlaying,
    togglePause,
    setTool,
    toggleSpace,
    toggleSnap,
    setShading,
    setView,
    toggleExpanded,
    toggleSection,
    duplicateSelection,
    deleteSelection,
    rename,
    beginRename,
    commitRename,
    reparent,
    setPosition,
    setRotation,
    setScale,
    setVisible,
    setCastShadow,
    setReceiveShadow,
    setBackground,
    setBackgroundIntensity,
    setEnvironmentIntensity,
    setShadows,
    setShadowType,
    setGridVisible,
    setGridSize,
    setGridDivisions,
    setGridCenter,
    setGridColor,
    setGridPosition,
    resetGrid,
    resetScene,
    setGeometryType,
    setGeometryParam,
    resetGeometryType,
    resetGeometryParam,
    setLightColor,
    setLightIntensity,
    setLightRange,
    setSpotAngle,
    setSpotPenumbra,
    readLookAt,
    setLookAtEnabled,
    setLookAt,
    resetLookAtEnabled,
    resetLookAt,
    resetLight,
    resetTransform,
    resetVisible,
    resetCastShadow,
    resetReceiveShadow,
    setMaterialFlags,
    setMaterialName,
    resetMaterialName,
    resetMaterialSource,
    resetMaterialFlag,
    applyBoundPreset,
    applyNodePreset,
    onTslChange,
    compileBound,
    saveOpenScene,
    loadOpenScene,
    openSceneFile,
    openSaveAs,
    confirmSaveAs,
    confirmSaveAndOpen,
    discardAndOpen,
    cancelSceneDialog,
    deleteSceneFile,
    openInstanceDialog,
    instanceScene,
    makeLocal,
    openCreate,
    createFromDraft,
    openComponentDialog,
    createComponent,
    updateComponent,
    attachComponent,
    moveComponent,
    removeComponent,
    setComponentEnabled,
    setComponentParameter,
    addComponentToSelection,
    requestDeleteComponent,
    cancelDeleteComponent,
    confirmDeleteComponent,
    editComponent,
    showScript,
    closeScript,
    saveActiveScript,
    onScriptChange,
    openHelp,
    closeHelp,
    selectMaterialFile,
    selectGeometryFile,
    applyAssetPreset,
    closePopups,
    openPropertyMenu,
    openMenu,
    openContextMenu,
    openComponentMenu,
    openComponentFileMenu,
    openGeometryMenu,
    openMaterialMenu,
    onKeyDown,
    onPointerDown,
    undo,
    redo,
    goToHistory,
    showHistory,
  }
})

function castShadowOf(object: THREE.Object3D): boolean | null {
  if (!('castShadow' in object)) return null
  const value = (object as THREE.Object3D & { castShadow?: unknown }).castShadow
  return typeof value === 'boolean' ? value : null
}
