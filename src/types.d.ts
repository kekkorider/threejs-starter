import { AssetLoaderModule } from './webgl/modules/AssetLoader'
import { OrbitControlsModule } from './webgl/modules/OrbitControls'

declare module "three-start" {
  interface ThreeStartRegister {
    modules: {
      assetLoader: AssetLoaderModule
      orbitControls: OrbitControlsModule
    }
  }
}
