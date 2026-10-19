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
