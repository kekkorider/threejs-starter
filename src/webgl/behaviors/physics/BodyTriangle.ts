import { triangleMesh } from "crashcat"
import { Body } from './Body'

import type * as THREE from 'three/webgpu'
import type { RigidBodySettings } from 'crashcat'

type BodyParams = {
  geometry?: THREE.BufferGeometry | null
}

export class BodyTriangle extends Body {
  geometry: BodyParams['geometry'] = null

  constructor(settings: RigidBodySettings, params?: BodyParams) {
    if (!Object.hasOwn(settings, 'mass')) {
      throw new Error('Settings must include `mass` property')
    }

    super(settings)

    if (params?.geometry) {
      this.geometry = params.geometry
    }
  }

  override createShape(): void {
    let { geometry } = this.object as THREE.Mesh
    this.geometry && (geometry = this.geometry)

    const positions = geometry.getAttribute('position') as THREE.BufferAttribute
    const indices = geometry.getIndex() as THREE.BufferAttribute

    this.shape = triangleMesh.create({
      positions: [...positions.array],
      indices: [...indices.array],
    })
  }
}
