import { highlightTSL } from './tsl'

/** A line-numbered TSL editor. The textarea is transparent over a highlighted pre. */
export class CodeEditor {
  readonly el: HTMLElement
  private readonly gutter: HTMLElement
  private readonly highlight: HTMLElement
  private readonly textarea: HTMLTextAreaElement
  private silent = false
  private onChange: ((value: string) => void) | null = null

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'code-editor'
    this.el.innerHTML = `
      <div class="code-gutter" aria-hidden="true"></div>
      <div class="code-stage">
        <pre class="code-highlight"></pre>
        <textarea spellcheck="false" autocomplete="off" autocapitalize="off" wrap="off" aria-label="TSL material source"></textarea>
      </div>
    `
    this.gutter = this.el.querySelector('.code-gutter')!
    this.highlight = this.el.querySelector('.code-highlight')!
    this.textarea = this.el.querySelector('textarea')!

    this.textarea.addEventListener('input', () => {
      this.refresh()
      if (!this.silent) this.onChange?.(this.textarea.value)
    })
    this.textarea.addEventListener('scroll', () => {
      this.highlight.scrollTop = this.textarea.scrollTop
      this.highlight.scrollLeft = this.textarea.scrollLeft
      this.gutter.scrollTop = this.textarea.scrollTop
    })
    this.textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        event.preventDefault()
        const start = this.textarea.selectionStart
        const end = this.textarea.selectionEnd
        const value = this.textarea.value
        this.textarea.value = `${value.slice(0, start)}  ${value.slice(end)}`
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 2
        this.refresh()
        if (!this.silent) this.onChange?.(this.textarea.value)
      }
    })
    this.refresh()
  }

  setOnChange(listener: (value: string) => void): void {
    this.onChange = listener
  }

  get value(): string {
    return this.textarea.value
  }

  setValue(value: string): void {
    this.silent = true
    this.textarea.value = value
    this.refresh()
    this.silent = false
  }

  setDisabled(disabled: boolean): void {
    this.textarea.disabled = disabled
    this.el.classList.toggle('is-disabled', disabled)
  }

  focus(): void {
    this.textarea.focus()
  }

  private refresh(): void {
    const value = this.textarea.value
    const lines = value.split('\n').length
    const numbers: string[] = []
    for (let line = 1; line <= Math.max(lines, 1); line += 1) numbers.push(String(line))
    this.gutter.textContent = numbers.join('\n')
    this.highlight.innerHTML = highlightTSL(value.endsWith('\n') || value.length === 0 ? `${value} ` : value)
  }
}
