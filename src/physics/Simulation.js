import { World, Vec3, SAPBroadphase } from 'cannon-es'

export class Simulation {
  constructor(app) {
    this.app = app
    this.items = []

    this.init()
  }

  async init() {
    this.world = new World({
      gravity: new Vec3(0, -9.82, 0),
      broadphase: new SAPBroadphase()
    })

    if (this.app.hasDebug) {
      const { default: Debugger } = await import('cannon-es-debugger')

      this.debugger = new Debugger(this.app.scene, this.world, {
        color: 0x005500,
        onInit: (body, mesh) => {
          window.addEventListener('togglePhysicsDebug', () => {
            mesh.visible = !mesh.visible
          })
        }
      })
    }
  }

  addItem(item) {
    this.items.push(item)
    this.world.addBody(item.body)
  }

  removeItem(item) {
    setTimeout(() => {
      this.items = this.items.filter((b) => b !== item)
      this.world.removeBody(item.body)
    }, 0)
  }

  update() {
    this.world.fixedStep()

    for (const item of this.items) {
      item.update()
    }

    this.debugger?.update()
  }
}
