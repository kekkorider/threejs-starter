import { Plane, Body } from 'cannon-es'
import { PhysicsBody } from './Body'

export class PhysicsFloor extends PhysicsBody {
  constructor(mesh, scene) {
    super(mesh, scene)

    this.#addBody()
  }

  #addBody() {
    const { quaternion, position } = this.mesh

    this.body = new Body({
      mass: 0,
      quaternion,
      position,
      shape: new Plane()
    })
  }
}
