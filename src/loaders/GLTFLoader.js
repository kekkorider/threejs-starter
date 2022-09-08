import { GLTFLoader as ThreeGLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

export class GLTFLoader {
  constructor(manager) {
    this.loader = new ThreeGLTFLoader(manager)
  }

  /**
   * Load a single model or an array of models.
   *
   * @param {String|String[]} resources Single URL or array of URLs of the model(s) to load.
   * @returns Object|Object[]
   */
  async load(resources) {
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
  #loadModel(url) {
    return new Promise(resolve => {
      this.loader.load(url, model => {
        resolve(model)
      })
    })
  }
}
