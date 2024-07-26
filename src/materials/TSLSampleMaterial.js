import { uv, timerLocal, cos, vec3, vec4, MeshBasicNodeMaterial, modelWorldMatrix, positionLocal, tslFn, color, mix, abs } from 'three/nodes'
import { DoubleSide } from 'three'

export const TSLSampleMaterial = new MeshBasicNodeMaterial({
  transparent: true,
  side: DoubleSide
})

const time = timerLocal(1)
const worldPosition = modelWorldMatrix.mul(positionLocal)

const position = vec3(
  cos(time),
  0,
  0
)

// TSLSampleMaterial.positionNode = position
const colorA = color('#ff00ff')
const colorB = color('#00ff00')

// TSLSampleMaterial.positionNode = tslFn(() => {
//   return vec3(
//     0,
//     0,
//     0
//   )
// })()

TSLSampleMaterial.colorNode = tslFn(() => {
  const finalColor = mix(colorA, colorB, abs(uv().sub(0.5)).add(cos(time).mul(0.5)))
  return vec4(finalColor, 1)
})()
