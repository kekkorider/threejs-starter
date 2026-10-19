/** Drag horizontally to change a numeric field. Shift scales the delta down. */
export function bindScrub(event: PointerEvent, apply: (delta: number) => void): void {
  if (event.button !== 0) return
  event.preventDefault()
  let last = event.clientX
  const move = (ev: PointerEvent) => {
    const scale = ev.shiftKey ? 0.1 : 1
    apply((ev.clientX - last) * scale)
    last = ev.clientX
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    document.body.style.cursor = ''
  }
  document.body.style.cursor = 'ew-resize'
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}
