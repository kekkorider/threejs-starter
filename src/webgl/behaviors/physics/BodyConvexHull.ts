import { convexHull, MotionType } from 'crashcat'
import { Body } from './Body'

import type * as THREE from 'three/webgpu'

type Params = {
  motionType?: MotionType | null
  bodyGeometry?: THREE.BufferGeometry | null
}

export class BodyConvexHull extends Body {
  bodyGeometry: Params['bodyGeometry'] = null

  constructor(params?: Params) {
    super({ motionType: params?.motionType ?? MotionType.DYNAMIC })

    if (params?.bodyGeometry) {
      this.bodyGeometry = params.bodyGeometry
    }
  }

  override createShape(): void {
    let { geometry } = this.object as THREE.Mesh
    this.bodyGeometry && (geometry = this.bodyGeometry)

    const positions = geometry.getAttribute('position') as THREE.BufferAttribute

    this.shape = convexHull.create({
      positions: [...positions.array],
    })
  }
}
