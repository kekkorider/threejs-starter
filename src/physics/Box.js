import { Box, Body, Vec3 } from 'cannon-es'
import { PhysicsBody } from './Body'

export class PhysicsBox extends PhysicsBody {
  constructor(mesh, scene) {
    super(mesh, scene)

    this.#addBody()
  }

  #addBody() {
    const { position, quaternion } = this.mesh
    const { width, height, depth } = this.mesh.geometry.parameters
    const halfExtents = new Vec3(width / 2, height / 2, depth / 2)

    this.body = new Body({
      mass: 1,
      position,
      quaternion,
      shape: new Box(halfExtents)
    })
  }
}
