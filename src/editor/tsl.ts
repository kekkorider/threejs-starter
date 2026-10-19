import * as THREE from 'three/webgpu'
import * as TSL from 'three/tsl'

export type MaterialSide = 'front' | 'back' | 'double'

export interface MaterialFlags {
  side: MaterialSide
  transparent: boolean
  wireframe: boolean
}

export interface TslPreset {
  id: string
  name: string
  description: string
  source: string
}

export const DEFAULT_FLAGS: MaterialFlags = {
  side: 'front',
  transparent: false,
  wireframe: false,
}

export const TSL_PRESETS: TslPreset[] = [
  {
    id: 'lit',
    name: 'Lit',
    description: 'Flat albedo with roughness and metalness, the MeshStandardNodeMaterial default.',
    source: `// Slots on MeshStandardNodeMaterial. Every three/tsl binding is in scope.
material.colorNode = color('#d7dbe4')
material.roughnessNode = float(0.55)
material.metalnessNode = float(0.04)
`,
  },
  {
    id: 'metal',
    name: 'Metal',
    description: 'A tinted conductor. Needs the scene environment to read as metal.',
    source: `material.colorNode = color('#c5ccd6')
material.roughnessNode = float(0.18)
material.metalnessNode = float(1.0)
`,
  },
  {
    id: 'uv',
    name: 'UV',
    description: 'Draws the mesh UV coordinates into the albedo.',
    source: `const coords = uv()
material.colorNode = vec3(coords.x, coords.y, 0.15)
material.roughnessNode = float(0.55)
material.metalnessNode = float(0.0)
`,
  },
  {
    id: 'checker',
    name: 'Checker',
    description: 'Procedural checker from uv(), tiled across the surface.',
    source: `const tiles = checker(uv().mul(6.0))
material.colorNode = mix(color('#17191d'), color('#e7e2d6'), tiles)
material.roughnessNode = float(0.62)
material.metalnessNode = float(0.0)
`,
  },
  {
    id: 'fresnel',
    name: 'Fresnel',
    description: 'View-dependent rim using normalView and positionViewDirection.',
    source: `const facing = normalView.dot(positionViewDirection).abs()
const rim = facing.oneMinus().pow(2.0)
material.colorNode = mix(color('#1b2430'), color('#9fd0ff'), rim)
material.roughnessNode = float(0.28)
material.metalnessNode = float(0.7)
material.emissiveNode = color('#3c7dff').mul(rim).mul(0.55)
`,
  },
  {
    id: 'stripes',
    name: 'Stripes',
    description: 'Animated bands driven by uv() and time.',
    source: `const bands = sin(uv().y.mul(28.0).add(time.mul(2.0)))
material.colorNode = mix(color('#141820'), color('#f4f1ea'), bands.mul(0.5).add(0.5))
material.roughnessNode = float(0.32)
material.metalnessNode = float(0.45)
`,
  },
  {
    id: 'pulse',
    name: 'Emissive Pulse',
    description: 'A dark surface with an emissive color that breathes using time.',
    source: `const pulse = sin(time.mul(3.0)).mul(0.5).add(0.5)
material.colorNode = color('#141820')
material.emissiveNode = color('#ff5a36').mul(pulse)
material.roughnessNode = float(0.42)
material.metalnessNode = float(0.08)
`,
  },
  {
    id: 'wave',
    name: 'Vertex Wave',
    description: 'Displaces positionNode, which is the local-space vertex position.',
    source: `const wave = sin(positionLocal.x.mul(3.0).add(time.mul(2.0))).mul(0.12)
material.positionNode = positionLocal.add(vec3(0.0, wave, 0.0))
material.colorNode = mix(color('#123044'), color('#9ef6e2'), positionLocal.y.mul(0.5).add(0.5))
material.roughnessNode = float(0.22)
material.metalnessNode = float(0.12)
`,
  },
  {
    id: 'normal',
    name: 'World Normal',
    description: 'Colors the surface from normalWorld.',
    source: `material.colorNode = normalWorld.mul(0.5).add(0.5)
material.roughnessNode = float(0.45)
material.metalnessNode = float(0.0)
`,
  },
  {
    id: 'noise',
    name: 'Marble',
    description: 'MaterialX perlin noise over positionLocal, drifting with time.',
    source: `const n = mx_noise_float(positionLocal.mul(1.6).add(vec3(time.mul(0.15), 0.0, 0.0)))
material.colorNode = mix(color('#2c241e'), color('#efe2cf'), n.mul(0.5).add(0.5))
material.roughnessNode = float(0.7)
material.metalnessNode = float(0.04)
`,
  },
]

export function presetById(id: string): TslPreset {
  return TSL_PRESETS.find((preset) => preset.id === id) ?? TSL_PRESETS[0]!
}

export function matchingPresetId(source: string): string | null {
  const normalized = source.trim()
  for (const preset of TSL_PRESETS) {
    if (preset.source.trim() === normalized) return preset.id
  }
  return null
}

const RESERVED = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do',
  'else', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in',
  'instanceof', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try',
  'typeof', 'var', 'void', 'while', 'with', 'let', 'static', 'yield', 'enum', 'await',
  'implements', 'package', 'protected', 'interface', 'private', 'public', 'arguments', 'eval',
])

const TSL_NAMES: string[] = []
const TSL_VALUES: unknown[] = []

for (const [name, value] of Object.entries(TSL)) {
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) || RESERVED.has(name)) continue
  TSL_NAMES.push(name)
  TSL_VALUES.push(value)
}

function compileBody(source: string): (material: THREE.MeshStandardNodeMaterial, ...args: unknown[]) => void {
  return new Function(
    'material',
    ...TSL_NAMES,
    `"use strict";\n${source}\n`,
  ) as (material: THREE.MeshStandardNodeMaterial, ...args: unknown[]) => void
}

export function compileTSLMaterial(source: string, flags: MaterialFlags): THREE.MeshStandardNodeMaterial {
  const material = new THREE.MeshStandardNodeMaterial()
  material.name = 'TSLMaterial'
  const run = compileBody(source)
  run(material, ...TSL_VALUES)
  applyMaterialFlags(material, flags)
  material.userData.editorMaterial = true
  return material
}

export function applyMaterialFlags(material: THREE.MeshStandardNodeMaterial, flags: MaterialFlags): void {
  material.side = flags.side === 'back'
    ? THREE.BackSide
    : flags.side === 'double'
      ? THREE.DoubleSide
      : THREE.FrontSide
  material.transparent = flags.transparent
  material.depthWrite = !flags.transparent
  material.wireframe = flags.wireframe
  material.needsUpdate = true
}

const KEYWORDS = new Set(['const', 'let', 'var', 'return', 'true', 'false', 'new', 'if', 'else', 'function', 'class', 'export', 'import', 'extends', 'void', 'from'])
const FUNCS = new Set([
  'color', 'float', 'int', 'vec2', 'vec3', 'vec4', 'uv', 'sin', 'cos', 'tan', 'mix', 'smoothstep',
  'step', 'clamp', 'abs', 'pow', 'min', 'max', 'fract', 'floor', 'checker', 'oscSine', 'mx_noise_float',
  'positionLocal', 'positionWorld', 'positionView', 'positionViewDirection', 'normalLocal', 'normalWorld',
  'normalView', 'time', 'cameraPosition', 'Fn', 'uniform',
])

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

/** Godot-like token colors for the TSL editor. */
export function highlightTSL(source: string): string {
  let html = ''
  let index = 0

  const pushWord = (word: string, previous: string) => {
    if (word === 'material') html += `<span class="tok-t">${word}</span>`
    else if (KEYWORDS.has(word)) html += `<span class="tok-k">${word}</span>`
    else if (FUNCS.has(word)) html += `<span class="tok-f">${word}</span>`
    else if (previous === '.') html += `<span class="tok-m">${word}</span>`
    else html += escapeHtml(word)
  }

  while (index < source.length) {
    const char = source[index]!

    if (char === '/' && source[index + 1] === '/') {
      const end = source.indexOf('\n', index)
      const stop = end === -1 ? source.length : end
      html += `<span class="tok-c">${escapeHtml(source.slice(index, stop))}</span>`
      index = stop
      continue
    }

    if (char === '"' || char === "'" || char === '`') {
      let end = index + 1
      while (end < source.length && source[end] !== char) {
        if (source[end] === '\\') end += 1
        end += 1
      }
      if (end < source.length) end += 1
      html += `<span class="tok-s">${escapeHtml(source.slice(index, end))}</span>`
      index = end
      continue
    }

    if (/[A-Za-z_$]/.test(char)) {
      const match = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(source.slice(index))
      const word = match?.[0] ?? char
      const previous = index > 0 ? source[index - 1]! : ''
      pushWord(word, previous)
      index += word.length
      continue
    }

    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(source[index + 1] ?? ''))) {
      const match = /^(?:\d+\.?\d*|\.\d+)/.exec(source.slice(index))
      const word = match?.[0] ?? char
      html += `<span class="tok-n">${word}</span>`
      index += word.length
      continue
    }

    html += escapeHtml(char)
    index += 1
  }

  return html
}

export function escapeText(value: string): string {
  return escapeHtml(value)
}

export const TSL_HELP = `Assign node slots on \`material\`. Anything exported from three/tsl is already in scope, so calls like color(), uv(), time, sin() and positionLocal work without an import.

Slots
  material.colorNode       albedo
  material.roughnessNode   0–1
  material.metalnessNode   0–1
  material.emissiveNode    added light
  material.opacityNode     requires Transparent
  material.normalNode      tangent-space or object normal
  material.positionNode    local-space vertex position
  material.aoNode          ambient occlusion

Useful inputs
  uv()                     texture coordinates
  positionLocal            vertex position
  positionWorld            world position
  normalWorld              world normal
  normalView               view normal
  positionViewDirection    view direction
  time                     seconds
  cameraPosition           camera world position
  checker(uv())            procedural checker
  mx_noise_float(positionLocal)
`
