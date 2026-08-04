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

export type BodyParams = {
  radius: number
}

export class BodySphere extends Body {
  bodyParams: BodyParams | undefined = undefined

  constructor(settings: RigidBodySettings, bodyParams?: BodyParams) {
    super(settings)

    if (bodyParams !== undefined) {
      this.bodyParams = bodyParams
    }
  }

  override createShape(): void {
    const { geometry } = this.object as THREE.Mesh
    const parameters = (geometry as THREE.SphereGeometry).parameters as GeometryParams


    if (this.bodyParams) {
      parameters.radius = this.bodyParams.radius
    }

    const { radius } = parameters

    this.shape = sphere.create({ radius: radius + this.bodyBias })
  }
}
