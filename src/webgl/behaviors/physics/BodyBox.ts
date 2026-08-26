import { box } from "crashcat"
import { Body } from './Body'

import type { RigidBodySettings } from 'crashcat'

export type BodyParams = {
  width: number
  height: number
  depth: number
}

export class BodyBox extends Body {
  bodyParams: BodyParams = { width: 1, height: 1, depth: 1 }

  constructor(settings: RigidBodySettings, bodyParams?: BodyParams) {
    super(settings)

    if (bodyParams !== undefined) {
      this.bodyParams = bodyParams
    }
  }

  override createShape(): void {
    const width = this.bodyParams.width
    const height = this.bodyParams.height
    const depth = this.bodyParams.depth

    const x: number = width / 2
    const y: number = height / 2
    const z: number = depth / 2

    this.shape = box.create({ halfExtents: [x, y, z] })
  }
}
