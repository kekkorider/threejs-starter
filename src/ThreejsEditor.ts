import { runEditor } from './webgl'

import type { ThreeStart } from 'three-start'

const tagName = 'threejs-editor'

export class ThreejsEditor extends HTMLElement {
  private generation = 0
  private starter: ThreeStart | null = null
  private viewport: HTMLDivElement | null = null

  connectedCallback(): void {
    const generation = ++this.generation
    this.coverWindow()

    const viewport = document.createElement('div')
    viewport.style.position = 'absolute'
    viewport.style.inset = '0'
    this.replaceChildren(viewport)
    this.viewport = viewport

    void this.start(viewport, generation)
  }

  disconnectedCallback(): void {
    this.generation += 1
    this.release()
  }

  private coverWindow(): void {
    const style = this.style
    style.position = 'fixed'
    style.inset = '0'
    style.width = '100vw'
    style.height = '100vh'
    style.display = 'block'
    style.margin = '0'
    style.overflow = 'hidden'
  }

  private async start(viewport: HTMLDivElement, generation: number): Promise<void> {
    try {
      const starter = await runEditor(viewport)
      if (generation !== this.generation) {
        starter.dispose()
        return
      }
      this.starter = starter
    } catch (error) {
      if (generation === this.generation) {
        throw error
      }
    }
  }

  private release(): void {
    const starter = this.starter
    this.starter = null
    starter?.dispose()
    this.viewport?.remove()
    this.viewport = null
  }
}

if (customElements.get(tagName) === undefined) {
  customElements.define(tagName, ThreejsEditor)
}
