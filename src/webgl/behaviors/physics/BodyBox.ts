import { box } from "crashcat"
import { Body } from './Body'
import type * as THREE from 'three/webgpu'

type GeometryParams = {
  width: number
  height: number
  depth: number
  depthSegments: number
  heightSegments: number
  widthSegments: number
}

export class BodyBox extends Body {
  createShape() {
    const object = this.object as THREE.Mesh
    const geometry = object.geometry as THREE.BoxGeometry
    const parameters = geometry.parameters as GeometryParams

    const width = parameters.width
    const height = parameters.height
    const depth = parameters.depth

    const x: number = width / 2 + this.bodyBias
    const y: number = height / 2 + this.bodyBias
    const z: number = depth / 2 + this.bodyBias

    this.shape = box.create({ halfExtents: [x, y, z] })
  }
}
