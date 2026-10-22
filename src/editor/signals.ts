import { EventEmitter } from 'eventemitter3'

/** Signals Godot nodes already have. Custom signals are stored on the node. */
export const BUILTIN_SIGNALS: readonly { name: string, args: readonly string[] }[] = [
  { name: 'ready', args: [] },
  { name: 'tree_entered', args: [] },
  { name: 'tree_exiting', args: [] },
  { name: 'renamed', args: ['name'] },
  { name: 'visibility_changed', args: [] },
]

const SIGNAL_NAME = /^[A-Za-z][A-Za-z0-9_]{0,47}$/

const builtinNames = new Set(BUILTIN_SIGNALS.map((signal) => signal.name))

export interface SignalDefinition {
  name: string
  args: string[]
}

/** Saved connection. Runtime listeners from code are not in this record. */
export interface SignalLinkRecord {
  signal: string
  fromId: string
  toId: string
  component: string
  method: string
}

export interface SignalLink extends SignalLinkRecord {
  id: string
}

export type SignalListener = (...args: unknown[]) => void

export function normalizeSignalName(raw: string): string | null {
  const name = raw.trim()
  if (!SIGNAL_NAME.test(name)) return null
  return name
}

export function isBuiltinSignal(name: string): boolean {
  return builtinNames.has(name)
}

export function nodeHasSignal(custom: readonly SignalDefinition[], raw: string): boolean {
  const name = normalizeSignalName(raw)
  if (!name) return false
  if (builtinNames.has(name)) return true
  return custom.some((signal) => signal.name === name)
}

/** Empty text is no arguments. Invalid text returns null. */
export function parseSignalArgs(raw: string): string[] | null {
  const parts = raw.split(',').map((part) => part.trim()).filter((part) => part.length > 0)
  if (parts.length > 8) return null
  const seen = new Set<string>()
  for (const part of parts) {
    if (normalizeSignalName(part) !== part || seen.has(part)) return null
    seen.add(part)
  }
  return parts
}

export function isSignalDefinition(value: unknown): value is SignalDefinition {
  if (!value || typeof value !== 'object') return false
  const signal = value as SignalDefinition
  if (typeof signal.name !== 'string' || normalizeSignalName(signal.name) !== signal.name) return false
  if (isBuiltinSignal(signal.name)) return false
  if (!Array.isArray(signal.args) || signal.args.length > 8) return false
  const seen = new Set<string>()
  for (const arg of signal.args) {
    if (typeof arg !== 'string' || normalizeSignalName(arg) !== arg || seen.has(arg)) return false
    seen.add(arg)
  }
  return true
}

export function isSignalLinkRecord(value: unknown): value is SignalLinkRecord {
  if (!value || typeof value !== 'object') return false
  const link = value as SignalLinkRecord
  return typeof link.signal === 'string'
    && normalizeSignalName(link.signal) === link.signal
    && typeof link.fromId === 'string'
    && link.fromId.length > 0
    && typeof link.toId === 'string'
    && link.toId.length > 0
    && typeof link.component === 'string'
    && normalizeSignalName(link.component) === link.component
    && typeof link.method === 'string'
    && normalizeSignalName(link.method) === link.method
}

export function cloneSignals(signals: readonly SignalDefinition[] | undefined): SignalDefinition[] {
  if (!signals) return []
  const seen = new Set<string>()
  const next: SignalDefinition[] = []
  for (const signal of signals) {
    if (!isSignalDefinition(signal) || seen.has(signal.name)) continue
    seen.add(signal.name)
    next.push({ name: signal.name, args: [...signal.args] })
  }
  return next
}

/**
 * One eventemitter3 emitter per node.
 * Saved links and code listeners share that emitter.
 */
export class SignalBus {
  readonly links: SignalLink[] = []
  private readonly emitters = new Map<string, EventEmitter>()
  private readonly handlers = new Map<string, SignalListener>()

  emit(nodeId: string, signal: string, args: readonly unknown[]): boolean {
    const name = normalizeSignalName(signal)
    if (!name) return false
    return this.ensure(nodeId).emit(name, ...args)
  }

  connect(nodeId: string, signal: string, listener: SignalListener): void {
    const name = normalizeSignalName(signal)
    if (!name) return
    this.ensure(nodeId).on(name, listener)
  }

  disconnect(nodeId: string, signal: string, listener: SignalListener): void {
    const name = normalizeSignalName(signal)
    if (!name) return
    this.emitters.get(nodeId)?.off(name, listener)
  }

  isConnected(nodeId: string, signal: string, listener?: SignalListener): boolean {
    const name = normalizeSignalName(signal)
    const emitter = name ? this.emitters.get(nodeId) : undefined
    if (!name || !emitter) return false
    if (!listener) return emitter.listenerCount(name) > 0
    const list = emitter.listeners(name) as SignalListener[]
    return list.includes(listener)
  }

  addLink(link: SignalLink, deliver: (link: SignalLink, args: unknown[]) => void): void {
    const handler: SignalListener = (...args) => {
      deliver(link, args)
    }
    this.ensure(link.fromId).on(link.signal, handler)
    this.handlers.set(link.id, handler)
    this.links.push(link)
  }

  removeLink(id: string): SignalLink | null {
    const index = this.links.findIndex((link) => link.id === id)
    if (index < 0) return null
    const [link] = this.links.splice(index, 1)
    const handler = this.handlers.get(id)
    if (link && handler) {
      this.emitters.get(link.fromId)?.off(link.signal, handler)
      this.handlers.delete(id)
    }
    return link ?? null
  }

  removeNode(nodeId: string): void {
    const gone = this.links.filter((link) => link.fromId === nodeId || link.toId === nodeId)
    for (const link of gone) this.removeLink(link.id)
    this.emitters.get(nodeId)?.removeAllListeners()
    this.emitters.delete(nodeId)
  }

  disconnectComponent(nodeId: string, component: string): void {
    const gone = this.links.filter((link) => link.toId === nodeId && link.component === component)
    for (const link of gone) this.removeLink(link.id)
  }

  renameComponent(from: string, to: string): void {
    if (from === to) return
    for (const link of this.links) {
      if (link.component === from) link.component = to
    }
  }

  clear(): void {
    for (const emitter of this.emitters.values()) emitter.removeAllListeners()
    this.emitters.clear()
    this.handlers.clear()
    this.links.length = 0
  }

  private ensure(nodeId: string): EventEmitter {
    let emitter = this.emitters.get(nodeId)
    if (!emitter) {
      emitter = new EventEmitter()
      this.emitters.set(nodeId, emitter)
    }
    return emitter
  }
}
