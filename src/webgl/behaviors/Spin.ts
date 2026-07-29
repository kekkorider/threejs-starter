import { Object3DBehaviour } from "three-start"

type Params = {
  axis?: 'x' | 'y' | 'z'
  speed?: number
}

export class Spin extends Object3DBehaviour {
  axis?: Params['axis']
  speed?: Params['speed']

  private _initialRotation: number = 0

  constructor(params?: Params) {
      super()

      this.axis = params?.axis ?? 'y'
      this.speed = params?.speed ?? 1
  }

  onAwake() {
    this._initialRotation = this.object.rotation[this.axis!]
  }

  onUpdate() {
    const dt = this.ctx.getDeltaTime()
    this.object.rotation[this.axis!] += dt * this.speed!
  }

  onDestroy() {
    this.object.rotation[this.axis!] = this._initialRotation
  }
}
