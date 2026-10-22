import * as THREE from 'three/webgpu'

const COLOR = '#6ec8a0'
let texture: THREE.CanvasTexture | null = null

/** Badge so a WorldEnvironment, which has no mesh, can be selected in the viewport. */
export function attachEnvironmentIcon(object: THREE.Object3D): void {
  if (object.getObjectByName('EnvironmentIcon')) return
  const material = new THREE.SpriteMaterial({
    map: environmentTexture(),
    transparent: true,
    depthWrite: false,
    depthTest: true,
    sizeAttenuation: true,
    toneMapped: false,
  })
  const sprite = new THREE.Sprite(material)
  sprite.name = 'EnvironmentIcon'
  sprite.userData.editorHidden = true
  sprite.userData.environmentIcon = true
  sprite.castShadow = false
  sprite.center.set(0.5, 0)
  sprite.renderOrder = 10
  object.add(sprite)
}

export function disposeEnvironmentIcon(object: THREE.Object3D): void {
  const icon = object.getObjectByName('EnvironmentIcon')
  if (!(icon instanceof THREE.Sprite)) return
  icon.material.dispose()
  icon.removeFromParent()
}

function environmentTexture(): THREE.CanvasTexture {
  if (texture) return texture
  const canvas = document.createElement('canvas')
  canvas.width = 160
  canvas.height = 160
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not draw the environment icon.')
  drawBadge(ctx)
  texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

function drawBadge(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, 160, 160)
  roundRect(ctx, 6, 6, 148, 148, 22)
  ctx.fillStyle = 'rgba(16, 18, 24, 0.92)'
  ctx.fill()
  ctx.lineWidth = 6
  ctx.strokeStyle = COLOR
  ctx.stroke()

  ctx.save()
  ctx.translate(80, 62)
  ctx.strokeStyle = COLOR
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(0, 0, 28, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-28, 0)
  ctx.bezierCurveTo(-10, -8, 10, 8, 28, 0)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-28, 0)
  ctx.bezierCurveTo(-10, 8, 10, -8, 28, 0)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(0, 0, 12, 28, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  ctx.fillStyle = COLOR
  ctx.font = '700 22px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Env', 80, 124)
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
