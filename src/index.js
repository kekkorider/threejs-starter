
import {
  Scene,
  WebGLRenderer,
  PerspectiveCamera,
  BoxGeometry,
  MeshStandardMaterial,
  Mesh,
  PointLight,
  Clock,
  Vector2
} from 'three'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

import { SampleShaderMaterial } from './materials/SampleShaderMaterial'
import { gltfLoader } from './loaders'

class App {
  #resizeCallback = () => this.#onResize()

  constructor(container, opts = { physics: false }) {
    this.container = document.querySelector(container)
    this.screen = new Vector2(this.container.clientWidth, this.container.clientHeight)
    this.hasPhysics = opts.physics
  }

  async init() {
    this.#createScene()
    this.#createCamera()
    this.#createRenderer()

    if (this.hasPhysics) {
      const { Simulation } = await import('./physics/Simulation')
      this.simulation = new Simulation(this)

      const { PhysicsBox } = await import('./physics/Box')
      this.PhysicsBox = PhysicsBox
    }

    this.#createBox()
    this.#createShadedBox()
    this.#createLight()
    this.#createClock()
    this.#addListeners()
    this.#createControls()

    await this.#loadModel()

    if (window.location.hash.includes('#debug')) {
      const { Debug } = await import('./Debug.js')
      new Debug(this)
    }

    this.renderer.setAnimationLoop(() => {
      this.#update()
      this.#render()
    })

    console.log(this)
  }

  destroy() {
    this.renderer.dispose()
    this.#removeListeners()
  }

  #update() {
    const elapsed = this.clock.getElapsedTime()

    this.box.rotation.y = elapsed
    this.box.rotation.z = elapsed*0.6

    this.shadedBox.rotation.y = elapsed
    this.shadedBox.rotation.z = elapsed*0.6

    this.simulation?.update()
  }

  #render() {
    this.renderer.render(this.scene, this.camera)
  }

  #createScene() {
    this.scene = new Scene()
  }

  #createCamera() {
    this.camera = new PerspectiveCamera(75, this.screen.x / this.screen.y, 0.1, 100)
    this.camera.position.set(-0.7, 0.8, 3)
  }

  #createRenderer() {
    this.renderer = new WebGLRenderer({
      alpha: true,
      antialias: window.devicePixelRatio === 1
    })

    this.container.appendChild(this.renderer.domElement)

    this.renderer.setSize(this.screen.x, this.screen.y)
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio))
    this.renderer.setClearColor(0x121212)
    this.renderer.physicallyCorrectLights = true
  }

  #createLight() {
    this.pointLight = new PointLight(0xff0055, 500, 100, 2)
    this.pointLight.position.set(0, 10, 13)
    this.scene.add(this.pointLight)
  }

  /**
   * Create a box with a PBR material
   */
  #createBox() {
    const geometry = new BoxGeometry(1, 1, 1, 1, 1, 1)

    const material = new MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.7,
      roughness: 0.35
    })

    this.box = new Mesh(geometry, material)
    this.box.position.x = -1.5

    this.scene.add(this.box)

    if (!this.hasPhysics) return

    const body = new this.PhysicsBox(this.box, this.scene)
    this.simulation.addItem(body)
  }

  /**
   * Create a box with a custom ShaderMaterial
   */
  #createShadedBox() {
    const geometry = new BoxGeometry(1, 1, 1, 1, 1, 1)

    this.shadedBox = new Mesh(geometry, SampleShaderMaterial)
    this.shadedBox.position.x = 1.5

    this.scene.add(this.shadedBox)
  }

  /**
   * Load a 3D model and append it to the scene
   */
  async #loadModel() {
    const gltf = await gltfLoader.load('/suzanne.glb')

    const mesh = gltf.scene.children[0]
    mesh.position.z = 1.5

    mesh.material = SampleShaderMaterial.clone()
    mesh.material.wireframe = true

    this.scene.add(mesh)
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

const app = new App('#app', { physics: true })
app.init()
