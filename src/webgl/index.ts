import * as THREE from "three/webgpu"
import { ThreeStart, addComponent } from "three-start"

import { NormalMaterial } from './materials/normal'

import { Spin } from './behaviors/Spin'

const starter = new ThreeStart()
const { scene, camera } = starter.ctx

camera.position.z = 5

starter.mount(document.getElementById('app')! as HTMLDivElement)
starter.start()

const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), NormalMaterial)
addComponent(cube, Spin, { axis: 'y', speed: 1 })
addComponent(cube, Spin, { axis: 'z', speed: 0.87 })
scene.add(cube)
