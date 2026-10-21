import * as THREE from 'three/webgpu'

/** Viewport badge for one light kind. The shape and the label both name the kind. */
export type LightIconKind = 'directional' | 'omni' | 'spot' | 'hemisphere'

const cache = new Map<LightIconKind, THREE.CanvasTexture>()

const KIND_COLOR: Record<LightIconKind, string> = {
  directional: '#ffbf47',
  omni: '#ffe14d',
  spot: '#ff8a3d',
  hemisphere: '#8ec8ff',
}

const KIND_LABEL: Record<LightIconKind, string> = {
  directional: 'Directional',
  omni: 'Omni',
  spot: 'Spot',
  hemisphere: 'Hemisphere',
}

export function attachLightIcon(object: THREE.Object3D, kind: LightIconKind): void {
  if (object.getObjectByName('LightIcon')) return
  const material = new THREE.SpriteMaterial({
    map: lightIconTexture(kind),
    transparent: true,
    depthWrite: false,
    depthTest: true,
    sizeAttenuation: true,
    toneMapped: false,
  })
  const sprite = new THREE.Sprite(material)
  sprite.name = 'LightIcon'
  sprite.userData.editorHidden = true
  sprite.userData.lightIcon = true
  sprite.castShadow = false
  sprite.scale.set(0.7, 0.7, 1)
  sprite.renderOrder = 10
  object.add(sprite)
}

export function disposeLightIcon(object: THREE.Object3D): void {
  const icon = object.getObjectByName('LightIcon')
  if (!(icon instanceof THREE.Sprite)) return
  icon.material.dispose()
  icon.removeFromParent()
}

/** Shaft and head along local -Z, which is the direction a directional or spot light shines. */
export function attachLightArrow(object: THREE.Object3D): void {
  if (object.getObjectByName('LightArrow')) return
  const material = new THREE.MeshBasicNodeMaterial({
    color: 0xffbf47,
    depthTest: true,
    toneMapped: false,
  })
  const arrow = new THREE.Group()
  arrow.name = 'LightArrow'
  arrow.userData.editorHidden = true
  arrow.userData.lightArrow = true

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.15, 8), material)
  shaft.rotation.x = -Math.PI / 2
  shaft.position.z = -0.58
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.36, 12), material)
  head.rotation.x = -Math.PI / 2
  head.position.z = -1.34
  for (const part of [shaft, head]) {
    part.userData.editorHidden = true
    part.castShadow = false
    part.raycast = () => {}
  }
  arrow.add(shaft, head)
  object.add(arrow)
}

export function disposeLightArrow(object: THREE.Object3D): void {
  const arrow = object.getObjectByName('LightArrow')
  if (!arrow) return
  const disposed = new Set<THREE.Material>()
  for (const child of [...arrow.children]) {
    if (!(child instanceof THREE.Mesh)) continue
    child.geometry.dispose()
    const material = child.material
    if (!Array.isArray(material) && !disposed.has(material)) {
      disposed.add(material)
      material.dispose()
    }
  }
  arrow.removeFromParent()
}

/**
 * Cone length used when Range is 0. Three treats that as unlimited, so the gizmo
 * still draws the angle instead of collapsing to a point.
 */
const UNLIMITED_SPOT_RANGE = 10

const coneScale = new THREE.Vector3()

/**
 * Wire cone for a spot light, in addition to the direction arrow.
 * The ring sits where Angle meets Range (on the range sphere), eight spokes
 * join it to the light, and a center line runs out to Range along local -Z.
 */
export function attachSpotCone(object: THREE.Object3D): void {
  if (object.getObjectByName('SpotCone')) return
  const material = new THREE.LineBasicNodeMaterial({
    color: object instanceof THREE.SpotLight ? object.color : 0xff8a3d,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  })
  const cone = new THREE.Group()
  cone.name = 'SpotCone'
  cone.userData.editorHidden = true
  cone.userData.spotCone = true
  cone.add(
    coneLine('SpotConeCap', ringPositions(48), material),
    coneLine('SpotConeSpokes', spokePositions(8), material),
    coneLine('SpotConeAxis', [0, 0, 0, 0, 0, -1], material),
  )
  object.add(cone)
  updateSpotCone(object)
}

export function updateSpotCone(object: THREE.Object3D): void {
  if (!(object instanceof THREE.SpotLight)) return
  const cone = object.getObjectByName('SpotCone')
  if (!cone) return
  const range = object.distance > 0 ? object.distance : UNLIMITED_SPOT_RANGE
  const angle = THREE.MathUtils.clamp(object.angle, 0, Math.PI / 2)
  const radius = range * Math.sin(angle)
  const depth = Math.max(range * Math.cos(angle), 1e-4)
  object.getWorldScale(coneScale)
  const sx = nonzero(coneScale.x)
  const sy = nonzero(coneScale.y)
  const sz = nonzero(coneScale.z)
  cone.getObjectByName('SpotConeCap')?.scale.set(radius / sx, radius / sy, depth / sz)
  cone.getObjectByName('SpotConeSpokes')?.scale.set(radius / sx, radius / sy, depth / sz)
  cone.getObjectByName('SpotConeAxis')?.scale.set(1 / sx, 1 / sy, range / sz)
  const material = coneMaterial(cone)
  material?.color.copy(object.color)
}

export function disposeSpotCone(object: THREE.Object3D): void {
  const cone = object.getObjectByName('SpotCone')
  if (!cone) return
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  for (const child of [...cone.children]) {
    if (!(child instanceof THREE.LineSegments)) continue
    if (!geometries.has(child.geometry)) {
      geometries.add(child.geometry)
      child.geometry.dispose()
    }
    const material = child.material
    if (!Array.isArray(material) && !materials.has(material)) {
      materials.add(material)
      material.dispose()
    }
  }
  cone.removeFromParent()
}

function coneLine(name: string, positions: number[], material: THREE.LineBasicNodeMaterial): THREE.LineSegments {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const line = new THREE.LineSegments(geometry, material)
  line.name = name
  line.userData.editorHidden = true
  line.userData.spotCone = true
  line.castShadow = false
  line.frustumCulled = false
  line.raycast = () => {}
  return line
}

function ringPositions(segments: number): number[] {
  const positions: number[] = []
  for (let index = 0; index < segments; index += 1) {
    const start = (index / segments) * Math.PI * 2
    const end = ((index + 1) / segments) * Math.PI * 2
    positions.push(Math.cos(start), Math.sin(start), -1, Math.cos(end), Math.sin(end), -1)
  }
  return positions
}

function spokePositions(count: number): number[] {
  const positions: number[] = []
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2
    positions.push(0, 0, 0, Math.cos(angle), Math.sin(angle), -1)
  }
  return positions
}

function coneMaterial(cone: THREE.Object3D): THREE.LineBasicNodeMaterial | null {
  for (const child of cone.children) {
    if (child instanceof THREE.LineSegments && child.material instanceof THREE.LineBasicNodeMaterial) return child.material
  }
  return null
}

function nonzero(value: number): number {
  if (Math.abs(value) >= 1e-8) return value
  return value < 0 ? -1e-8 : 1e-8
}

function lightIconTexture(kind: LightIconKind): THREE.CanvasTexture {
  const existing = cache.get(kind)
  if (existing) return existing
  const canvas = document.createElement('canvas')
  canvas.width = 160
  canvas.height = 160
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not draw the light icon.')
  drawBadge(ctx, kind)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  cache.set(kind, texture)
  return texture
}

function drawBadge(ctx: CanvasRenderingContext2D, kind: LightIconKind): void {
  const color = KIND_COLOR[kind]
  ctx.clearRect(0, 0, 160, 160)
  roundRect(ctx, 6, 6, 148, 148, 22)
  ctx.fillStyle = 'rgba(16, 18, 24, 0.92)'
  ctx.fill()
  ctx.lineWidth = 6
  ctx.strokeStyle = color
  ctx.stroke()

  ctx.save()
  ctx.translate(80, 68)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (kind === 'directional') drawDirectional(ctx)
  else if (kind === 'omni') drawOmni(ctx)
  else if (kind === 'spot') drawSpot(ctx)
  else drawHemisphere(ctx)
  ctx.restore()

  ctx.fillStyle = color
  ctx.font = '700 18px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(KIND_LABEL[kind], 80, 128)
}

function drawDirectional(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath()
  ctx.arc(0, -28, 11, 0, Math.PI * 2)
  ctx.fill()
  for (const y of [-6, 10, 26]) {
    ctx.beginPath()
    ctx.moveTo(-26, y)
    ctx.lineTo(16, y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(10, y - 8)
    ctx.lineTo(26, y)
    ctx.lineTo(10, y + 8)
    ctx.stroke()
  }
}

function drawOmni(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath()
  ctx.arc(0, 0, 12, 0, Math.PI * 2)
  ctx.fill()
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI / 4) * index
    const inner = 20
    const outer = 36
    ctx.beginPath()
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
    ctx.stroke()
  }
}

function drawSpot(ctx: CanvasRenderingContext2D): void {
  roundRect(ctx, -10, -38, 20, 14, 3)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-8, -22)
  ctx.lineTo(8, -22)
  ctx.lineTo(30, 32)
  ctx.lineTo(-30, 32)
  ctx.closePath()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(0, -18)
  ctx.lineTo(0, 24)
  ctx.stroke()
}

function drawHemisphere(ctx: CanvasRenderingContext2D): void {
  ctx.save()
  ctx.beginPath()
  ctx.arc(0, 4, 30, Math.PI, 0)
  ctx.closePath()
  ctx.fillStyle = '#8ec8ff'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(0, 4, 30, 0, Math.PI)
  ctx.closePath()
  ctx.fillStyle = '#d2a36a'
  ctx.fill()
  ctx.restore()
  ctx.beginPath()
  ctx.arc(0, 4, 30, 0, Math.PI * 2)
  ctx.strokeStyle = '#f4f7fb'
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-30, 4)
  ctx.lineTo(30, 4)
  ctx.stroke()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}
