import { convexHull } from 'crashcat'
import { Body } from './Body'

import type { RigidBodySettings } from 'crashcat'
import type * as THREE from 'three/webgpu'

type BodyParams = {
  geometry?: THREE.BufferGeometry | null
}

export class BodyConvexHull extends Body {
  bodyGeometry: BodyParams['geometry'] = null

  constructor(settings: RigidBodySettings, params?: BodyParams) {
    super(settings)

    if (params?.geometry) {
      this.bodyGeometry = params.geometry
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
