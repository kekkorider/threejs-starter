import { AssetLoaderModule } from './webgl/modules/AssetLoader'
import { OrbitControlsModule } from './webgl/modules/OrbitControls'
import { PhysicsModule } from './webgl/modules/Physics'

declare module "three-start" {
  interface ThreeStartRegister {
    modules: {
      assetLoader: AssetLoaderModule
      orbitControls: OrbitControlsModule
      physics: PhysicsModule
    }
  }
}
