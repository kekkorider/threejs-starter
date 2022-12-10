import { ShaderMaterial } from 'three'

import vertexShader from './vertex.glsl'
import fragmentShader from './fragment.glsl'

export const SampleShaderMaterial = new ShaderMaterial({
  vertexShader,
  fragmentShader,
  transparent: false
})
