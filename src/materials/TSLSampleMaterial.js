import { MeshBasicNodeMaterial, vec3, vec4, timerLocal, sin, cos, mix, color, smoothstep, tslFn, positionLocal, remap, normalLocal } from 'three/tsl'

const time = timerLocal()

const material = new MeshBasicNodeMaterial()

const calculatePos = tslFn(() => {
  const x1 = remap(cos(positionLocal.x.add(time).mul(1.2)), -1, 1, 0, 1)
  const x2 = remap(sin(positionLocal.x.add(time.mul(0.5)).mul(5.5)), -1, 1, 0, 1)
  const x = x1.add(x2)

  const y1 = remap(sin(positionLocal.y.sub(time.mul(0.03)).mul(7)), -1, 1, 0, 1)
  const y2 = remap(sin(positionLocal.y.sub(time.mul(0.52)).mul(3.6)), -1, 1, 0, 1)
  const y = y1.add(y2)

  const z1 = remap(sin(positionLocal.z.sub(time.mul(0.73)).mul(3)), -1, 1, 0, 1)
  const z2 = remap(sin(positionLocal.z.add(time.mul(0.23)).mul(7.3)), -1, 1, 0, 1)
  const z = z1.add(z2)

  return vec3(x, y, z)
})

material.colorNode = tslFn(() => {
  const pos = calculatePos()

  const dist = smoothstep(0.6, 1.8, pos.length())

  const colorA = color('#F08700')
  const colorB = color('#00A6A6')

  const col = mix(colorA, colorB, dist)

  return vec4(col, 1)
})()

material.positionNode = tslFn(() => {
  const pos = calculatePos()

  return positionLocal.add(normalLocal.mul(pos.mul(0.25)))
})()

export const TSLSampleMaterial = material
