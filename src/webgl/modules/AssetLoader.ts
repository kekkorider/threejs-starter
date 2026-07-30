import { LoadingManager, TextureLoader, type Texture } from 'three/webgpu'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { ContextModule } from "three-start"

export class AssetLoaderModule extends ContextModule {
  private loadingManager: LoadingManager | null = null
  private gltfLoader: GLTFLoader | null = null
  private textureLoader: TextureLoader | null = null

  models: Map<string, GLTF> = new Map()
  textures: Map<string, Texture> = new Map()

  onAwake() {
    this.createLoadingManager()
    this.createTextureLoader()
    this.createGltfLoader()
  }

  createLoadingManager(): void {
    this.loadingManager = new LoadingManager()

    this.loadingManager.onProgress = (url: string, loaded: number, total: number) => {
      // In case the progress count is not correct, see this:
      // https://discourse.threejs.org/t/gltf-file-loaded-twice-when-loading-is-initiated-in-loadingmanager-inside-onprogress-callback/27799/2
      console.log(`Loaded ${loaded} resources out of ${total} -> ${url}`)
    }
  }

  createTextureLoader(): void {
    this.textureLoader = new TextureLoader(this.loadingManager as LoadingManager)
  }

  createGltfLoader(): void {
    this.gltfLoader = new GLTFLoader(this.loadingManager as LoadingManager)
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('/draco/')
    this.gltfLoader.setDRACOLoader(dracoLoader)
  }

  /**
   * Load a single texture or an array of textures.
   *
   * @param resources Single URL or array of URLs of the model(s) to load.
   */
  loadTextures(resources: string): Promise<Texture>
  loadTextures(resources: string[]): Promise<Texture[]>
  async loadTextures(resources: string | string[]): Promise<Texture | Texture[]> {
    if (Array.isArray(resources)) {
      return Promise.all(resources.map(url => this.#loadTexture(url)))
    }
    return this.#loadTexture(resources)
  }

  /**
   * Load a single texture.
   *
   * @param url The URL of the texture to load
   */
  #loadTexture(url: string): Promise<Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader!.load(url, (texture) => {
        this.textures.set(generateAssetName(url), texture)
        return resolve(texture)
      }, undefined, reject)
    })
  }

  /**
   * Load a single model or an array of models.
   *
   * @param resources Single URL or array of URLs of the model(s) to load.
   */
  loadModels(resources: string): Promise<GLTF>
  loadModels(resources: string[]): Promise<GLTF[]>
  async loadModels(resources: string | string[]): Promise<GLTF | GLTF[]> {
    if (Array.isArray(resources)) {
      return Promise.all(resources.map(url => this.#loadModel(url)))
    }
    return this.#loadModel(resources)
  }

  /**
   * Load a single model.
   *
   * @param url The URL of the model to load
   */
  #loadModel(url: string): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      this.gltfLoader!.load(url, (gltf) => {
        this.models.set(generateAssetName(url), gltf)
        return resolve(gltf)
      }, undefined, reject)
    })
  }
}

function generateAssetName(url: string): string {
  return url.split('/').pop()!.split('.').shift()!
}
