import { AssetLoaderModule } from './webgl/modules/AssetLoader'
import { OrbitControlsModule } from './webgl/modules/OrbitControls'
import { PhysicsModule } from './webgl/modules/Physics'
import { InspectorModule } from './webgl/modules/Inspector'
import { InputModule } from './webgl/modules/Input'

declare module "three-start" {
  interface ThreeStartRegister {
    modules: {
      assetLoader: AssetLoaderModule
      orbitControls: OrbitControlsModule
      physics: PhysicsModule
      inspector: InspectorModule
      input: InputModule
    }
  }
}
