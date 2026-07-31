import { MeshBasicNodeMaterial } from 'three/webgpu'
import { uv, uniform, positionLocal } from 'three/tsl'

export const scale = uniform(1)

export const ScaleMaterial = new MeshBasicNodeMaterial()

ScaleMaterial.colorNode = uv()

ScaleMaterial.positionNode = positionLocal.mul(scale)
