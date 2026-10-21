import * as THREE from 'three/webgpu'

const COLOR = '#6ec8e0'
let texture: THREE.CanvasTexture | null = null

/** Labeled badge so a camera with no mesh can still be selected in the viewport. */
export function attachCameraIcon(object: THREE.Object3D): void {
  if (object.getObjectByName('CameraIcon')) return
  const material = new THREE.SpriteMaterial({
    map: cameraTexture(),
    transparent: true,
    depthWrite: false,
    depthTest: true,
    sizeAttenuation: true,
    toneMapped: false,
  })
  const sprite = new THREE.Sprite(material)
  sprite.name = 'CameraIcon'
  sprite.userData.editorHidden = true
  sprite.userData.cameraIcon = true
  sprite.center.set(0.5, 0)
  sprite.renderOrder = 10
  object.add(sprite)
}

export function disposeCameraIcon(object: THREE.Object3D): void {
  const icon = object.getObjectByName('CameraIcon')
  if (!(icon instanceof THREE.Sprite)) return
  icon.material.dispose()
  icon.removeFromParent()
}

function cameraTexture(): THREE.CanvasTexture {
  if (texture) return texture
  const canvas = document.createElement('canvas')
  canvas.width = 160
  canvas.height = 160
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not draw the camera icon.')
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
  ctx.translate(80, 64)
  ctx.strokeStyle = COLOR
  ctx.fillStyle = COLOR
  ctx.lineWidth = 6
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  roundRect(ctx, -34, -18, 68, 44, 8)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 4, 14, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 4, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(16, -18)
  ctx.lineTo(28, -30)
  ctx.lineTo(36, -24)
  ctx.lineTo(24, -12)
  ctx.stroke()
  ctx.restore()

  ctx.fillStyle = COLOR
  ctx.font = '700 18px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Camera', 80, 128)
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
