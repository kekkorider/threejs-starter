import { ContextModule } from "three-start"
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export class OrbitControlsModule extends ContextModule {
  controls!: OrbitControls

  onAwake() {
    this.controls = new OrbitControls(this.ctx.camera, this.ctx.renderer.domElement)
    this.controls.enableDamping = true
  }

  onUpdate() {
    this.controls.update(this.ctx.getDeltaTime())
  }
}
