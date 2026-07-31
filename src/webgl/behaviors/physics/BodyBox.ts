import { box } from "crashcat"
import { Body } from './Body'

import type { RigidBodySettings } from 'crashcat'
import type * as THREE from 'three/webgpu'

type GeometryParams = {
  width: number
  widthSegments: number
  height: number
  heightSegments: number
  depth: number
  depthSegments: number
}

export class BodyBox extends Body {
  constructor(settings: RigidBodySettings) {
    super(settings)
  }

  override createShape(): void {
    const { geometry } = this.object as THREE.Mesh
    const parameters = (geometry as THREE.BoxGeometry).parameters as GeometryParams

    const width = parameters.width
    const height = parameters.height
    const depth = parameters.depth

    const x: number = width / 2 + this.bodyBias
    const y: number = height / 2 + this.bodyBias
    const z: number = depth / 2 + this.bodyBias

    this.shape = box.create({ halfExtents: [x, y, z] })
  }
}
