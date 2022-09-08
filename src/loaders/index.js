import { LoadingManager } from 'three'
import { TextureLoader } from './TextureLoader'
import { GLTFLoader } from './GLTFLoader'

/**
 * Loading manager
 */
const loadingManager = new LoadingManager()

loadingManager.onProgress = (url, loaded, total) => {
  // In case the progress count is not correct, see this:
  // https://discourse.threejs.org/t/gltf-file-loaded-twice-when-loading-is-initiated-in-loadingmanager-inside-onprogress-callback/27799/2
  console.log(`Loaded ${loaded} resources out of ${total} -> ${url}`)
}

/**
 * Texture Loader
 */
export const textureLoader = new TextureLoader(loadingManager)

/**
 * GLTF Models
 */
export const gltfLoader = new GLTFLoader(loadingManager)
