import { sphere } from "crashcat"
import { Body } from './Body'

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
  createShape() {
    const object = this.object as THREE.Mesh
    const geometry = object.geometry as THREE.SphereGeometry
    const parameters = geometry.parameters as GeometryParams

    const { radius } = parameters

    this.shape = sphere.create({ radius: radius + this.bodyBias })
  }
}
