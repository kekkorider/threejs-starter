
import {
  Scene,
  WebGLRenderer,
  PerspectiveCamera,
  BoxGeometry,
  MeshStandardMaterial,
  ShaderMaterial,
  Mesh,
  PointLight,
  Color,
  Clock
} from 'three'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

// Remove this if you don't need to load any 3D model
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'

import { Pane } from 'tweakpane'

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
    this._createShadedBox()
    this._createLight()
    this._createClock()
    this._addListeners()
    this._createControls()
    this._createDebugPanel()

    this._loadModel().then(() => {
      this.renderer.setAnimationLoop(() => {
        this._update()
        this._render()
      })

      console.log(this)
    })
  }

  destroy() {
    this.renderer.dispose()
    this._removeListeners()
  }

  _update() {
    const elapsed = this.clock.getElapsedTime()

    this.box.rotation.y = elapsed
    this.box.rotation.z = elapsed*0.6

    this.shadedBox.rotation.y = elapsed
    this.shadedBox.rotation.z = elapsed*0.6
  }

  _render() {
    this.renderer.render(this.scene, this.camera)
  }

  _createScene() {
    this.scene = new Scene()
  }

  _createCamera() {
    this.camera = new PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 100)
    this.camera.position.set(-4, 4, 10)
  }

  _createRenderer() {
    this.renderer = new WebGLRenderer({
      alpha: true,
      antialias: true
    })

    this.container.appendChild(this.renderer.domElement)

    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio))
    this.renderer.setClearColor(0x121212)
    this.renderer.physicallyCorrectLights = true
  }

  _createLight() {
    this.pointLight = new PointLight(0xff0055, 500, 100, 2)
    this.pointLight.position.set(0, 10, 13)
    this.scene.add(this.pointLight)
  }

  /**
   * Create a box with a PBR material
   */
  _createBox() {
    const geometry = new BoxGeometry(1, 1, 1, 1, 1, 1)

    const material = new MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.7,
      roughness: 0.35
    })

    this.box = new Mesh(geometry, material)

    this.box.scale.x = 4
    this.box.scale.y = 4
    this.box.scale.z = 4

    this.box.position.x = -5

    this.scene.add(this.box)
  }

  /**
   * Create a box with a custom ShaderMaterial
   */
  _createShadedBox() {
    const geometry = new BoxGeometry(1, 1, 1, 1, 1, 1)

    const material = new ShaderMaterial({
      vertexShader: require('./shaders/sample.vertex.glsl'),
      fragmentShader: require('./shaders/sample.fragment.glsl'),
      transparent: true
    })

    this.shadedBox = new Mesh(geometry, material)

    this.shadedBox.scale.x = 4
    this.shadedBox.scale.y = 4
    this.shadedBox.scale.z = 4

    this.shadedBox.position.x = 5

    this.scene.add(this.shadedBox)
  }

  /**
   * Load a 3D model and append it to the scene
   */
  _loadModel() {
    return new Promise(resolve => {
      this.loader = new GLTFLoader()

      const dracoLoader = new DRACOLoader()
      dracoLoader.setDecoderPath('/')

      this.loader.setDRACOLoader(dracoLoader)

      this.loader.load('./model.glb', gltf => {
        const mesh = gltf.scene.children[0]

        mesh.scale.x = 4
        mesh.scale.y = 4
        mesh.scale.z = 4

        mesh.position.z = 5

        const material = new ShaderMaterial({
          vertexShader: require('./shaders/sample.vertex.glsl'),
          fragmentShader: require('./shaders/sample.fragment.glsl'),
          transparent: true,
          wireframe: true
        })

        mesh.material = material

        this.scene.add(mesh)

        resolve()
      })
    })
  }

  _createControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
  }

  _createDebugPanel() {
    this.pane = new Pane()

    /**
     * Scene configuration
     */
    const sceneFolder = this.pane.addFolder({ title: 'Scene' })

    let params = { background: { r: 18, g: 18, b: 18 } }

    sceneFolder.addInput(params, 'background', { label: 'Background Color' }).on('change', e => {
      this.renderer.setClearColor(new Color(e.value.r / 255, e.value.g / 255, e.value.b / 255))
    })

    /**
     * Box configuration
     */
    const boxFolder = this.pane.addFolder({ title: 'Box' })

    boxFolder.addInput(this.box.scale, 'x', { label: 'Width', min: 1, max: 8 })
      .on('change', e => this.shadedBox.scale.x = e.value)

    boxFolder.addInput(this.box.scale, 'y', { label: 'Height', min: 1, max: 8 })
      .on('change', e => this.shadedBox.scale.y = e.value)

    boxFolder.addInput(this.box.scale, 'z', { label: 'Depth', min: 1, max: 8 })
      .on('change', e => this.shadedBox.scale.z = e.value)

    boxFolder.addInput(this.box.material, 'metalness', { label: 'Metallic', min: 0, max: 1 })

    boxFolder.addInput(this.box.material, 'roughness', { label: 'Roughness', min: 0, max: 1 })

    /**
     * Light configuration
     */
    const lightFolder = this.pane.addFolder({ title: 'Light' })

    params = {
      color: { r: 255, g: 0, b: 85 }
    }

    lightFolder.addInput(params, 'color', { label: 'Color' }).on('change', e => {
      this.pointLight.color = new Color(e.value.r / 255, e.value.g / 255, e.value.b / 255)
    })

    lightFolder.addInput(this.pointLight, 'intensity', { label: 'Intensity', min: 0, max: 1000 })
  }

  _createClock() {
    this.clock = new Clock()
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
