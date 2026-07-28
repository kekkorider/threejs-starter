import { Object3DBehaviour } from "three-start"

type params = {
  axis: 'x' | 'y' | 'z'
  speed: number
}

export class Spin extends Object3DBehaviour {
  axis: params['axis'] = 'y'
  speed: params['speed'] = 1

  private _initRotY: number = 0

  constructor(params: params) {
      super()

      this.axis = params.axis
      this.speed = params.speed
  }

  onAwake() {
    this._initRotY = this.object.rotation[this.axis]
  }

  onUpdate() {
    const dt = this.ctx.getDeltaTime()
    this.object.rotation[this.axis] += dt * this.speed
  }

  onDestroy() {
    this.object.rotation[this.axis] = this._initRotY
  }
}
