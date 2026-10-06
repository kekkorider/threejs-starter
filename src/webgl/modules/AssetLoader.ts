import {
  LoadingManager,
  TextureLoader,
  type Texture,
  type TextureParameters,
  type DataTexture,
  type CompressedTexture,
  type WebGPURenderer
} from 'three/webgpu'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'
import { ContextModule } from "three-start"

export class AssetLoaderModule extends ContextModule {
  private loadingManager!: LoadingManager
  private gltfLoader!: GLTFLoader
  private textureLoader!: TextureLoader
  private hdrLoader!: HDRLoader
  private exrLoader!: EXRLoader
  private ktxLoader!: KTX2Loader

  private models: Map<string, GLTF> = new Map()
  private textures: Map<string, Texture> = new Map()
  private hdrs: Map<string, Texture> = new Map()
  private exrs: Map<string, Texture> = new Map()
  private ktx: Map<string, Texture> = new Map()

  onAwake() {
    this.createLoadingManager()
    this.createTextureLoader()
    this.createGltfLoader()
    this.createHdrLoader()
    this.createExrLoader()
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
    this.textureLoader = new TextureLoader(this.loadingManager)
  }

  createGltfLoader(): void {
    this.gltfLoader = new GLTFLoader(this.loadingManager)
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('/draco/')
    this.gltfLoader.setDRACOLoader(dracoLoader)
  }

  createHdrLoader(): void {
    this.hdrLoader = new HDRLoader(this.loadingManager)
  }

  createExrLoader(): void {
    this.exrLoader = new EXRLoader(this.loadingManager)
  }

  async createKTX2Loader(): Promise<void> {
    this.ktxLoader = new KTX2Loader(this.loadingManager)
    this.ktxLoader.setTranscoderPath('/basis/')

    this.ktxLoader.detectSupport(this.ctx.renderer as WebGPURenderer)
  }

  /**
   * Load a single HDR texture or an array of HDR textures.
   *
   * @param resources Single URL or array of URLs of the model(s) to load.
   * @param params The parameters to pass to the texture loader
   */
  loadHDR(resources: string, params?: TextureParameters): Promise<DataTexture>
  loadHDR(resources: string[], params?: TextureParameters): Promise<DataTexture[]>
  async loadHDR(resources: string | string[], params?: TextureParameters): Promise<DataTexture | DataTexture[]> {
    if (Array.isArray(resources)) {
      return Promise.all(resources.map(url => this.loadHDRTexture(url, params)) as Promise<DataTexture>[])
    }
    return this.loadHDRTexture(resources, params) as Promise<DataTexture>
  }

  /**
   * Load a single texture.
   *
   * @param url The URL of the texture to load
   * @param params The parameters to pass to the texture loader
   */
  private loadHDRTexture(url: string, params?: TextureParameters): Promise<DataTexture> {
    return new Promise((resolve, reject) => {
      this.hdrLoader!.load(url, (texture) => {
        this.applyTextureParams(texture, params)
        this.hdrs.set(generateAssetName(url), texture)
        return resolve(texture)
      }, undefined, reject)
    })
  }

  /**
   * Load a single HDR texture or an array of HDR textures.
   *
   * @param resources Single URL or array of URLs of the model(s) to load.
   * @param params The parameters to pass to the texture loader
   */
  loadEXR(resources: string, params?: TextureParameters): Promise<DataTexture>
  loadEXR(resources: string[], params?: TextureParameters): Promise<DataTexture[]>
  async loadEXR(resources: string | string[], params?: TextureParameters): Promise<DataTexture | DataTexture[]> {
    if (Array.isArray(resources)) {
      return Promise.all(resources.map(url => this.loadEXRTexture(url, params)) as Promise<DataTexture>[])
    }
    return this.loadEXRTexture(resources, params) as Promise<DataTexture>
  }

  /**
   * Load a single EXR texture.
   *
   * @param url The URL of the texture to load
   * @param params The parameters to pass to the texture loader
   */
  private loadEXRTexture(url: string, params?: TextureParameters): Promise<DataTexture> {
    return new Promise((resolve, reject) => {
      this.exrLoader!.load(url, (texture) => {
        this.applyTextureParams(texture, params)
        this.exrs.set(generateAssetName(url), texture)
        return resolve(texture)
      }, undefined, reject)
    })
  }

  /**
   * Load a single HDR texture or an array of HDR textures.
   *
   * @param resources Single URL or array of URLs of the model(s) to load.
   * @param params The parameters to pass to the texture loader
   */
  loadKTX(resources: string, params?: TextureParameters): Promise<CompressedTexture>
  loadKTX(resources: string[], params?: TextureParameters): Promise<CompressedTexture[]>
  async loadKTX(resources: string | string[], params?: TextureParameters): Promise<CompressedTexture | CompressedTexture[]> {
    if (Array.isArray(resources)) {
      return Promise.all(resources.map(url => this.loadKTXTexture(url, params)) as Promise<CompressedTexture>[])
    }
    return this.loadKTXTexture(resources, params) as Promise<CompressedTexture>
  }

  /**
   * Load a single KTX texture.
   *
   * @param url The URL of the texture to load
   * @param params The parameters to pass to the texture loader
   */
  private loadKTXTexture(url: string, params?: TextureParameters): Promise<CompressedTexture> {
    return new Promise((resolve, reject) => {
      this.ktxLoader!.load(url, (texture) => {
        this.applyTextureParams(texture, params)
        this.ktx.set(generateAssetName(url), texture)
        return resolve(texture)
      }, undefined, reject)
    })
  }

  /**
   * Load a single texture or an array of textures.
   *
   * @param resources Single URL or array of URLs of the model(s) to load.
   * @param params The parameters to pass to the texture loader
   */
  loadTextures(resources: string, params?: TextureParameters): Promise<Texture>
  loadTextures(resources: string[], params?: TextureParameters): Promise<Texture[]>
  async loadTextures(resources: string | string[], params?: TextureParameters): Promise<Texture | Texture[]> {
    if (Array.isArray(resources)) {
      return Promise.all(resources.map(url => this.loadTexture(url, params)))
    }
    return this.loadTexture(resources, params)
  }

  /**
   * Load a single texture.
   *
   * @param url The URL of the texture to load
   * @param params The parameters to pass to the texture loader
   */
  private loadTexture(url: string, params?: TextureParameters): Promise<Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader!.load(url, (texture) => {
        this.applyTextureParams(texture, params)
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
      return Promise.all(resources.map(url => this.loadModel(url)))
    }
    return this.loadModel(resources)
  }

  /**
   * Load a single model.
   *
   * @param url The URL of the model to load
   */
  private loadModel(url: string): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      this.gltfLoader!.load(url, (gltf) => {
        this.models.set(generateAssetName(url), gltf)
        return resolve(gltf)
      }, undefined, reject)
    })
  }

  /**
   * Get a texture by name.
   *
   * @param name The name of the texture to get
   */
  getTexture(name: string): Texture | undefined {
    return this.textures.get(name)
  }

  /**
   * Get a HDR texture by name.
   *
   * @param name The name of the HDR texture to get
   */
  getHDR(name: string): DataTexture | undefined {
    return this.hdrs.get(name) as DataTexture | undefined
  }

  /**
   * Get a EXR texture by name.
   *
   * @param name The name of the EXR texture to get
   */
  getEXR(name: string): DataTexture | undefined {
    return this.exrs.get(name) as DataTexture | undefined
  }

  /**
   * Get a KTX texture by name.
   *
   * @param name The name of the KTX texture to get
   */
  getKTX(name: string): CompressedTexture | undefined {
    return this.ktx.get(name) as CompressedTexture | undefined
  }

  /**
   * Get a model by name.
   *
   * @param name The name of the model to get
   */
  getModel(name: string): GLTF | undefined {
    return this.models.get(name)
  }

  /**
   * Apply texture parameters to a loaded texture.
   *
   * @param texture The texture to apply parameters to
   * @param params The parameters to apply
   */
  private applyTextureParams(texture: Texture, params?: TextureParameters): void {
    if (!params) return

    for (const [key, value] of Object.entries(params)) {
      (texture as any)[key] = value
    }
  }
}

function generateAssetName(url: string): string {
  return url.split('/').pop()!.split('.').shift()!
}
