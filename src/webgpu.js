import {
  Scene,
  PerspectiveCamera,
  Mesh,
  Clock,
  Vector2,
  IcosahedronGeometry
} from 'three'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { WebGPURenderer } from 'three/webgpu'

import { TSLSampleMaterial } from './materials/TSLSampleMaterial'

class App {
  #resizeCallback = () => this.#onResize()

  constructor(container, opts = { debug: false }) {
    this.container = document.querySelector(container)
    this.screen = new Vector2(this.container.clientWidth, this.container.clientHeight)

    this.hasDebug = opts.debug
  }

  async init() {
    this.#createScene()
    this.#createCamera()
    this.#createRenderer()

    this.#createMesh()
    this.#createClock()
    this.#addListeners()
    this.#createControls()

    if (this.hasDebug) {
      const { Debug } = await import('./Debug.js')
      new Debug(this)

      const { default: Stats } = await import('stats.js')
      this.stats = new Stats()
      document.body.appendChild(this.stats.dom)
    }

    this.renderer.setAnimationLoop(() => {
      this.stats?.begin()

      this.#update()
      this.#render()

      this.stats?.end()
    })

    console.log(this)
  }

  destroy() {
    this.renderer.dispose()
    this.#removeListeners()
  }

  #update() {
    // const elapsed = this.clock.getElapsedTime()

    // this.mesh.rotation.y = elapsed*0.22
    // this.mesh.rotation.z = elapsed*0.15
  }

  #render() {
    this.renderer.render(this.scene, this.camera)
  }

  #createScene() {
    this.scene = new Scene()
  }

  #createCamera() {
    this.camera = new PerspectiveCamera(75, this.screen.x / this.screen.y, 0.1, 100)
    this.camera.position.set(0, 0.8, 3)
  }

  #createRenderer() {
    const params = {
      alpha: true,
      antialias: window.devicePixelRatio === 1
    }

    this.renderer = new WebGPURenderer({ ...params })

    this.container.appendChild(this.renderer.domElement)

    this.renderer.setSize(this.screen.x, this.screen.y)
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio))
    this.renderer.setClearColor(0x121212)
    this.renderer.physicallyCorrectLights = true
  }

  /**
   * Create a box with a PBR material
   */
  #createMesh() {
    const geometry = new IcosahedronGeometry(1, 7)

    this.mesh = new Mesh(geometry, TSLSampleMaterial)

    this.scene.add(this.mesh)
  }

  #createControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
  }

  #createClock() {
    this.clock = new Clock()
  }

  #addListeners() {
    window.addEventListener('resize', this.#resizeCallback, { passive: true })
  }

  #removeListeners() {
    window.removeEventListener('resize', this.#resizeCallback, { passive: true })
  }

  #onResize() {
    this.screen.set(this.container.clientWidth, this.container.clientHeight)

    this.camera.aspect = this.screen.x / this.screen.y
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(this.screen.x, this.screen.y)
  }
}

window._APP_ = new App('#app', {
  debug: window.location.hash.includes('debug')
})

window._APP_.init()
