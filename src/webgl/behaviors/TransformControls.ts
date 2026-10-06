import { Object3DBehaviour } from "three-start"
import { TransformControls } from 'three/addons/controls/TransformControls.js'

export class TransformControl extends Object3DBehaviour {
  controls!: TransformControls

  onAwake() {
    this.controls = new TransformControls(this.ctx.camera, this.ctx.renderer.domElement)
    this.controls.setMode('translate')
    this.controls.attach(this.object)

    const gizmo = this.controls.getHelper()
    this.ctx.scene.add(gizmo)

    this.controls.addEventListener('dragging-changed', (event) => {
      this.ctx.modules.orbitControls.controls.enabled = !event.value
    })
  }
}
