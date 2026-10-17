import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import { bootScene, releaseScene } from '../../webgl'

/**
 * Mount the shared scene canvas into `host` for as long as the component is alive.
 * A navigation that wins the race after this component has gone does not get released.
 */
export function useMountedScene(
  host: Ref<HTMLDivElement | null>,
  onReady: () => void,
  onError?: (error: unknown) => void,
  onLeave?: () => void,
): void {
  let generation = 0

  onMounted(() => {
    const el = host.value
    if (!el) return
    const ticket = ++generation
    bootScene(el).then(() => {
      if (ticket !== generation) {
        releaseScene(el)
        return
      }
      onReady()
    }).catch((error: unknown) => {
      if (ticket === generation) onError?.(error)
    })
  })

  onBeforeUnmount(() => {
    generation += 1
    onLeave?.()
    const el = host.value
    if (el) releaseScene(el)
  })
}
