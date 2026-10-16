import * as THREE from 'three/webgpu'
import { ThreeContextEvents } from 'three-start'
import type { ThreeStart } from 'three-start'

import { CodeEditor } from './codeEditor'
import { icon } from './icons'
import {
  GEOMETRY_CATALOG,
  defaultParams,
  geometryEntry,
  triangleCount,
  type GeometryType,
  type ParamSpec,
} from './geometry'
import { EditorState, NODE_TYPES, type NodeKind, type ToolMode } from './state'
import {
  DEFAULT_FLAGS,
  TSL_HELP,
  TSL_PRESETS,
  escapeText,
  matchingPresetId,
  presetById,
  type MaterialSide,
} from './tsl'
import { setViewportShading } from '../webgl/index'

type ScreenName = '2d' | '3d' | 'script' | 'game' | 'asset'

const TOOLS: { id: ToolMode, icon: string, label: string, key: string }[] = [
  { id: 'select', icon: 'select', label: 'Select', key: 'Q' },
  { id: 'translate', icon: 'move', label: 'Move', key: 'W' },
  { id: 'rotate', icon: 'rotate', label: 'Rotate', key: 'E' },
  { id: 'scale', icon: 'scale', label: 'Scale', key: 'R' },
]

export class GameEditor {
  readonly state = new EditorState()
  readonly viewport: HTMLDivElement
  private readonly root: HTMLElement
  private readonly treeEl: HTMLElement
  private readonly filesEl: HTMLElement
  private readonly inspectorEl: HTMLElement
  private readonly outputEl: HTMLElement
  private readonly tslBar: HTMLElement
  private readonly codeHost: HTMLElement
  private readonly scriptHost: HTMLElement
  private readonly metaEl: HTMLElement
  private readonly bottomBody: HTMLElement
  private readonly code = new CodeEditor()
  private readonly dialogCode = new CodeEditor()
  private boundMaterialId: string | null = null
  private screen: ScreenName = '3d'
  private ready = false
  private dialog: HTMLElement | null = null
  private compileTimer = 0
  private gizmoPointer = false
  private collapsed = new Set<string>()
  private expanded = new Set<string>()
  private inspectorQuery = ''
  private transformInputs = new Map<string, HTMLInputElement>()
  private draft = this.freshDraft()

  constructor() {
    this.root = document.createElement('div')
    this.root.className = 'editor'
    this.root.dataset.screen = '3d'
    this.root.innerHTML = this.shell()
    this.viewport = this.root.querySelector('.viewport') as HTMLDivElement
    this.treeEl = this.root.querySelector('.scene-tree')!
    this.filesEl = this.root.querySelector('.files')!
    this.inspectorEl = this.root.querySelector('.inspector')!
    this.outputEl = this.root.querySelector('.output')!
    this.tslBar = this.root.querySelector('.tsl-bar')!
    this.codeHost = this.root.querySelector('.code-host')!
    this.scriptHost = this.root.querySelector('.screen-script')!
    this.metaEl = this.root.querySelector('.vp-meta')!
    this.bottomBody = this.root.querySelector('.bottom-body')!
    this.codeHost.append(this.code.el)
    this.code.setOnChange((source) => this.onCodeChange(source))
    this.code.setDisabled(true)
    this.dialogCode.setOnChange((source) => {
      this.draft.source = source
      this.draft.presetId = matchingPresetId(source) ?? 'custom'
      const select = this.dialog?.querySelector<HTMLSelectElement>('[data-draft-preset]')
      if (select) select.value = this.draft.presetId
    })
    this.bindShell()
    this.renderAssetLibrary()
    this.renderOutput()
    this.syncMaterialEditor(true)
  }

  mount(app: HTMLElement): void {
    app.replaceChildren(this.root)
  }

  attach(starter: ThreeStart): void {
    this.state.attach(starter)
    this.ready = true
    for (const node of this.state.nodes.values()) this.expanded.add(node.id)
    this.state.select(this.state.rootId)
    this.refresh()
    this.bindViewport(starter)
    starter.ctx.on(ThreeContextEvents.Update, () => {
      this.writeTransformFields()
      this.writeMeta()
    })
  }

  failBoot(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error)
    this.state.log(message, 'error')
    this.renderOutput()
    const banner = document.createElement('div')
    banner.className = 'boot-error'
    banner.textContent = `The 3D viewport failed to start. ${message}`
    this.viewport.append(banner)
    this.openBottom('output')
  }

  private freshDraft() {
    const preset = presetById('lit')
    return {
      kind: 'MeshInstance3D' as NodeKind,
      query: '',
      name: '',
      geometryType: 'box' as GeometryType,
      params: defaultParams('box'),
      presetId: preset.id,
      source: preset.source,
      flags: { ...DEFAULT_FLAGS },
      color: '#fff4e4',
      ground: '#3c342c',
      intensity: 2.4,
      range: 12,
      angle: 35,
      penumbra: 0.4,
    }
  }

  private shell(): string {
    const screens: { id: ScreenName, icon: string, label: string }[] = [
      { id: '2d', icon: 'screen-2d', label: '2D' },
      { id: '3d', icon: 'screen-3d', label: '3D' },
      { id: 'script', icon: 'script', label: 'Script' },
      { id: 'game', icon: 'game', label: 'Game' },
      { id: 'asset', icon: 'asset', label: 'AssetLib' },
    ]
    return `
      <header class="topbar">
        <nav class="menus">
          ${['Scene', 'Project', 'Debug', 'Editor', 'Help'].map((name) => `<button class="menu-btn" data-menu="${name}">${name}</button>`).join('')}
        </nav>
        <div class="screens">
          ${screens.map((screen) => `<button class="screen-btn${screen.id === '3d' ? ' active' : ''}" data-screen="${screen.id}">${icon(screen.icon)}<span>${screen.label}</span></button>`).join('')}
        </div>
        <div class="playback">
          <button class="icon-btn play" data-action="play" title="Play (F5)">${icon('play')}</button>
          <button class="icon-btn pause" data-action="pause" title="Pause">${icon('pause')}</button>
          <button class="icon-btn stop" data-action="stop" title="Stop (F8)">${icon('stop')}</button>
        </div>
      </header>
      <div class="workspace">
        <aside class="docks left">
          <section class="dock scene-dock">
            <div class="dock-title">Scene</div>
            <div class="dock-tools">
              <button class="icon-btn" data-action="add" title="Add Child Node (Ctrl+A)">${icon('add')}</button>
              <button class="icon-btn" data-action="duplicate" title="Duplicate (Ctrl+D)">${icon('duplicate')}</button>
              <button class="icon-btn danger" data-action="delete" title="Delete (Del)">${icon('delete')}</button>
            </div>
            <input class="filter scene-filter" placeholder="Filter nodes" />
            <div class="tree scene-tree"></div>
          </section>
          <div class="splitter h" data-split="files"></div>
          <section class="dock files-dock">
            <div class="dock-title">FileSystem</div>
            <input class="filter file-filter" placeholder="Filter files" />
            <div class="tree files"></div>
          </section>
        </aside>
        <div class="splitter x" data-split="left"></div>
        <div class="center">
          <div class="scene-tabs">
            <button class="scene-tab active">${icon('scene')} World.tscn</button>
            <span class="spacer"></span>
            <button class="icon-btn distraction" data-action="distract" title="Distraction Free Mode">${icon('expand')}</button>
          </div>
          <div class="center-body">
            <div class="stage">
              <div class="viewport-wrap">
                <div class="viewport"></div>
                <div class="vp-toolbar">
                  <div class="tool-group">
                    ${TOOLS.map((tool) => `<button class="tool-btn${tool.id === 'translate' ? ' active' : ''}" data-tool="${tool.id}" title="${tool.label} (${tool.key})">${icon(tool.icon)}</button>`).join('')}
                  </div>
                  <div class="tool-group">
                    <button class="tool-btn" data-action="space" title="Toggle local/world space">${icon('world')}</button>
                    <button class="tool-btn" data-action="snap" title="Use snap — 0.5 m, 15°, 0.1">${icon('snap')}</button>
                  </div>
                  <div class="tool-group">
                    <select data-action="view" title="Viewport view">
                      <option value="persp">Perspective</option>
                      <option value="top">Top</option>
                      <option value="front">Front</option>
                      <option value="right">Right</option>
                    </select>
                    <select data-action="shading" title="Viewport shading">
                      <option value="shaded">Shaded</option>
                      <option value="debug">Debug Split</option>
                    </select>
                  </div>
                </div>
                <div class="vp-meta"></div>
              </div>
              <div class="placeholder screen-2d">
                <h2>2D</h2>
                <p>This scene has no 2D nodes. MeshInstance3D objects are created and edited in the 3D workspace.</p>
              </div>
              <div class="placeholder script-stage screen-script"></div>
              <div class="placeholder screen-asset asset-grid"></div>
            </div>
            <div class="splitter y" data-split="bottom"></div>
            <section class="bottom">
              <div class="bottom-tabs">
                <button class="bottom-tab active" data-bottom="tsl">TSL</button>
                <button class="bottom-tab" data-bottom="output">Output</button>
              </div>
              <div class="bottom-body" data-tab="tsl">
                <div class="tsl-pane">
                  <div class="tsl-bar"></div>
                  <div class="code-host"></div>
                </div>
                <div class="output"></div>
              </div>
            </section>
          </div>
        </div>
        <div class="splitter x" data-split="right"></div>
        <aside class="docks right">
          <section class="dock inspector-dock">
            <div class="dock-title">Inspector</div>
            <div class="inspector-tools">
              <input class="filter inspector-filter" placeholder="Filter properties" />
            </div>
            <div class="inspector"></div>
          </section>
        </aside>
      </div>
    `
  }

  private bindShell(): void {
    this.root.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      if (!target.closest('.menu-pop') && !target.closest('.menu-btn')) this.closePopups()
      const menu = target.closest<HTMLButtonElement>('[data-menu]')
      if (menu?.dataset.menu && menu.classList.contains('menu-btn')) {
        this.openMenu(menu, menu.dataset.menu)
        return
      }
      const screen = target.closest<HTMLButtonElement>('[data-screen]')
      if (screen?.dataset.screen) this.setScreen(screen.dataset.screen as ScreenName)
      const action = target.closest<HTMLButtonElement>('[data-action]')?.dataset.action
      if (action === 'play') this.setPlaying(true)
      if (action === 'pause') this.togglePause()
      if (action === 'stop') this.setPlaying(false)
      if (action === 'add') this.openCreateDialog()
      if (action === 'duplicate') this.duplicateSelection()
      if (action === 'delete') this.deleteSelection()
      if (action === 'distract') this.root.classList.toggle('distraction')
      if (action === 'space') this.toggleSpace()
      if (action === 'snap') this.toggleSnap()
      const tool = target.closest<HTMLButtonElement>('[data-tool]')?.dataset.tool as ToolMode | undefined
      if (tool) this.setTool(tool)
      const bottom = target.closest<HTMLButtonElement>('[data-bottom]')?.dataset.bottom
      if (bottom) this.openBottom(bottom)
    })

    this.root.querySelector<HTMLSelectElement>('[data-action="view"]')?.addEventListener('change', (event) => {
      this.state.setView((event.target as HTMLSelectElement).value as 'persp' | 'top' | 'front' | 'right')
    })
    this.root.querySelector<HTMLSelectElement>('[data-action="shading"]')?.addEventListener('change', (event) => {
      const mode = (event.target as HTMLSelectElement).value as 'shaded' | 'debug'
      this.state.shading = mode
      setViewportShading(mode)
    })

    this.treeEl.addEventListener('click', (event) => this.onTreeClick(event))
    this.treeEl.addEventListener('dblclick', (event) => {
      const row = (event.target as HTMLElement).closest<HTMLElement>('[data-node]')
      if (row?.dataset.node) this.beginRename(row.dataset.node)
    })
    this.treeEl.addEventListener('contextmenu', (event) => {
      const row = (event.target as HTMLElement).closest<HTMLElement>('[data-node]')
      if (!row?.dataset.node) return
      event.preventDefault()
      this.select(row.dataset.node)
      this.openContextMenu(event.clientX, event.clientY, row.dataset.node)
    })
    this.treeEl.addEventListener('dragstart', (event) => {
      const row = (event.target as HTMLElement).closest<HTMLElement>('[data-node]')
      if (!row?.dataset.node) return
      event.dataTransfer?.setData('text/plain', row.dataset.node)
      event.dataTransfer!.effectAllowed = 'move'
    })
    this.treeEl.addEventListener('dragover', (event) => {
      const row = (event.target as HTMLElement).closest<HTMLElement>('[data-node]')
      if (!row) return
      event.preventDefault()
      this.treeEl.querySelectorAll('.drop-target').forEach((element) => element.classList.remove('drop-target'))
      row.classList.add('drop-target')
    })
    this.treeEl.addEventListener('drop', (event) => {
      const row = (event.target as HTMLElement).closest<HTMLElement>('[data-node]')
      const id = event.dataTransfer?.getData('text/plain')
      if (!row?.dataset.node || !id) return
      event.preventDefault()
      this.state.reparent(id, row.dataset.node)
      this.renderTree()
    })
    this.filesEl.addEventListener('click', (event) => this.onFileClick(event))

    const sceneFilter = this.root.querySelector<HTMLInputElement>('.scene-filter')!
    const fileFilter = this.root.querySelector<HTMLInputElement>('.file-filter')!
    const inspectorFilter = this.root.querySelector<HTMLInputElement>('.inspector-filter')!
    sceneFilter.addEventListener('input', () => this.renderTree())
    fileFilter.addEventListener('input', () => this.renderFiles())
    inspectorFilter.addEventListener('input', () => {
      this.inspectorQuery = inspectorFilter.value.trim().toLowerCase()
      this.renderInspector()
    })

    this.bindSplitter(this.root.querySelector('[data-split="left"]')!, 'x', (delta) => {
      this.setMetric('--left', this.metric('--left', 272) + delta, 180, 520)
    })
    this.bindSplitter(this.root.querySelector('[data-split="right"]')!, 'x', (delta) => {
      this.setMetric('--right', this.metric('--right', 318) - delta, 220, 560)
    })
    this.bindSplitter(this.root.querySelector('[data-split="bottom"]')!, 'y', (delta) => {
      this.root.classList.remove('bottom-collapsed')
      this.setMetric('--bottom', this.metric('--bottom', 236) - delta, 120, 520)
    })
    this.bindSplitter(this.root.querySelector('[data-split="files"]')!, 'y', (delta) => {
      this.setMetric('--files', this.metric('--files', 200) + delta, 90, 420)
    })

    window.addEventListener('keydown', (event) => this.onKeyDown(event))
    window.addEventListener('pointerdown', (event) => {
      const target = event.target as HTMLElement
      if (!target.closest('.context-menu') && !target.closest('.menu-pop')) this.closePopups()
    })
  }

  private bindViewport(starter: ThreeStart): void {
    const canvas = starter.ctx.renderer.domElement
    canvas.addEventListener('pointerdown', (event) => {
      this.gizmoPointer = Boolean(this.state.controls?.dragging || this.state.controls?.axis)
      if (event.button === 0) this.pointerOrigin = { x: event.clientX, y: event.clientY }
    })
    canvas.addEventListener('pointerup', (event) => {
      if (event.button !== 0 || this.gizmoPointer || this.state.playing || this.screen === 'game') return
      const moved = Math.hypot(event.clientX - this.pointerOrigin.x, event.clientY - this.pointerOrigin.y)
      if (moved > 5) return
      const rect = canvas.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      this.select(this.state.pick(x, y))
    })
    canvas.addEventListener('contextmenu', (event) => event.preventDefault())
    this.state.controls?.addEventListener('objectChange', () => this.writeTransformFields())
  }

  private pointerOrigin = { x: 0, y: 0 }

  private onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null
    const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      this.compileBound(true)
      return
    }
    if (typing || this.dialog) return

    const key = event.key.toLowerCase()
    if ((event.ctrlKey || event.metaKey) && key === 'a') {
      event.preventDefault()
      this.openCreateDialog()
    } else if ((event.ctrlKey || event.metaKey) && key === 'd') {
      event.preventDefault()
      this.duplicateSelection()
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      this.deleteSelection()
    } else if (event.key === 'F2') {
      const id = this.state.selectedId
      if (id) this.beginRename(id)
    } else if (key === 'f' && !event.ctrlKey && !event.metaKey) {
      this.state.focusSelected()
    } else if (key === 'q') this.setTool('select')
    else if (key === 'w') this.setTool('translate')
    else if (key === 'e') this.setTool('rotate')
    else if (key === 'r') this.setTool('scale')
    else if (key === 'y') this.toggleSnap()
    else if (event.key === 'F5') {
      event.preventDefault()
      this.setPlaying(true)
    } else if (event.key === 'F8') {
      event.preventDefault()
      this.setPlaying(false)
    } else if (event.key === 'Escape' && this.screen === 'game') this.setPlaying(false)
  }

  private setScreen(screen: ScreenName): void {
    if (screen === 'game') {
      this.setPlaying(true)
      return
    }
    if (this.state.playing) this.setPlaying(false)
    this.screen = screen
    this.root.dataset.screen = screen
    this.root.querySelectorAll<HTMLButtonElement>('[data-screen]').forEach((button) => {
      button.classList.toggle('active', button.dataset.screen === screen)
    })
    if (screen === 'script') this.scriptHost.append(this.code.el)
    else this.codeHost.append(this.code.el)
    if (screen === '3d' || screen === 'script') this.openBottom('tsl')
  }

  private setPlaying(playing: boolean): void {
    if (!this.ready && playing) return
    this.state.setPlaying(playing)
    this.root.querySelector('.play')?.classList.toggle('active', playing)
    this.root.querySelector('.pause')?.classList.remove('active')
    if (playing) {
      this.screen = 'game'
      this.root.dataset.screen = 'game'
      this.root.querySelectorAll<HTMLButtonElement>('[data-screen]').forEach((button) => {
        button.classList.toggle('active', button.dataset.screen === 'game')
      })
    } else if (this.screen === 'game') {
      this.setScreen('3d')
    }
    this.writeMeta()
  }

  private togglePause(): void {
    this.state.setPaused(!this.state.paused)
    this.root.querySelector('.pause')?.classList.toggle('active', this.state.paused)
  }

  private setTool(tool: ToolMode): void {
    this.state.setTool(tool)
    this.root.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((button) => {
      button.classList.toggle('active', button.dataset.tool === tool)
    })
  }

  private toggleSpace(): void {
    const next = this.state.space === 'world' ? 'local' : 'world'
    this.state.setSpace(next)
    const button = this.root.querySelector<HTMLButtonElement>('[data-action="space"]')
    if (button) {
      button.innerHTML = icon(next === 'local' ? 'local' : 'world')
      button.classList.toggle('active', next === 'local')
      button.title = next === 'local' ? 'Local space' : 'World space'
    }
  }

  private toggleSnap(): void {
    this.state.setSnap(!this.state.snap)
    this.root.querySelector('[data-action="snap"]')?.classList.toggle('active', this.state.snap)
  }

  private openBottom(tab: string): void {
    const collapsed = this.root.classList.contains('bottom-collapsed')
    const current = this.bottomBody.dataset.tab
    if (!collapsed && current === tab) {
      this.root.classList.add('bottom-collapsed')
      return
    }
    this.root.classList.remove('bottom-collapsed')
    this.bottomBody.dataset.tab = tab
    this.root.querySelectorAll<HTMLButtonElement>('[data-bottom]').forEach((button) => {
      button.classList.toggle('active', button.dataset.bottom === tab)
    })
    if (tab === 'output') this.renderOutput()
  }

  private refresh(): void {
    this.renderTree()
    this.renderFiles()
    this.renderInspector()
    this.renderOutput()
    this.syncMaterialEditor(true)
    this.writeMeta()
  }

  private select(id: string | null): void {
    this.state.select(id)
    this.renderTree()
    this.renderInspector()
    this.syncMaterialEditor(false)
    this.writeMeta()
  }

  private renderTree(): void {
    const query = this.root.querySelector<HTMLInputElement>('.scene-filter')?.value.trim().toLowerCase() ?? ''
    const root = this.state.nodes.get(this.state.rootId)
    this.treeEl.innerHTML = ''
    if (!root) {
      this.treeEl.innerHTML = `<div class="empty-note">Scene is empty.</div>`
      return
    }
    const fragment = document.createDocumentFragment()
    this.appendNodeRow(fragment, root, 0, query)
    this.treeEl.append(fragment)
  }

  private appendNodeRow(host: DocumentFragment | HTMLElement, nodeIdOrNode: string | { id: string }, depth: number, query: string): boolean {
    const node = this.state.nodes.get(typeof nodeIdOrNode === 'string' ? nodeIdOrNode : nodeIdOrNode.id)
    if (!node) return false
    const childMatches = node.childIds.map((childId) => this.nodeMatches(childId, query))
    const selfMatch = !query || node.name.toLowerCase().includes(query)
    if (query && !selfMatch && !childMatches.some(Boolean)) return false

    const row = document.createElement('div')
    row.className = `tree-row${node.id === this.state.selectedId ? ' selected' : ''}`
    row.dataset.node = node.id
    row.draggable = !node.isRoot
    row.style.paddingLeft = `${6 + depth * 14}px`
    const twist = document.createElement('button')
    twist.className = `twist${node.childIds.length === 0 ? ' empty' : ''}${this.expanded.has(node.id) ? '' : ' collapsed'}`
    twist.dataset.expand = node.id
    twist.innerHTML = icon('chevron-down')
    const glyph = document.createElement('span')
    glyph.className = `kind-icon ${kindClass(node.kind)}`
    glyph.innerHTML = icon(kindIcon(node.kind))
    const label = document.createElement('span')
    label.className = 'label'
    label.textContent = node.name
    row.append(twist, glyph, label)
    host.append(row)

    if (this.expanded.has(node.id) || query) {
      node.childIds.forEach((childId, index) => {
        if (!query || childMatches[index] || this.state.nodes.get(childId)?.name.toLowerCase().includes(query)) {
          this.appendNodeRow(host, childId, depth + 1, query)
        }
      })
    }
    return true
  }

  private nodeMatches(id: string, query: string): boolean {
    if (!query) return true
    const node = this.state.nodes.get(id)
    if (!node) return false
    if (node.name.toLowerCase().includes(query)) return true
    return node.childIds.some((childId) => this.nodeMatches(childId, query))
  }

  private onTreeClick(event: MouseEvent): void {
    const target = event.target as HTMLElement
    const expand = target.closest<HTMLButtonElement>('[data-expand]')
    if (expand?.dataset.expand) {
      const id = expand.dataset.expand
      if (this.expanded.has(id)) this.expanded.delete(id)
      else this.expanded.add(id)
      this.renderTree()
      return
    }
    const row = target.closest<HTMLElement>('[data-node]')
    if (row?.dataset.node) this.select(row.dataset.node)
  }

  private beginRename(id: string): void {
    const node = this.state.nodes.get(id)
    if (!node || node.isRoot) return
    const row = this.treeEl.querySelector<HTMLElement>(`[data-node="${id}"]`)
    const label = row?.querySelector('.label')
    if (!row || !label) return
    const input = document.createElement('input')
    input.className = 'rename-input'
    input.value = node.name
    label.replaceWith(input)
    input.focus()
    input.select()
    const commit = () => {
      this.state.rename(id, input.value)
      this.renderTree()
      this.renderInspector()
    }
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') input.blur()
      if (event.key === 'Escape') {
        input.value = node.name
        input.blur()
      }
    })
    input.addEventListener('blur', commit, { once: true })
  }

  private renderFiles(): void {
    const query = this.root.querySelector<HTMLInputElement>('.file-filter')?.value.trim().toLowerCase() ?? ''
    const rows: string[] = []
    const scene = 'res://World.tscn'
    if (!query || scene.toLowerCase().includes(query)) {
      rows.push(fileRow('scene', scene, 'scene', this.state.selectedId === this.state.rootId))
    }
    const geometries = [...this.state.geometries.values()]
    const materials = [...this.state.materials.values()]
    if (geometries.length) rows.push(`<div class="group-label">res://meshes</div>`)
    for (const geometry of geometries) {
      const path = `res://meshes/${geometry.name}.tres`
      if (query && !path.toLowerCase().includes(query)) continue
      rows.push(fileRow('meshfile', path, 'mesh', false, `data-geometry="${geometry.id}"`))
    }
    if (materials.length) rows.push(`<div class="group-label">res://materials</div>`)
    for (const material of materials) {
      const path = `res://materials/${material.name}.tsl`
      if (query && !path.toLowerCase().includes(query)) continue
      const selected = material.id === this.boundMaterialId
      rows.push(fileRow('material', path, 'mat', selected, `data-material="${material.id}"`))
    }
    this.filesEl.innerHTML = rows.join('') || `<div class="empty-note">No resources yet. Create a MeshInstance3D.</div>`
  }

  private onFileClick(event: MouseEvent): void {
    const row = (event.target as HTMLElement).closest<HTMLElement>('.file-row')
    if (!row) return
    if (row.dataset.scene !== undefined || row.classList.contains('scene')) {
      this.select(this.state.rootId)
      return
    }
    const geometryId = row.dataset.geometry
    if (geometryId) {
      const user = this.state.usersOfGeometry(geometryId)[0]
      if (user) this.select(user.id)
      return
    }
    const materialId = row.dataset.material
    if (!materialId) return
    const user = this.state.usersOfMaterial(materialId)[0]
    if (user) this.select(user.id)
    else {
      this.boundMaterialId = null
      this.syncMaterialEditor(true, materialId)
    }
    this.setScreen(this.screen === '2d' || this.screen === 'asset' ? '3d' : this.screen)
    this.openBottom('tsl')
  }

  private renderInspector(): void {
    this.transformInputs.clear()
    const node = this.state.selected()
    if (!node) {
      this.inspectorEl.innerHTML = `<div class="empty-note">Select a node to edit its properties.</div>`
      return
    }
    this.inspectorEl.innerHTML = ''
    const head = document.createElement('div')
    head.className = 'node-head'
    const glyph = document.createElement('span')
    glyph.className = `kind-icon ${kindClass(node.kind)}`
    glyph.innerHTML = icon(kindIcon(node.kind))
    const name = document.createElement('input')
    name.value = node.name
    name.disabled = node.isRoot
    name.addEventListener('change', () => {
      this.state.rename(node.id, name.value)
      name.value = node.name
      this.renderTree()
    })
    head.append(glyph, name)
    const inherits = document.createElement('div')
    inherits.className = 'inherits'
    inherits.textContent = NODE_TYPES.find((entry) => entry.kind === node.kind)?.inherits ?? node.kind
    this.inspectorEl.append(head, inherits)

    const query = this.inspectorQuery
    const show = (label: string) => !query || label.toLowerCase().includes(query)

    if (!node.isRoot && (show('position') || show('rotation') || show('scale') || show('transform'))) {
      this.inspectorEl.append(this.transformSection(node.id))
    }

    if (node.kind === 'MeshInstance3D') this.inspectorEl.append(this.geometrySection(node.id), this.materialSection(node.id))
    if (node.kind !== 'Node3D' && node.kind !== 'MeshInstance3D') this.inspectorEl.append(this.lightSection(node.id))

    if (show('visible') || show('shadow') || show('visibility')) this.inspectorEl.append(this.visibilitySection(node.id))
  }

  private transformSection(id: string): HTMLElement {
    const node = this.state.nodes.get(id)!
    const body = document.createElement('div')
    body.className = 'section-b'
    body.append(
      this.vecRow('Position', 'pos', node.object.position, (axis, value) => this.state.setPosition(id, axis, value)),
      this.vecRow('Rotation', 'rot', {
        x: THREE.MathUtils.radToDeg(node.object.rotation.x),
        y: THREE.MathUtils.radToDeg(node.object.rotation.y),
        z: THREE.MathUtils.radToDeg(node.object.rotation.z),
      }, (axis, value) => this.state.setRotationDegrees(id, axis, value), 0.4),
      this.vecRow('Scale', 'scl', node.object.scale, (axis, value) => this.state.setScale(id, axis, value), 0.005),
    )
    return this.section('Transform', 'transform', body)
  }

  private geometrySection(id: string): HTMLElement {
    const resource = this.state.geometryOf(id)
    const body = document.createElement('div')
    body.className = 'section-b'
    const button = document.createElement('button')
    button.className = 'resource-btn'
    button.textContent = resource ? resource.name : 'Imported'
    button.addEventListener('click', (event) => this.openGeometryMenu(event.currentTarget as HTMLElement, id))
    body.append(prop('Mesh', button))
    if (resource) {
      const typeSelect = selectEl(GEOMETRY_CATALOG.map((entry) => ({ value: entry.type, label: entry.label })), resource.type, (value) => {
        this.state.setGeometryType(id, value as GeometryType)
        this.renderInspector()
        this.renderFiles()
        this.writeMeta()
      })
      body.append(prop('Type', typeSelect))
      for (const spec of geometryEntry(resource.type).params) {
        body.append(this.paramRow(id, spec))
      }
      const users = this.state.usersOfGeometry(resource.id).length
      if (users > 1) body.append(note(`Shared by ${users} nodes.`))
    } else {
      body.append(note('This mesh was loaded with its own geometry. Create a primitive to replace it.'))
    }
    const section = this.section('Geometry', 'geometry', body)
    section.classList.add('sub', 'mesh')
    return section
  }

  private paramRow(id: string, spec: ParamSpec): HTMLElement {
    const resource = this.state.geometryOf(id)!
    const input = document.createElement('input')
    input.type = 'number'
    input.min = String(spec.min)
    input.max = String(spec.max)
    input.step = String(spec.step)
    input.value = formatNumber(resource.params[spec.key] ?? spec.default)
    const write = (value: number) => {
      this.state.setGeometryParam(id, spec.key, value)
      const next = this.state.geometryOf(id)?.params[spec.key]
      if (next !== undefined && document.activeElement !== input) input.value = formatNumber(next)
      this.writeMeta()
    }
    input.addEventListener('change', () => write(Number(input.value)))
    return prop(spec.label, input, (delta) => {
      const current = Number(input.value)
      const next = spec.integer
        ? current + (Math.trunc(delta / 6) || Math.sign(delta))
        : current + delta * 0.02
      write(next)
    })
  }

  private materialSection(id: string): HTMLElement {
    const resource = this.state.materialOf(id)
    const body = document.createElement('div')
    body.className = 'section-b'
    const button = document.createElement('button')
    button.className = 'resource-btn'
    button.textContent = resource ? resource.name : 'Empty'
    button.addEventListener('click', (event) => this.openMaterialMenu(event.currentTarget as HTMLElement, id))
    body.append(prop('Material', button))
    if (resource) {
      const preset = selectEl(
        [{ value: 'custom', label: 'Custom' }, ...TSL_PRESETS.map((item) => ({ value: item.id, label: item.name }))],
        matchingPresetId(resource.source) ?? 'custom',
        (value) => {
          if (value === 'custom') return
          this.state.applyPreset(resource.id, value)
          this.syncMaterialEditor(true)
          this.renderInspector()
        },
      )
      preset.dataset.preset = resource.id
      body.append(prop('Preset', preset))
      const side = selectEl(
        [{ value: 'front', label: 'Front' }, { value: 'back', label: 'Back' }, { value: 'double', label: 'Double' }],
        resource.side,
        (value) => this.state.setMaterialFlags(resource.id, { side: value as MaterialSide }),
      )
      body.append(prop('Cull', side))
      body.append(checkProp('Transparent', resource.transparent, (value) => this.state.setMaterialFlags(resource.id, { transparent: value })))
      body.append(checkProp('Wireframe', resource.wireframe, (value) => this.state.setMaterialFlags(resource.id, { wireframe: value })))
      const edit = document.createElement('button')
      edit.className = 'btn'
      edit.textContent = 'Edit TSL'
      edit.addEventListener('click', () => this.openBottom('tsl'))
      body.append(prop('', edit))
      if (resource.error) body.append(note(resource.error))
    } else {
      body.append(note('Assign a TSL material to drive this surface with Three Shading Language.'))
    }
    const section = this.section('Material', 'material', body)
    section.classList.add('sub', 'mat')
    return section
  }

  private lightSection(id: string): HTMLElement {
    const node = this.state.nodes.get(id)!
    const light = node.object as THREE.Light
    const body = document.createElement('div')
    body.className = 'section-b'
    body.append(prop('Color', colorInput('#' + light.color.getHexString(), (value) => this.state.setLightColor(id, value))))
    body.append(prop('Energy', numberInput(light.intensity, 0, 50, 0.1, (value) => this.state.setLightIntensity(id, value))))
    if (light instanceof THREE.HemisphereLight) {
      body.append(prop('Ground', colorInput('#' + light.groundColor.getHexString(), (value) => this.state.setLightColor(id, value, 'ground'))))
    }
    if (light instanceof THREE.PointLight || light instanceof THREE.SpotLight) {
      body.append(prop('Range', numberInput(light.distance, 0, 200, 0.1, (value) => this.state.setLightRange(id, value))))
    }
    if (light instanceof THREE.SpotLight) {
      body.append(prop('Angle', numberInput(THREE.MathUtils.radToDeg(light.angle), 1, 90, 1, (value) => this.state.setSpotAngle(id, value))))
      body.append(prop('Penumbra', numberInput(light.penumbra, 0, 1, 0.01, (value) => this.state.setSpotPenumbra(id, value))))
    }
    if (node.kind === 'DirectionalLight3D' || node.kind === 'SpotLight3D') {
      body.append(note('Rotate the node to aim it.'))
    }
    return this.section('Light', 'light', body)
  }

  private visibilitySection(id: string): HTMLElement {
    const node = this.state.nodes.get(id)!
    const body = document.createElement('div')
    body.className = 'section-b'
    body.append(checkProp('Visible', node.object.visible, (value) => {
      this.state.setVisible(id, value)
      this.renderTree()
    }))
    if (node.object instanceof THREE.Mesh || node.object instanceof THREE.Light) {
      const shadow = node.object as THREE.Object3D & { castShadow?: boolean }
      if (typeof shadow.castShadow === 'boolean') {
        body.append(checkProp('Cast Shadow', shadow.castShadow, (value) => this.state.setCastShadow(id, value)))
      }
    }
    if (node.object instanceof THREE.Mesh) {
      body.append(checkProp('Receive Shadow', node.object.receiveShadow, (value) => this.state.setReceiveShadow(id, value)))
    }
    return this.section('Visibility', 'visibility', body)
  }

  private section(title: string, key: string, body: HTMLElement): HTMLElement {
    const section = document.createElement('div')
    section.className = `section${this.collapsed.has(key) ? ' collapsed' : ''}`
    const header = document.createElement('button')
    header.className = 'section-h'
    header.innerHTML = `${icon('chevron-down')}<span>${title}</span>`
    header.addEventListener('click', () => {
      if (this.collapsed.has(key)) this.collapsed.delete(key)
      else this.collapsed.add(key)
      section.classList.toggle('collapsed')
    })
    section.append(header, body)
    return section
  }

  private vecRow(
    label: string,
    prefix: string,
    value: { x: number, y: number, z: number },
    onAxis: (axis: 'x' | 'y' | 'z', value: number) => void,
    sensitivity = 0.01,
  ): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'vec3'
    for (const axis of ['x', 'y', 'z'] as const) {
      const name = document.createElement('span')
      name.className = `axis ${axis}`
      name.textContent = axis
      const input = document.createElement('input')
      input.type = 'number'
      input.step = '0.01'
      input.value = formatNumber(value[axis])
      this.transformInputs.set(`${prefix}-${axis}`, input)
      const write = (next: number) => {
        input.value = formatNumber(next)
        onAxis(axis, next)
      }
      input.addEventListener('change', () => write(Number(input.value)))
      bindScrub(name, (delta) => write(Number(input.value) + delta * sensitivity))
      wrap.append(name, input)
    }
    return prop(label, wrap)
  }

  private writeTransformFields(): void {
    const node = this.state.selected()
    if (!node || this.screen === 'game') return
    const sets: { prefix: string, value: { x: number, y: number, z: number } }[] = [
      { prefix: 'pos', value: node.object.position },
      {
        prefix: 'rot',
        value: {
          x: THREE.MathUtils.radToDeg(node.object.rotation.x),
          y: THREE.MathUtils.radToDeg(node.object.rotation.y),
          z: THREE.MathUtils.radToDeg(node.object.rotation.z),
        },
      },
      { prefix: 'scl', value: node.object.scale },
    ]
    for (const set of sets) {
      for (const axis of ['x', 'y', 'z'] as const) {
        const input = this.transformInputs.get(`${set.prefix}-${axis}`)
        if (!input || document.activeElement === input) continue
        input.value = formatNumber(set.value[axis])
      }
    }
  }

  private writeMeta(): void {
    const node = this.state.selected()
    if (!node) {
      this.metaEl.textContent = ''
      return
    }
    const mesh = node.object instanceof THREE.Mesh ? node.object : null
    const tris = mesh ? triangleCount(mesh.geometry) : 0
    this.metaEl.innerHTML = `<strong>${escapeText(node.name)}</strong>${tris ? ` · ${Math.round(tris)} tris` : ''}`
  }

  private syncMaterialEditor(force: boolean, explicitId?: string | null): void {
    const selected = this.state.selected()
    const id = explicitId === undefined ? selected?.materialId ?? null : explicitId
    if (!force && id === this.boundMaterialId) {
      this.renderTslBar()
      return
    }
    this.boundMaterialId = id
    const resource = id ? this.state.materials.get(id) : undefined
    this.code.setDisabled(!resource)
    this.code.setValue(resource?.source ?? (id ? '' : '// Select a mesh and assign a TSL material.\n'))
    this.renderTslBar()
    this.renderFiles()
  }

  private renderTslBar(): void {
    const resource = this.boundMaterialId ? this.state.materials.get(this.boundMaterialId) : undefined
    this.tslBar.innerHTML = ''
    const name = document.createElement('span')
    name.className = 'name'
    name.textContent = resource ? `${resource.name}.tsl` : 'No TSL material'
    const preset = selectEl(
      [{ value: 'custom', label: 'Custom' }, ...TSL_PRESETS.map((item) => ({ value: item.id, label: item.name }))],
      resource ? matchingPresetId(resource.source) ?? 'custom' : 'custom',
      (value) => {
        if (!resource || value === 'custom') return
        this.state.applyPreset(resource.id, value)
        this.syncMaterialEditor(true)
        this.renderInspector()
      },
    )
    preset.disabled = !resource
    const status = document.createElement('span')
    status.className = `status${resource?.error ? ' error' : ' ok'}`
    status.textContent = resource?.error ?? (resource ? 'Compiled' : '')
    const apply = document.createElement('button')
    apply.className = 'btn'
    apply.textContent = 'Apply'
    apply.disabled = !resource
    apply.addEventListener('click', () => this.compileBound(true))
    const spacer = document.createElement('span')
    spacer.className = 'spacer'
    this.tslBar.append(name, preset, spacer, status, apply)
  }

  private onCodeChange(source: string): void {
    if (!this.boundMaterialId) return
    this.state.setMaterialSource(this.boundMaterialId, source)
    window.clearTimeout(this.compileTimer)
    this.compileTimer = window.setTimeout(() => this.compileBound(false), 380)
    const presetId = matchingPresetId(source) ?? 'custom'
    const preset = this.tslBar.querySelector('select')
    if (preset) preset.value = presetId
    const inspectorPreset = this.inspectorEl.querySelector<HTMLSelectElement>('[data-preset]')
    if (inspectorPreset) inspectorPreset.value = presetId
  }

  private compileBound(log: boolean): void {
    const id = this.boundMaterialId
    if (!id) return
    const result = this.state.compileMaterial(id)
    if (!result.ok) {
      if (log) this.state.log(result.error, 'error')
    }
    this.renderTslBar()
    if (log) {
      this.renderOutput()
      if (!result.ok) this.openBottom('output')
    }
  }

  private renderOutput(): void {
    if (this.state.logs.length === 0) {
      this.outputEl.innerHTML = `<div class="log-line"><span class="time"></span><span>Output will list created nodes and shader errors.</span></div>`
      return
    }
    this.outputEl.innerHTML = this.state.logs.map((line) => (
      `<div class="log-line ${line.level}"><span class="time">${line.time}</span><span>${escapeText(line.message)}</span></div>`
    )).join('')
    this.outputEl.scrollTop = this.outputEl.scrollHeight
  }

  private renderAssetLibrary(): void {
    const host = this.root.querySelector('.screen-asset')!
    host.innerHTML = ''
    for (const preset of TSL_PRESETS) {
      const card = document.createElement('article')
      card.className = 'asset-card'
      card.innerHTML = `<h3>${escapeText(preset.name)}</h3><p>${escapeText(preset.description)}</p>`
      const row = document.createElement('div')
      row.className = 'row'
      const create = document.createElement('button')
      create.className = 'btn primary'
      create.textContent = 'Create Mesh'
      create.addEventListener('click', () => this.openCreateDialog('MeshInstance3D', preset.id))
      const apply = document.createElement('button')
      apply.className = 'btn'
      apply.textContent = 'Apply'
      apply.addEventListener('click', () => {
        const node = this.state.selected()
        if (!node || node.kind !== 'MeshInstance3D') {
          this.state.log('Select a MeshInstance3D to apply this material.', 'warn')
          this.renderOutput()
          this.openBottom('output')
          return
        }
        const resource = node.materialId
          ? (this.state.applyPreset(node.materialId, preset.id), this.state.materialOf(node.id))
          : this.state.newMaterialFor(node.id, preset.id)
        if (resource) {
          this.refresh()
          this.setScreen('3d')
        }
      })
      row.append(create, apply)
      card.append(row)
      host.append(card)
    }
  }

  private duplicateSelection(): void {
    const id = this.state.selectedId
    if (!this.ready || !id) return
    this.state.duplicate(id)
    const selected = this.state.selectedId
    if (selected) this.expanded.add(this.state.nodes.get(selected)?.parentId ?? selected)
    this.refresh()
  }

  private deleteSelection(): void {
    const id = this.state.selectedId
    if (!this.ready || !id) return
    this.state.deleteNode(id)
    this.refresh()
  }

  private openCreateDialog(kind: NodeKind = 'MeshInstance3D', presetId?: string): void {
    if (!this.ready) return
    this.closeDialog()
    this.draft = this.freshDraft()
    this.draft.kind = kind
    if (presetId) {
      const preset = presetById(presetId)
      this.draft.presetId = preset.id
      this.draft.source = preset.source
    }
    const back = document.createElement('div')
    back.className = 'modal-back'
    back.addEventListener('pointerdown', (event) => {
      if (event.target === back) this.closeDialog()
    })
    const dialog = document.createElement('div')
    dialog.className = 'dialog'
    dialog.innerHTML = `
      <div class="dialog-title"><span>Create New Node</span><span class="spacer"></span></div>
      <div class="dialog-body">
        <div class="dialog-list">
          <input class="filter dialog-filter" placeholder="Filter nodes" />
          <div class="tree dialog-nodes"></div>
        </div>
        <div class="dialog-detail"></div>
      </div>
      <div class="dialog-actions">
        <label class="prop-label">Name</label>
        <input type="text" data-draft-name placeholder="MeshInstance3D" style="width:220px;height:28px;background:#1e1e1e;border:1px solid #121212;border-radius:3px;padding:0 8px" />
        <span class="spacer"></span>
        <button class="btn" data-cancel>Cancel</button>
        <button class="btn primary" data-create>Create</button>
      </div>
    `
    const close = document.createElement('button')
    close.className = 'icon-btn'
    close.innerHTML = icon('close')
    close.addEventListener('click', () => this.closeDialog())
    dialog.querySelector('.dialog-title')!.append(close)
    back.append(dialog)
    this.root.append(back)
    this.dialog = back
    dialog.querySelector('[data-cancel]')!.addEventListener('click', () => this.closeDialog())
    dialog.querySelector('[data-create]')!.addEventListener('click', () => this.submitCreate())
    dialog.querySelector<HTMLInputElement>('[data-draft-name]')!.addEventListener('input', (event) => {
      this.draft.name = (event.target as HTMLInputElement).value
    })
    dialog.querySelector('.dialog-filter')!.addEventListener('input', (event) => {
      this.draft.query = (event.target as HTMLInputElement).value
      this.renderDialogNodes()
    })
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.closeDialog()
      if (event.key === 'Enter' && (event.target as HTMLElement).tagName !== 'TEXTAREA') {
        event.preventDefault()
        this.submitCreate()
      }
    })
    this.renderDialogNodes()
    this.renderDialogDetail()
  }

  private renderDialogNodes(): void {
    const host = this.dialog?.querySelector('.dialog-nodes')
    if (!host) return
    host.innerHTML = ''
    const query = this.draft.query.trim().toLowerCase()
    const groups = ['Node', 'Node3D', 'Light3D']
    for (const group of groups) {
      const entries = NODE_TYPES.filter((entry) => {
        const inGroup = group === 'Node'
          ? entry.kind === 'Node3D'
          : group === 'Node3D'
            ? entry.kind === 'MeshInstance3D'
            : entry.group === 'Light3D'
        if (!inGroup) return false
        return !query || entry.label.toLowerCase().includes(query)
      })
      if (!entries.length) continue
      const label = document.createElement('div')
      label.className = 'group-label'
      label.textContent = group
      host.append(label)
      for (const entry of entries) {
        const row = document.createElement('div')
        row.className = `tree-row${entry.kind === this.draft.kind ? ' selected' : ''}`
        row.style.paddingLeft = '12px'
        row.innerHTML = `<span class="kind-icon ${kindClass(entry.kind)}">${icon(kindIcon(entry.kind))}</span><span class="label">${entry.label}</span>`
        row.addEventListener('click', () => {
          this.draft.kind = entry.kind
          this.renderDialogNodes()
          this.renderDialogDetail()
        })
        row.addEventListener('dblclick', () => {
          this.draft.kind = entry.kind
          this.submitCreate()
        })
        host.append(row)
      }
    }
  }

  private renderDialogDetail(): void {
    const host = this.dialog?.querySelector('.dialog-detail')
    if (!host) return
    const entry = NODE_TYPES.find((item) => item.kind === this.draft.kind) ?? NODE_TYPES[1]!
    host.innerHTML = ''
    const title = document.createElement('h2')
    title.textContent = entry.label
    const inherits = document.createElement('div')
    inherits.className = 'inherits'
    inherits.style.padding = '0'
    inherits.textContent = entry.inherits
    const desc = document.createElement('p')
    desc.className = 'desc'
    desc.textContent = entry.description
    host.append(title, inherits, desc)

    if (this.draft.kind === 'MeshInstance3D') {
      const typeSelect = selectEl(GEOMETRY_CATALOG.map((item) => ({ value: item.type, label: item.label })), this.draft.geometryType, (value) => {
        this.draft.geometryType = value as GeometryType
        this.draft.params = defaultParams(this.draft.geometryType)
        this.renderDialogDetail()
      })
      host.append(prop('Geometry', typeSelect))
      for (const spec of geometryEntry(this.draft.geometryType).params) {
        const input = numberInput(this.draft.params[spec.key] ?? spec.default, spec.min, spec.max, spec.step, (value) => {
          this.draft.params[spec.key] = value
        })
        host.append(prop(spec.label, input))
      }
      const preset = selectEl(TSL_PRESETS.map((item) => ({ value: item.id, label: item.name })), this.draft.presetId, (value) => {
        const next = presetById(value)
        this.draft.presetId = next.id
        this.draft.source = next.source
        this.dialogCode.setValue(next.source)
      })
      preset.dataset.draftPreset = 'true'
      host.append(prop('TSL Preset', preset))
      this.dialogCode.setValue(this.draft.source)
      host.append(this.dialogCode.el)
      const error = document.createElement('div')
      error.className = 'hint'
      error.dataset.draftError = 'true'
      host.append(error)
    } else if (this.draft.kind !== 'Node3D') {
      host.append(prop('Color', colorInput(this.draft.color, (value) => { this.draft.color = value })))
      host.append(prop('Energy', numberInput(this.draft.intensity, 0, 50, 0.1, (value) => { this.draft.intensity = value })))
      if (this.draft.kind === 'HemisphereLight3D') {
        host.append(prop('Ground', colorInput(this.draft.ground, (value) => { this.draft.ground = value })))
      }
      if (this.draft.kind === 'OmniLight3D' || this.draft.kind === 'SpotLight3D') {
        host.append(prop('Range', numberInput(this.draft.range, 0, 200, 0.1, (value) => { this.draft.range = value })))
      }
      if (this.draft.kind === 'SpotLight3D') {
        host.append(prop('Angle', numberInput(this.draft.angle, 1, 90, 1, (value) => { this.draft.angle = value })))
        host.append(prop('Penumbra', numberInput(this.draft.penumbra, 0, 1, 0.01, (value) => { this.draft.penumbra = value })))
      }
    }
  }

  private submitCreate(): void {
    if (!this.ready) return
    const parentId = this.state.selectedId
    try {
      if (this.draft.kind === 'Node3D') {
        this.state.createNode3D(parentId, this.draft.name)
      } else if (this.draft.kind === 'MeshInstance3D') {
        this.state.createMesh({
          name: this.draft.name,
          parentId,
          geometryType: this.draft.geometryType,
          params: { ...this.draft.params },
          source: this.dialogCode.value,
          flags: { ...this.draft.flags },
        })
      } else {
        this.state.createLight({
          kind: this.draft.kind,
          name: this.draft.name,
          parentId,
          color: this.draft.color,
          intensity: this.draft.intensity,
          range: this.draft.range,
          angle: this.draft.angle,
          penumbra: this.draft.penumbra,
          groundColor: this.draft.ground,
        })
      }
      const selected = this.state.selectedId
      if (selected) {
        const parent = this.state.nodes.get(selected)?.parentId
        if (parent) this.expanded.add(parent)
        this.expanded.add(selected)
      }
      this.closeDialog()
      this.refresh()
      this.openBottom('tsl')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const slot = this.dialog?.querySelector<HTMLElement>('[data-draft-error]')
      if (slot) slot.textContent = message
      this.state.log(message, 'error')
      this.renderOutput()
    }
  }

  private closeDialog(): void {
    this.dialog?.remove()
    this.dialog = null
  }

  private openHelp(): void {
    this.closeDialog()
    const back = document.createElement('div')
    back.className = 'modal-back'
    const dialog = document.createElement('div')
    dialog.className = 'dialog help'
    dialog.innerHTML = `<div class="dialog-title"><span>TSL Material Reference</span><span class="spacer"></span></div>`
    const close = document.createElement('button')
    close.className = 'icon-btn'
    close.innerHTML = icon('close')
    close.addEventListener('click', () => this.closeDialog())
    dialog.querySelector('.dialog-title')!.append(close)
    const body = document.createElement('pre')
    body.className = 'help-body'
    body.textContent = TSL_HELP
    dialog.append(body)
    back.append(dialog)
    back.addEventListener('pointerdown', (event) => {
      if (event.target === back) this.closeDialog()
    })
    this.root.append(back)
    this.dialog = back
  }

  private openGeometryMenu(anchor: HTMLElement, nodeId: string): void {
    const items: PopupItem[] = GEOMETRY_CATALOG.map((entry) => ({
      label: `New ${entry.label}`,
      action: () => {
        this.state.newGeometryFor(nodeId, entry.type)
        this.refresh()
      },
    }))
    const current = this.state.geometryOf(nodeId)
    if (current) {
      items.push({ separator: true, label: '', action: () => {} })
      items.push({
        label: 'Make Unique',
        action: () => {
          this.state.makeGeometryUnique(nodeId)
          this.refresh()
        },
      })
      for (const resource of this.state.geometries.values()) {
        if (resource.id === current.id) continue
        items.push({
          label: resource.name,
          action: () => {
            this.state.assignGeometry(nodeId, resource.id)
            this.refresh()
          },
        })
      }
    }
    this.openPopup(anchor.getBoundingClientRect(), items)
  }

  private openMaterialMenu(anchor: HTMLElement, nodeId: string): void {
    const items: PopupItem[] = TSL_PRESETS.map((preset) => ({
      label: `New ${preset.name}`,
      action: () => {
        this.state.newMaterialFor(nodeId, preset.id)
        this.refresh()
        this.openBottom('tsl')
      },
    }))
    const current = this.state.materialOf(nodeId)
    if (current) {
      items.push({ separator: true, label: '', action: () => {} })
      items.push({
        label: 'Make Unique',
        action: () => {
          this.state.makeMaterialUnique(nodeId)
          this.refresh()
        },
      })
      for (const resource of this.state.materials.values()) {
        if (resource.id === current.id) continue
        items.push({
          label: resource.name,
          action: () => {
            this.state.assignMaterial(nodeId, resource.id)
            this.refresh()
          },
        })
      }
    }
    this.openPopup(anchor.getBoundingClientRect(), items)
  }

  private openMenu(anchor: HTMLElement, name: string): void {
    this.closePopups()
    const selected = this.state.selected()
    const items: Record<string, PopupItem[]> = {
      Scene: [
        { label: 'Create Node…', shortcut: 'Ctrl+A', action: () => this.openCreateDialog() },
        { label: 'Duplicate', shortcut: 'Ctrl+D', disabled: !selected || selected.isRoot, action: () => this.duplicateSelection() },
        { label: 'Rename', shortcut: 'F2', disabled: !selected || selected.isRoot, action: () => selected && this.beginRename(selected.id) },
        { label: 'Delete', shortcut: 'Del', disabled: !selected || selected.isRoot, action: () => this.deleteSelection() },
        { separator: true, label: '', action: () => {} },
        { label: 'Focus Selection', shortcut: 'F', disabled: !selected || selected.isRoot, action: () => this.state.focusSelected() },
      ],
      Project: [
        { label: 'Project Settings', disabled: true, action: () => {} },
      ],
      Debug: [
        { label: this.state.paused ? 'Resume Simulation' : 'Pause Simulation', action: () => this.togglePause() },
        { label: 'Three.js Profiler', action: () => this.state.toggleProfiler() },
      ],
      Editor: [
        { label: 'Bottom Panel', action: () => this.root.classList.toggle('bottom-collapsed') },
        { label: 'Distraction Free Mode', action: () => this.root.classList.toggle('distraction') },
      ],
      Help: [
        { label: 'TSL Material Reference', action: () => this.openHelp() },
        { label: 'Editor Shortcuts', action: () => this.openShortcuts() },
      ],
    }
    const rect = anchor.getBoundingClientRect()
    this.openPopup(rect, items[name] ?? [], true)
    anchor.classList.add('open')
  }

  private openShortcuts(): void {
    this.closeDialog()
    const back = document.createElement('div')
    back.className = 'modal-back'
    const dialog = document.createElement('div')
    dialog.className = 'dialog help'
    dialog.innerHTML = `<div class="dialog-title"><span>Editor Shortcuts</span><span class="spacer"></span></div>`
    const close = document.createElement('button')
    close.className = 'icon-btn'
    close.innerHTML = icon('close')
    close.addEventListener('click', () => this.closeDialog())
    dialog.querySelector('.dialog-title')!.append(close)
    const body = document.createElement('pre')
    body.className = 'help-body'
    body.textContent = `Ctrl+A   Create node
Ctrl+D   Duplicate
Ctrl+S   Apply TSL
F2       Rename
Del      Delete
F        Focus selection
Q W E R  Select, move, rotate, scale
Y        Toggle snap
F5       Play
F8       Stop
Esc      Stop play, or close a dialog

Drag a scene-tree row onto another node to reparent it.
Drag the colored x / y / z labels to scrub a value.`
    dialog.append(body)
    back.append(dialog)
    back.addEventListener('pointerdown', (event) => {
      if (event.target === back) this.closeDialog()
    })
    this.root.append(back)
    this.dialog = back
  }

  private openContextMenu(x: number, y: number, id: string): void {
    const node = this.state.nodes.get(id)
    if (!node) return
    this.openPopup(new DOMRect(x, y, 0, 0), [
      { label: 'Add Child Node…', action: () => this.openCreateDialog() },
      { label: 'Rename', disabled: node.isRoot, action: () => this.beginRename(id) },
      { label: 'Duplicate', disabled: node.isRoot, action: () => this.duplicateSelection() },
      { label: 'Delete', disabled: node.isRoot, action: () => this.deleteSelection() },
      { separator: true, label: '', action: () => {} },
      { label: 'Focus', disabled: node.isRoot, action: () => this.state.focusSelected() },
    ])
  }

  private openPopup(rect: DOMRect, items: PopupItem[], alignStart = false): void {
    this.closePopups()
    const menu = document.createElement('div')
    menu.className = 'menu-pop'
    for (const item of items) {
      if (item.separator) {
        const sep = document.createElement('div')
        sep.className = 'menu-sep'
        menu.append(sep)
        continue
      }
      const button = document.createElement('button')
      button.className = `menu-item${item.disabled ? ' disabled' : ''}`
      button.innerHTML = `<span>${escapeText(item.label)}</span>${item.shortcut ? `<span class="shortcut">${item.shortcut}</span>` : ''}`
      button.addEventListener('click', (event) => {
        event.stopPropagation()
        if (item.disabled) return
        this.closePopups()
        item.action()
      })
      menu.append(button)
    }
    this.root.append(menu)
    const width = menu.offsetWidth
    const left = alignStart ? rect.left : Math.min(rect.left, window.innerWidth - width - 8)
    menu.style.left = `${Math.max(8, left)}px`
    menu.style.top = `${rect.bottom + 4}px`
  }

  private closePopups(): void {
    this.root.querySelectorAll('.menu-pop, .context-menu').forEach((element) => element.remove())
    this.root.querySelectorAll('.menu-btn.open').forEach((element) => element.classList.remove('open'))
  }

  private bindSplitter(element: HTMLElement, axis: 'x' | 'y', apply: (delta: number) => void): void {
    element.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return
      event.preventDefault()
      let last = axis === 'x' ? event.clientX : event.clientY
      const move = (ev: PointerEvent) => {
        const now = axis === 'x' ? ev.clientX : ev.clientY
        apply(now - last)
        last = now
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        document.body.style.cursor = ''
      }
      document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize'
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    })
  }

  private metric(name: string, fallback: number): number {
    const value = Number.parseFloat(getComputedStyle(this.root).getPropertyValue(name))
    return Number.isFinite(value) ? value : fallback
  }

  private setMetric(name: string, value: number, min: number, max: number): void {
    this.root.style.setProperty(name, `${Math.min(max, Math.max(min, value))}px`)
  }
}

interface PopupItem {
  label: string
  shortcut?: string
  disabled?: boolean
  separator?: boolean
  action: () => void
}

function kindIcon(kind: NodeKind): string {
  if (kind === 'MeshInstance3D') return 'mesh'
  if (kind === 'DirectionalLight3D') return 'light-dir'
  if (kind === 'OmniLight3D') return 'light-omni'
  if (kind === 'SpotLight3D') return 'light-spot'
  if (kind === 'HemisphereLight3D') return 'light-hemi'
  return 'node'
}

function kindClass(kind: NodeKind): string {
  if (kind === 'MeshInstance3D') return 'mesh'
  if (kind === 'Node3D') return 'node'
  return 'light'
}

function fileRow(iconName: string, label: string, tone: string, selected: boolean, extra = ''): string {
  const scene = iconName === 'scene' ? ' data-scene="world"' : ''
  return `<div class="file-row${selected ? ' selected' : ''}"${scene} ${extra}><span class="kind-icon ${tone}">${icon(iconName)}</span><span class="label">${escapeText(label)}</span></div>`
}

function prop(label: string, control: Node, scrub?: (delta: number) => void): HTMLElement {
  const row = document.createElement('div')
  row.className = 'prop'
  const name = document.createElement('div')
  name.className = `prop-label${scrub ? ' scrub' : ''}`
  name.textContent = label
  if (scrub) bindScrub(name, scrub)
  row.append(name, control)
  return row
}

function note(text: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'hint'
  element.textContent = text
  return element
}

function checkProp(label: string, checked: boolean, onChange: (value: boolean) => void): HTMLElement {
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.checked = checked
  input.addEventListener('change', () => onChange(input.checked))
  const wrap = document.createElement('label')
  wrap.className = 'check'
  wrap.append(input)
  return prop(label, wrap)
}

function numberInput(value: number, min: number, max: number, step: number, onChange: (value: number) => void): HTMLInputElement {
  const input = document.createElement('input')
  input.type = 'number'
  input.min = String(min)
  input.max = String(max)
  input.step = String(step)
  input.value = formatNumber(value)
  input.addEventListener('change', () => onChange(Number(input.value)))
  return input
}

function colorInput(value: string, onChange: (value: string) => void): HTMLInputElement {
  const input = document.createElement('input')
  input.type = 'color'
  input.value = value
  input.addEventListener('input', () => onChange(input.value))
  return input
}

function selectEl(options: { value: string, label: string }[], value: string, onChange: (value: string) => void): HTMLSelectElement {
  const select = document.createElement('select')
  for (const option of options) {
    const element = document.createElement('option')
    element.value = option.value
    element.textContent = option.label
    select.append(element)
  }
  select.value = value
  select.addEventListener('change', () => onChange(select.value))
  return select
}

function bindScrub(element: HTMLElement, apply: (delta: number) => void): void {
  element.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    event.preventDefault()
    let last = event.clientX
    const move = (ev: PointerEvent) => {
      const scale = ev.shiftKey ? 0.1 : 1
      apply((ev.clientX - last) * scale)
      last = ev.clientX
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      document.body.style.cursor = ''
    }
    document.body.style.cursor = 'ew-resize'
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  })
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const rounded = Math.round(value * 1000) / 1000
  return String(rounded)
}
