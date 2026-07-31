import { sphere } from "crashcat"
import { Body } from './Body'

import type { RigidBodySettings } from 'crashcat'
import type * as THREE from 'three/webgpu'

type GeometryParams = {
  radius: number
  heightSegments: number
  phiLength: number
  phiStart: number
  thetaLength: number
  thetaStart: number
  widthSegments: number
}

export class BodySphere extends Body {
  constructor(settings: RigidBodySettings) {
    super(settings)
  }

  override createShape(): void {
    const { geometry } = this.object as THREE.Mesh
    const parameters = (geometry as THREE.SphereGeometry).parameters as GeometryParams

    const { radius } = parameters

    this.shape = sphere.create({ radius: radius + this.bodyBias })
  }
}
