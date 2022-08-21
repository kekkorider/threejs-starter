import { ShaderMaterial } from 'three'

export const SampleShaderMaterial = new ShaderMaterial({
  vertexShader: require('./vertex.glsl'),
  fragmentShader: require('./fragment.glsl'),
  transparent: true
})
