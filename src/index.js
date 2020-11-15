import { Scene } from 'three/src/scenes/Scene'
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer'
import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera'
import { BoxBufferGeometry } from 'three/src/geometries/BoxBufferGeometry'
import { MeshStandardMaterial } from 'three/src/materials/MeshStandardMaterial'
import { Mesh } from 'three/src/objects/Mesh'
import { PointLight } from 'three/src/lights/PointLight'
import { Color } from 'three/src/math/Color'

import Tweakpane from 'tweakpane'

class App {
  constructor(container) {
    this.container = document.querySelector(container)

    this._resizeCb = () => this._onResize()
  }

  init() {
    this._createScene()
    this._createCamera()
    this._createRenderer()
    this._createBox()
    this._createLight()
    this._addListeners()

    this._createDebugPanel()

    this.renderer.setAnimationLoop(() => {
      this._update()
      this._render()
    })
  }

  destroy() {
    this.renderer.dispose()
    this._removeListeners()
  }

  _update() {
    this.box.rotation.y += 0.01
    this.box.rotation.z += 0.006
  }

  _render() {
    this.renderer.render(this.scene, this.camera)
  }

  _createScene() {
    this.scene = new Scene()
  }

  _createCamera() {
    this.camera = new PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 100)
    this.camera.position.set(0, 1, 10)
  }

  _createRenderer() {
    this.renderer = new WebGLRenderer({
      alpha: true,
      antialias: true
    })

    this.container.appendChild(this.renderer.domElement)

    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setClearColor(0x121212)
    this.renderer.gammaOutput = true
    this.renderer.physicallyCorrectLights = true
  }

  _createLight() {
    this.pointLight = new PointLight(0xff0055, 500, 100, 2)
    this.pointLight.position.set(8, 10, 13)
    this.scene.add(this.pointLight)
  }

  _createBox() {
    const geometry = new BoxBufferGeometry(1, 1, 1, 1, 1, 1)

    const material = new MeshStandardMaterial({ color: 0xffffff })

    this.box = new Mesh(geometry, material)
    this.box.scale.x = 5
    this.box.scale.y = 5
    this.box.scale.z = 5
    this.scene.add(this.box)
  }

  _createDebugPanel() {
    this.pane = new Tweakpane()

    /**
     * Scene configuration
     */
    const sceneFolder = this.pane.addFolder({ title: 'Scene' })

    let params = { background: { r: 18, g: 18, b: 18 } }

    sceneFolder.addInput(params, 'background', { label: 'Background Color' }).on('change', value => {
      this.renderer.setClearColor(new Color(`rgb(${parseInt(value.r)}, ${parseInt(value.g)}, ${parseInt(value.b)})`))
    })

    /**
     * Box configuration
     */
    const boxFolder = this.pane.addFolder({ title: 'Box' })

    params = { width: 5, height: 5, depth: 5, metalness: 0.5, roughness: 0.5 }

    boxFolder.addInput(params, 'width', { label: 'Width', min: 1, max: 8 })
      .on('change', value => this.box.scale.x = value)

    boxFolder.addInput(params, 'height', { label: 'Height', min: 1, max: 8 })
      .on('change', value => this.box.scale.y = value)

    boxFolder.addInput(params, 'depth', { label: 'Depth', min: 1, max: 8 })
      .on('change', value => this.box.scale.z = value)

    boxFolder.addInput(params, 'metalness', { label: 'Metallic', min: 0, max: 1 })
      .on('change', value => this.box.material.metalness = value)

    boxFolder.addInput(params, 'roughness', { label: 'Roughness', min: 0, max: 1 })
      .on('change', value => this.box.material.roughness = value)

    /**
     * Light configuration
     */
    const lightFolder = this.pane.addFolder({ title: 'Light' })

    params = {
      color: { r: 255, g: 0, b: 85 },
      intensity: 500
    }

    lightFolder.addInput(params, 'color', { label: 'Color' }).on('change', value => {
      this.pointLight.color = new Color(`rgb(${parseInt(value.r)}, ${parseInt(value.g)}, ${parseInt(value.b)})`)
    })

    lightFolder.addInput(params, 'intensity', { label: 'Intensity', min: 0, max: 1000 }).on('change', value => {
      this.pointLight.intensity = value
    })
  }

  _addListeners() {
    window.addEventListener('resize', this._resizeCb, { passive: true })
  }

  _removeListeners() {
    window.removeEventListener('resize', this._resizeCb, { passive: true })
  }

  _onResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
  }
}

const app = new App('#app')
app.init()
