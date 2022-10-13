
import {
  Scene,
  WebGLRenderer,
  PerspectiveCamera,
  BoxGeometry,
  MeshStandardMaterial,
  Mesh,
  PointLight,
  Clock,
  Vector2,
  PlaneGeometry,
  MeshBasicMaterial
} from 'three'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

import { SampleShaderMaterial } from './materials/SampleShaderMaterial'
import { gltfLoader } from './loaders'

class App {
  #resizeCallback = () => this.#onResize()

  constructor(container, opts = { physics: false, debug: false }) {
    this.container = document.querySelector(container)
    this.screen = new Vector2(this.container.clientWidth, this.container.clientHeight)

    this.hasPhysics = opts.physics
    this.hasDebug = opts.debug
  }

  async init() {
    this.#createScene()
    this.#createCamera()
    this.#createRenderer()

    if (this.hasPhysics) {
      const { Simulation } = await import('./physics/Simulation')
      this.simulation = new Simulation(this)

      const { PhysicsBox } = await import('./physics/Box')
      const { PhysicsFloor } = await import('./physics/Floor')

      Object.assign(this, { PhysicsBox, PhysicsFloor })
    }

    this.#createBox()
    this.#createShadedBox()
    this.#createLight()
    this.#createFloor()
    this.#createClock()
    this.#addListeners()
    this.#createControls()

    await this.#loadModel()

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
    const elapsed = this.clock.getElapsedTime()

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
    this.box.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    )

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

  #createFloor() {
    if (!this.hasPhysics) return

    const geometry = new PlaneGeometry(20, 20, 1, 1)
    const material = new MeshBasicMaterial({ color: 0x424242 })

    this.floor = new Mesh(geometry, material)
    this.floor.rotateX(-Math.PI*0.5)
    this.floor.position.set(0, -2, 0)

    this.scene.add(this.floor)

    const body = new this.PhysicsFloor(this.floor, this.scene)
    this.simulation.addItem(body)
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

window._APP_ = new App('#app', {
  physics: window.location.hash.includes('physics'),
  debug: window.location.hash.includes('debug')
})

window._APP_.init()
