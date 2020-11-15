import { Scene } from 'three/src/scenes/Scene'
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer'
import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera'
import { BoxBufferGeometry } from 'three/src/geometries/BoxBufferGeometry'
import { MeshStandardMaterial } from 'three/src/materials/MeshStandardMaterial'
import { Mesh } from 'three/src/objects/Mesh'
import { PointLight } from 'three/src/lights/PointLight'

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
    this.renderer.setClearColor(0x121212)
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
    this.renderer.gammaOutput = true
    this.renderer.physicallyCorrectLights = true
  }

  _createLight() {
    this.pointLight = new PointLight(0xff0055, 100, 100, 2)
    this.pointLight.position.set(8, 10, 13)
    this.scene.add(this.pointLight)
  }

  _createBox() {
    const geometry = new BoxBufferGeometry(5, 5, 5, 1, 1, 1)
    const material = new MeshStandardMaterial({ color: 0xffff00 })
    this.box = new Mesh(geometry, material)
    this.scene.add(this.box)
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
