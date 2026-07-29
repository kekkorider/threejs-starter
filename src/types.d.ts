import { AssetLoaderModule } from './AssetLoader'

declare module "three-start" {
  interface ThreeStartRegister {
    modules: {
      assetLoader: AssetLoaderModule
    }
  }
}
