import * as THREE from 'three/webgpu'

export type GeometryType =
  | 'box'
  | 'sphere'
  | 'plane'
  | 'circle'
  | 'cylinder'
  | 'cone'
  | 'torus'
  | 'torusKnot'
  | 'capsule'
  | 'ring'
  | 'icosahedron'
  | 'octahedron'
  | 'dodecahedron'
  | 'tetrahedron'

export interface ParamSpec {
  key: string
  label: string
  min: number
  max: number
  step: number
  default: number
  integer?: boolean
}

export interface GeometryCatalogEntry {
  type: GeometryType
  label: string
  params: ParamSpec[]
}

const size = (key: string, label: string, fallback = 1): ParamSpec => ({
  key,
  label,
  min: 0.05,
  max: 20,
  step: 0.05,
  default: fallback,
})

const segs = (key: string, label: string, fallback: number, min: number, max = 48): ParamSpec => ({
  key,
  label,
  min,
  max,
  step: 1,
  default: fallback,
  integer: true,
})

export const GEOMETRY_CATALOG: GeometryCatalogEntry[] = [
  {
    type: 'box',
    label: 'BoxGeometry',
    params: [
      size('width', 'Width'),
      size('height', 'Height'),
      size('depth', 'Depth'),
      segs('widthSegments', 'Width Segments', 1, 1),
      segs('heightSegments', 'Height Segments', 1, 1),
      segs('depthSegments', 'Depth Segments', 1, 1),
    ],
  },
  {
    type: 'sphere',
    label: 'SphereGeometry',
    params: [
      size('radius', 'Radius', 0.5),
      segs('widthSegments', 'Width Segments', 32, 3),
      segs('heightSegments', 'Height Segments', 16, 2),
    ],
  },
  {
    type: 'plane',
    label: 'PlaneGeometry',
    params: [
      size('width', 'Width', 2),
      size('height', 'Height', 2),
      segs('widthSegments', 'Width Segments', 1, 1),
      segs('heightSegments', 'Height Segments', 1, 1),
    ],
  },
  {
    type: 'circle',
    label: 'CircleGeometry',
    params: [
      size('radius', 'Radius', 0.6),
      segs('segments', 'Segments', 32, 3),
    ],
  },
  {
    type: 'cylinder',
    label: 'CylinderGeometry',
    params: [
      size('radiusTop', 'Top Radius', 0.5),
      size('radiusBottom', 'Bottom Radius', 0.5),
      size('height', 'Height', 1),
      segs('radialSegments', 'Radial Segments', 24, 3),
      segs('heightSegments', 'Height Segments', 1, 1),
    ],
  },
  {
    type: 'cone',
    label: 'ConeGeometry',
    params: [
      size('radius', 'Radius', 0.5),
      size('height', 'Height', 1),
      segs('radialSegments', 'Radial Segments', 24, 3),
      segs('heightSegments', 'Height Segments', 1, 1),
    ],
  },
  {
    type: 'capsule',
    label: 'CapsuleGeometry',
    params: [
      size('radius', 'Radius', 0.3),
      size('length', 'Length', 0.8),
      segs('capSegments', 'Cap Segments', 4, 1, 16),
      segs('radialSegments', 'Radial Segments', 16, 3),
    ],
  },
  {
    type: 'torus',
    label: 'TorusGeometry',
    params: [
      size('radius', 'Radius', 0.45),
      size('tube', 'Tube', 0.16),
      segs('radialSegments', 'Radial Segments', 16, 3),
      segs('tubularSegments', 'Tubular Segments', 48, 3),
    ],
  },
  {
    type: 'torusKnot',
    label: 'TorusKnotGeometry',
    params: [
      size('radius', 'Radius', 0.4),
      size('tube', 'Tube', 0.12),
      segs('tubularSegments', 'Tubular Segments', 64, 3, 128),
      segs('radialSegments', 'Radial Segments', 8, 3, 24),
      { key: 'p', label: 'P', min: 1, max: 8, step: 1, default: 2, integer: true },
      { key: 'q', label: 'Q', min: 1, max: 8, step: 1, default: 3, integer: true },
    ],
  },
  {
    type: 'ring',
    label: 'RingGeometry',
    params: [
      size('innerRadius', 'Inner Radius', 0.25),
      size('outerRadius', 'Outer Radius', 0.6),
      segs('thetaSegments', 'Theta Segments', 32, 3),
      segs('phiSegments', 'Phi Segments', 1, 1),
    ],
  },
  {
    type: 'icosahedron',
    label: 'IcosahedronGeometry',
    params: [
      size('radius', 'Radius', 0.6),
      segs('detail', 'Detail', 0, 0, 3),
    ],
  },
  {
    type: 'octahedron',
    label: 'OctahedronGeometry',
    params: [
      size('radius', 'Radius', 0.6),
      segs('detail', 'Detail', 0, 0, 3),
    ],
  },
  {
    type: 'dodecahedron',
    label: 'DodecahedronGeometry',
    params: [
      size('radius', 'Radius', 0.6),
      segs('detail', 'Detail', 0, 0, 2),
    ],
  },
  {
    type: 'tetrahedron',
    label: 'TetrahedronGeometry',
    params: [
      size('radius', 'Radius', 0.6),
      segs('detail', 'Detail', 0, 0, 3),
    ],
  },
]

const byType = new Map(GEOMETRY_CATALOG.map((entry) => [entry.type, entry]))

export function geometryEntry(type: GeometryType): GeometryCatalogEntry {
  const entry = byType.get(type)
  if (!entry) throw new Error(`Unknown geometry "${type}"`)
  return entry
}

export function defaultParams(type: GeometryType): Record<string, number> {
  const params: Record<string, number> = {}
  for (const spec of geometryEntry(type).params) params[spec.key] = spec.default
  return params
}

export function clampParam(type: GeometryType, key: string, value: number): number {
  const spec = geometryEntry(type).params.find((item) => item.key === key)
  if (!spec || !Number.isFinite(value)) return spec?.default ?? 0
  const next = Math.min(spec.max, Math.max(spec.min, value))
  return spec.integer ? Math.round(next) : next
}

/** How far above the ground plane the mesh origin should sit so the shape rests on it. */
export function restOffset(type: GeometryType, params: Record<string, number>): number {
  const n = (key: string) => params[key] ?? 0
  switch (type) {
    case 'box':
      return n('height') / 2
    case 'sphere':
    case 'icosahedron':
    case 'octahedron':
    case 'dodecahedron':
    case 'tetrahedron':
      return n('radius')
    case 'plane':
    case 'circle':
    case 'ring':
      return 0.01
    case 'cylinder':
    case 'cone':
      return n('height') / 2
    case 'capsule':
      return n('length') / 2 + n('radius')
    case 'torus':
    case 'torusKnot':
      return n('radius') + n('tube')
    default:
      return 0
  }
}

export function buildGeometry(type: GeometryType, params: Record<string, number>): THREE.BufferGeometry {
  const n = (key: string) => params[key] ?? 0
  const i = (key: string, min: number) => Math.max(min, Math.round(n(key)))
  let geometry: THREE.BufferGeometry

  switch (type) {
    case 'box':
      geometry = new THREE.BoxGeometry(n('width'), n('height'), n('depth'), i('widthSegments', 1), i('heightSegments', 1), i('depthSegments', 1))
      break
    case 'sphere':
      geometry = new THREE.SphereGeometry(n('radius'), i('widthSegments', 3), i('heightSegments', 2))
      break
    case 'plane':
      geometry = new THREE.PlaneGeometry(n('width'), n('height'), i('widthSegments', 1), i('heightSegments', 1))
      geometry.rotateX(-Math.PI / 2)
      break
    case 'circle':
      geometry = new THREE.CircleGeometry(n('radius'), i('segments', 3))
      geometry.rotateX(-Math.PI / 2)
      break
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(n('radiusTop'), n('radiusBottom'), n('height'), i('radialSegments', 3), i('heightSegments', 1))
      break
    case 'cone':
      geometry = new THREE.ConeGeometry(n('radius'), n('height'), i('radialSegments', 3), i('heightSegments', 1))
      break
    case 'capsule':
      geometry = new THREE.CapsuleGeometry(n('radius'), n('length'), i('capSegments', 1), i('radialSegments', 3))
      break
    case 'torus':
      geometry = new THREE.TorusGeometry(n('radius'), n('tube'), i('radialSegments', 3), i('tubularSegments', 3))
      break
    case 'torusKnot':
      geometry = new THREE.TorusKnotGeometry(n('radius'), n('tube'), i('tubularSegments', 3), i('radialSegments', 3), i('p', 1), i('q', 1))
      break
    case 'ring':
      geometry = new THREE.RingGeometry(n('innerRadius'), Math.max(n('outerRadius'), n('innerRadius') + 0.02), i('thetaSegments', 3), i('phiSegments', 1))
      geometry.rotateX(-Math.PI / 2)
      break
    case 'icosahedron':
      geometry = new THREE.IcosahedronGeometry(n('radius'), i('detail', 0))
      break
    case 'octahedron':
      geometry = new THREE.OctahedronGeometry(n('radius'), i('detail', 0))
      break
    case 'dodecahedron':
      geometry = new THREE.DodecahedronGeometry(n('radius'), i('detail', 0))
      break
    case 'tetrahedron':
      geometry = new THREE.TetrahedronGeometry(n('radius'), i('detail', 0))
      break
    default:
      geometry = new THREE.BoxGeometry(1, 1, 1)
  }

  geometry.name = geometryEntry(type).label
  return geometry
}

export function triangleCount(geometry: THREE.BufferGeometry | null | undefined): number {
  if (!geometry) return 0
  if (geometry.index) return geometry.index.count / 3
  const position = geometry.getAttribute('position')
  return position ? position.count / 3 : 0
}
