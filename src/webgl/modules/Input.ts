import { ContextModule } from "three-start"

export class InputModule extends ContextModule {
  private keys = new Set<string>()

  onAwake() {
    window.addEventListener("keydown", (e) => this.keys.add(e.code))
    window.addEventListener("keyup", (e) => this.keys.delete(e.code))
  }

  isPressed(code: string) {
    return this.keys.has(code)
  }
}
