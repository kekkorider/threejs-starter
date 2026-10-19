import { transform } from 'sucrase'
import { Object3DBehaviour } from 'three-start'
import type { Object3DBehaviourConstructor } from 'three-start'
import { Spin } from '../webgl/behaviors/Spin'
import spinSource from '../webgl/behaviors/Spin.ts?raw'

export const COMPONENT_DRAG_PREFIX = 'component:'
export const INSTANCE_DRAG_PREFIX = 'instance:'

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
    const factory = new Function('Object3DBehaviour', `"use strict";\n${body}\nreturn ${name};`)
    const ctor = factory(Object3DBehaviour) as Object3DBehaviourConstructor
    if (typeof ctor !== 'function') throw new Error(`Could not compile ${name}.`)
    return { name, ctor }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

const SKIPPED_FIELDS = new Set(['object', 'ctx', 'modules', 'enabled', 'isObject3DBehaviour'])

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
