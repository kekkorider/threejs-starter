import { LoadingManager } from 'three/webgpu'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { ContextModule } from "three-start"

export class AssetLoaderModule extends ContextModule {
  private loadingManager: LoadingManager | null = null
  private gltfLoader: GLTFLoader | null = null

  onAwake() {
    this.loadingManager = new LoadingManager()
    this.loadingManager.onProgress = (url: string, loaded: number, total: number) => {
      // In case the progress count is not correct, see this:
      // https://discourse.threejs.org/t/gltf-file-loaded-twice-when-loading-is-initiated-in-loadingmanager-inside-onprogress-callback/27799/2
      console.log(`Loaded ${loaded} resources out of ${total} -> ${url}`)
    }

    this.gltfLoader = new GLTFLoader(this.loadingManager)
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('/draco/')
    this.gltfLoader.setDRACOLoader(dracoLoader)
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
      this.gltfLoader!.load(url, resolve, undefined, reject)
    })
  }
}
