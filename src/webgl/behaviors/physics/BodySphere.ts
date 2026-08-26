import { sphere } from "crashcat"
import { Body } from './Body'

import type { RigidBodySettings } from 'crashcat'

export type BodyParams = {
  radius: number
}

export class BodySphere extends Body {
  bodyParams: BodyParams = { radius: 1 }

  constructor(settings: RigidBodySettings, bodyParams?: BodyParams) {
    super(settings)

    if (bodyParams !== undefined) {
      this.bodyParams = bodyParams
    }
  }

  override createShape(): void {
    this.shape = sphere.create({ radius: this.bodyParams.radius })
  }
}
