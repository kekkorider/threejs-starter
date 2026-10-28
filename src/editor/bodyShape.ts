import * as THREE from 'three/webgpu'
import type { BodySettings } from './physicsBody'

export const BODY_SHAPE_NAME = 'BodyShape'

const material = new THREE.MeshBasicMaterial({
  color: 0x3dce7a,
  wireframe: true,
  depthTest: false,
  toneMapped: false,
})

function ownedGeometry(object: THREE.Object3D): boolean {
  return object.userData.ownedGeometry === true
}

function disposeShape(object: THREE.Object3D): void {
  if (ownedGeometry(object) && object instanceof THREE.Mesh) object.geometry.dispose()
  object.removeFromParent()
}

/** Remove every editor shape drawn for this body, including one parented to a child mesh. */
export function disposeBodyShapes(root: THREE.Object3D): void {
  const shapes: THREE.Object3D[] = []
  root.traverse((child) => {
    if (child.name === BODY_SHAPE_NAME) shapes.push(child)
  })
  for (const shape of shapes) disposeShape(shape)
}

export function setBodyShapeVisible(root: THREE.Object3D, visible: boolean): void {
  root.traverse((child) => {
    if (child.name === BODY_SHAPE_NAME) child.visible = visible
  })
}

/**
 * Draw the collision shape in the editor.
 * Box and sphere sit on the body. Triangle and convex hull sit on the source mesh so they follow it.
 */
export function syncBodyShape(
  body: THREE.Object3D,
  settings: BodySettings,
  mesh: THREE.Mesh | null,
  visible: boolean,
): void {
  disposeBodyShapes(body)

  let geometry: THREE.BufferGeometry
  let owned = true
  let parent: THREE.Object3D = body
  if (settings.shape === 'box') {
    geometry = new THREE.BoxGeometry(settings.width, settings.height, settings.depth)
  } else if (settings.shape === 'sphere') {
    geometry = new THREE.SphereGeometry(settings.radius, 24, 16)
  } else if (mesh?.geometry) {
    geometry = mesh.geometry
    owned = false
    parent = mesh
  } else {
    geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4)
  }

  const helper = new THREE.Mesh(geometry, material)
  helper.name = BODY_SHAPE_NAME
  helper.userData.editorHidden = true
  helper.userData.ownedGeometry = owned
  helper.frustumCulled = false
  helper.renderOrder = 2
  helper.visible = visible
  parent.add(helper)
}
