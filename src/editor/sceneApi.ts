import type { GroupScope } from './groups'
import type { SignalListener } from './signals'

/** An editor node id, an editor node, or a Three.js object in the scene. */
export type SceneElement = string | {
  id?: string
  name?: string
  groups?: readonly string[]
  userData?: { editorId?: unknown }
}

export interface SceneRuntime {
  isInGroup(element: SceneElement, group: string, scope?: GroupScope): boolean
  nodesInGroup(group: string, scope?: GroupScope): { name: string }[]
  emitSignal(element: SceneElement, signal: string, args: readonly unknown[]): boolean
  connectSignal(element: SceneElement, signal: string, listener: SignalListener): void
  disconnectSignal(element: SceneElement, signal: string, listener: SignalListener): void
  isSignalConnected(element: SceneElement, signal: string, listener?: SignalListener): boolean
}

/** Names injected into a component script. The script does not import them. */
export const SCRIPT_API = [
  'isInGroup',
  'isInLocalGroup',
  'isInGlobalGroup',
  'nodesInGroup',
  'emitSignal',
  'connectSignal',
  'disconnectSignal',
  'isSignalConnected',
] as const

let runtime: SceneRuntime | null = null

export function bindSceneRuntime(next: SceneRuntime): void {
  runtime = next
}

export function isInGroup(element: SceneElement, group: string, scope?: GroupScope): boolean {
  return runtime?.isInGroup(element, group, scope) ?? false
}

export function isInLocalGroup(element: SceneElement, group: string): boolean {
  return isInGroup(element, group, 'local')
}

export function isInGlobalGroup(element: SceneElement, group: string): boolean {
  return isInGroup(element, group, 'global')
}

export function nodesInGroup(group: string, scope?: GroupScope): { name: string }[] {
  return runtime?.nodesInGroup(group, scope) ?? []
}

export function emitSignal(element: SceneElement, signal: string, ...args: unknown[]): boolean {
  return runtime?.emitSignal(element, signal, args) ?? false
}

export function connectSignal(element: SceneElement, signal: string, listener: SignalListener): void {
  runtime?.connectSignal(element, signal, listener)
}

export function disconnectSignal(element: SceneElement, signal: string, listener: SignalListener): void {
  runtime?.disconnectSignal(element, signal, listener)
}

export function isSignalConnected(element: SceneElement, signal: string, listener?: SignalListener): boolean {
  return runtime?.isSignalConnected(element, signal, listener) ?? false
}
