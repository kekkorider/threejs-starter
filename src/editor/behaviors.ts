import { transform } from 'sucrase'
import { Object3DBehaviour } from 'three-start'
import type { Object3DBehaviourConstructor } from 'three-start'
import { Spin } from '../webgl/behaviors/Spin'
import spinSource from '../webgl/behaviors/Spin.ts?raw'
import {
  SCRIPT_API,
  connectSignal,
  disconnectSignal,
  emitSignal,
  isInGlobalGroup,
  isInGroup,
  isInLocalGroup,
  isSignalConnected,
  nodesInGroup,
} from './sceneApi'
import { normalizeSignalName } from './signals'

export const COMPONENT_DRAG_PREFIX = 'component:'
export const INSTANCE_DRAG_PREFIX = 'instance:'

/** Set during a component-file or component-instance drag so a dock can accept it before drop. */
export const SCRIPT_DRAG_TYPE = 'text/x-script'

export function markScriptDrag(transfer: DataTransfer, payload: string): void {
  transfer.setData('text/plain', payload)
  try {
    transfer.setData(SCRIPT_DRAG_TYPE, payload)
  } catch {
    // text/plain still carries the payload when a custom type is refused.
  }
}

export function isScriptDrag(transfer: DataTransfer | null): boolean {
  return !!transfer && [...transfer.types].includes(SCRIPT_DRAG_TYPE)
}

const LIFECYCLE = [
  'onAwake',
  'onStart',
  'onEnable',
  'onDisable',
  'onUpdate',
  'onBeforeRender',
  'onAfterRender',
  'onDestroy',
] as const

export interface CompiledComponent {
  name: string
  ctor: Object3DBehaviourConstructor
}

export interface BuiltinComponent {
  name: string
  source: string
  ctor: Object3DBehaviourConstructor
}

export const BUILTIN_COMPONENTS: BuiltinComponent[] = [
  { name: 'Spin', source: spinSource, ctor: Spin },
]

export function componentTemplate(name: string): string {
  const methods = LIFECYCLE.map((method) => `  ${method}(): void {\n  }`).join('\n\n')
  return `import { Object3DBehaviour } from "three-start"

export class ${name} extends Object3DBehaviour {
  // isInGroup(object, group) reports membership.
  // isInLocalGroup and isInGlobalGroup also check local or global scope.
  // emitSignal, connectSignal, and isSignalConnected use eventemitter3.

${methods}
}
`
}

export function identifierName(raw: string): string {
  const cleaned = raw.trim().replace(/[^A-Za-z0-9_]/g, '')
  if (!cleaned) return 'Component'
  return /^[0-9]/.test(cleaned) ? `Component${cleaned}` : cleaned
}

export function uniqueIdentifier(raw: string, taken: Set<string>): string {
  const base = identifierName(raw)
  if (!taken.has(base)) return base
  let index = 2
  while (taken.has(`${base}${index}`)) index += 1
  return `${base}${index}`
}

export function withClassName(source: string, name: string): string {
  if (/class\s+[A-Za-z_$][\w$]*\s+extends\s+Object3DBehaviour/.test(source)) {
    return source.replace(
      /class\s+[A-Za-z_$][\w$]*\s+extends\s+Object3DBehaviour/,
      `class ${name} extends Object3DBehaviour`,
    )
  }
  return componentTemplate(name)
}

function stripImports(source: string): string {
  return source.replace(/import\s+(?:type\s+)?[\s\S]*?from\s+['"][^'"]+['"]\s*;?/g, '')
}

export function compileComponent(source: string): CompiledComponent {
  const match = source.match(/class\s+([A-Za-z_$][\w$]*)\s+extends\s+Object3DBehaviour/)
  if (!match?.[1]) throw new Error('A component must declare class Name extends Object3DBehaviour.')
  const name = match[1]
  let compiled = ''
  try {
    compiled = transform(stripImports(source), { transforms: ['typescript'], disableESTransforms: true }).code
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
  const body = compiled
    .replace(/^\s*export\s*\{[\s\S]*?\};?\s*$/gm, '')
    .replace(/\bexport\s+default\s+/g, '')
    .replace(/\bexport\s+/g, '')
  try {
    const scriptApi = [
      isInGroup,
      isInLocalGroup,
      isInGlobalGroup,
      nodesInGroup,
      emitSignal,
      connectSignal,
      disconnectSignal,
      isSignalConnected,
    ]
    const factory = new Function(
      'Object3DBehaviour',
      ...SCRIPT_API,
      `"use strict";\n${body}\nreturn ${name};`,
    )
    const ctor = factory(Object3DBehaviour, ...scriptApi) as Object3DBehaviourConstructor
    if (typeof ctor !== 'function') throw new Error(`Could not compile ${name}.`)
    return { name, ctor }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

const SKIPPED_FIELDS = new Set(['object', 'ctx', 'modules', 'enabled', 'isObject3DBehaviour'])

const SKIP_METHODS = new Set([
  'constructor',
  'toString',
  'valueOf',
  'toLocaleString',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'enable',
  'disable',
  'setEnabled',
  'on',
  'once',
  'off',
  'emit',
  'addListener',
  'removeListener',
  'removeAllListeners',
  'listeners',
  'listenerCount',
  'eventNames',
])

const MEMBER_WORDS = new Set([
  'abstract',
  'accessor',
  'async',
  'declare',
  'override',
  'private',
  'protected',
  'public',
  'readonly',
  'static',
])

function canConnectMethod(name: string): boolean {
  return !SKIP_METHODS.has(name) && normalizeSignalName(name) === name
}

function sortNames(names: Iterable<string>): string[] {
  return [...names].sort((left, right) => left.localeCompare(right))
}

/** Method names a signal can call on this component. */
export function methodNames(behaviour: object): string[] {
  const names = new Set<string>()
  let current: object | null = behaviour
  while (current && current !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(current)) {
      if (!canConnectMethod(key)) continue
      const descriptor = Object.getOwnPropertyDescriptor(current, key)
      if (typeof descriptor?.value === 'function') names.add(key)
    }
    current = Object.getPrototypeOf(current) as object | null
  }
  return sortNames(names)
}

function skipSpace(source: string, index: number): number {
  let i = index
  while (i < source.length && /\s/.test(source[i] ?? '')) i += 1
  return i
}

function readIdentifier(source: string, index: number): string {
  const match = /^[A-Za-z_$][\w$]*/.exec(source.slice(index))
  return match?.[0] ?? ''
}

/** True when the text after `=` is a function or an arrow function. */
function isFunctionValue(source: string, index: number): boolean {
  let i = skipSpace(source, index)
  if (source.startsWith('async', i) && /[^A-Za-z0-9_$]/.test(source[i + 5] ?? ' ')) i = skipSpace(source, i + 5)
  if (source.startsWith('function', i) && /[^A-Za-z0-9_$]/.test(source[i + 8] ?? ' ')) return true
  if (source[i] === '(') {
    let depth = 0
    for (let cursor = i; cursor < source.length; cursor += 1) {
      const char = source[cursor]
      if (char === '(') depth += 1
      else if (char === ')') {
        depth -= 1
        if (depth === 0) {
          let after = skipSpace(source, cursor + 1)
          if (source[after] === ':') {
            after += 1
            let angle = 0
            while (after < source.length) {
              const next = source[after]
              if (next === '<') angle += 1
              else if (next === '>') angle = Math.max(0, angle - 1)
              else if (angle === 0 && (next === '=' || next === '{' || next === ';' || next === '\n')) break
              after += 1
            }
            after = skipSpace(source, after)
          }
          return source.startsWith('=>', after)
        }
      } else if (char === "'" || char === '"' || char === '`') {
        cursor = skipString(source, cursor) - 1
      }
    }
    return false
  }
  const name = readIdentifier(source, i)
  if (!name) return false
  return source.startsWith('=>', skipSpace(source, i + name.length))
}

function skipString(source: string, index: number): number {
  const quote = source[index]
  let i = index + 1
  while (i < source.length) {
    if (source[i] === '\\') {
      i += 2
      continue
    }
    if (quote === '`' && source[i] === '$' && source[i + 1] === '{') {
      i += 2
      let depth = 1
      while (i < source.length && depth > 0) {
        if (source[i] === "'" || source[i] === '"' || source[i] === '`') i = skipString(source, i)
        else if (source[i] === '{') {
          depth += 1
          i += 1
        } else if (source[i] === '}') {
          depth -= 1
          i += 1
        } else i += 1
      }
      continue
    }
    if (source[i] === quote) return i + 1
    i += 1
  }
  return source.length
}

/**
 * Method names written on the component class.
 * This reads the script text, so a custom method shows before Apply.
 */
function sourceMethodNames(source: string): string[] {
  const header = /class\s+[A-Za-z_$][\w$]*\s+extends\s+Object3DBehaviour\b/.exec(source)
  if (!header) return []
  let i = source.indexOf('{', header.index + header[0].length)
  if (i < 0) return []
  i += 1
  let depth = 1
  let paren = 0
  let bracket = 0
  let previous = ''
  let staticMember = false
  const names = new Set<string>()
  const add = (name: string): void => {
    if (staticMember || previous === 'get' || previous === 'set') return
    if (canConnectMethod(name)) names.add(name)
  }
  while (i < source.length && depth > 0) {
    const char = source[i] ?? ''
    if (char === '/' && source[i + 1] === '/') {
      const next = source.indexOf('\n', i)
      i = next < 0 ? source.length : next + 1
      continue
    }
    if (char === '/' && source[i + 1] === '*') {
      const next = source.indexOf('*/', i + 2)
      i = next < 0 ? source.length : next + 2
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      i = skipString(source, i)
      continue
    }
    if (char === '{') {
      depth += 1
      i += 1
      continue
    }
    if (char === '}') {
      depth -= 1
      if (depth === 1) {
        previous = ''
        staticMember = false
      }
      i += 1
      continue
    }
    if (char === '(') {
      paren += 1
      i += 1
      continue
    }
    if (char === ')') {
      paren = Math.max(0, paren - 1)
      i += 1
      continue
    }
    if (char === '[') {
      bracket += 1
      i += 1
      continue
    }
    if (char === ']') {
      bracket = Math.max(0, bracket - 1)
      i += 1
      continue
    }
    if (depth === 1 && paren === 0 && bracket === 0 && /[A-Za-z_$]/.test(char)) {
      const name = readIdentifier(source, i)
      i += name.length
      if (name === 'static') staticMember = true
      const after = skipSpace(source, i)
      if (source[after] === '=' && isFunctionValue(source, after + 1)) add(name)
      else if (source[after] === '(' && !MEMBER_WORDS.has(name)) add(name)
      else if (source[after] === '<') {
        let angle = 0
        let cursor = after
        for (; cursor < source.length; cursor += 1) {
          if (source[cursor] === '<') angle += 1
          else if (source[cursor] === '>') {
            angle -= 1
            if (angle === 0) {
              cursor += 1
              break
            }
          }
        }
        if (source[skipSpace(source, cursor)] === '(' && !MEMBER_WORDS.has(name)) add(name)
      }
      previous = name
      if (char === ';' || source[after] === ';') {
        previous = ''
        staticMember = false
      }
      continue
    }
    if (depth === 1 && paren === 0 && bracket === 0 && char === ';') {
      previous = ''
      staticMember = false
    }
    i += 1
  }
  return sortNames(names)
}

/** Methods on the compiled class, plus methods written in the script text. */
export function methodNamesFromSource(source: string): string[] {
  const written = sourceMethodNames(source)
  try {
    const { ctor } = compileComponent(source)
    return sortNames(new Set([...methodNames(ctor.prototype as object), ...written]))
  } catch {
    return written
  }
}

/** Live behaviour methods plus custom methods from the script the editor shows. */
export function mergedMethodNames(behaviour: object, source?: string): string[] {
  const names = new Set(methodNames(behaviour))
  if (source?.trim()) {
    for (const name of methodNamesFromSource(source)) names.add(name)
  }
  return sortNames(names)
}

export interface ComponentParameter {
  key: string
  kind: 'number' | 'string' | 'boolean'
  value: number | string | boolean
}

export function readParameters(behaviour: object): ComponentParameter[] {
  const params: ComponentParameter[] = []
  for (const key of Object.keys(behaviour)) {
    if (key.startsWith('_') || SKIPPED_FIELDS.has(key)) continue
    const value = (behaviour as Record<string, unknown>)[key]
    if (typeof value === 'number' && Number.isFinite(value)) params.push({ key, kind: 'number', value })
    else if (typeof value === 'boolean') params.push({ key, kind: 'boolean', value })
    else if (typeof value === 'string') params.push({ key, kind: 'string', value })
  }
  return params.sort((left, right) => left.key.localeCompare(right.key))
}

export function parameterFields(behaviour: object): Record<string, number | string | boolean> {
  const fields: Record<string, number | string | boolean> = {}
  for (const param of readParameters(behaviour)) fields[param.key] = param.value
  return fields
}

export function applyParameters(behaviour: object, fields: Record<string, number | string | boolean>): void {
  const target = behaviour as Record<string, unknown>
  for (const [key, value] of Object.entries(fields)) {
    if (key.startsWith('_') || SKIPPED_FIELDS.has(key)) continue
    if (!(key in target)) continue
    if (typeof target[key] !== typeof value) continue
    target[key] = value
  }
}
