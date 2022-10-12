export class PhysicsBody {
  constructor(mesh, scene) {
    this.scene = scene
    this.mesh = mesh

    this.body = null
  }

  update() {
    if (!!!this.body) return

    this.mesh.position.copy(this.body.position)
    this.mesh.quaternion.copy(this.body.quaternion)
  }
}
