import { LoadingManager } from 'three/webgpu'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
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
   * @param {String|String[]} resources Single URL or array of URLs of the model(s) to load.
   * @returns Object|Object[]
   */
  async loadModels(resources: string | string[]) {
    if (Array.isArray(resources)) {
      const promises = resources.map(url => this.#loadModel(url))
      return await Promise.all(promises)
    } else {
      return await this.#loadModel(resources)
    }
  }

  /**
   * Load a single model.
   *
   * @param {String} url The URL of the model to load
   * @returns Promise
   */
  #loadModel(url: string) {
    return new Promise(resolve => {
      this.gltfLoader!.load(url, (model: object) => {
        resolve(model)
      })
    })
  }
}
