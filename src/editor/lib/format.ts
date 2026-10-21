import type { NodeKind } from '../state'

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return String(Math.round(value * 1000) / 1000)
}

export function kindIcon(kind: NodeKind): string {
  if (kind === 'MeshInstance3D') return 'mesh'
  if (kind === 'DirectionalLight3D') return 'light-dir'
  if (kind === 'OmniLight3D') return 'light-omni'
  if (kind === 'SpotLight3D') return 'light-spot'
  if (kind === 'HemisphereLight3D') return 'light-hemi'
  if (kind === 'Camera3D') return 'camera'
  return 'node'
}

export function kindClass(kind: NodeKind): string {
  if (kind === 'MeshInstance3D') return 'mesh'
  if (kind === 'Node3D') return 'node'
  if (kind === 'Camera3D') return 'camera'
  return 'light'
}
