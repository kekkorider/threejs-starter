import { ContextModule } from "three-start"
import { Inspector } from 'three/addons/inspector/Inspector.js'

import type { ParametersGroup } from "three/examples/jsm/inspector/tabs/Parameters.js"

import { scale } from '../materials/scale'

export class InspectorModule extends ContextModule {
  inspector: Inspector | null = null
  gui: ParametersGroup | null = null

  onAwake() {
    this.inspector = this.ctx.renderer.inspector = new Inspector()

    this.gui = this.inspector.createParameters('Settings')
    this.gui.add(scale, 'value', 0.25, 1.5).name('Scale')
  }
}
