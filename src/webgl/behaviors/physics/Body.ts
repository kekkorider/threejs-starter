import { Object3DBehaviour } from 'three-start'
import { MotionType, rigidBody } from 'crashcat'

import type * as THREE from 'three/webgpu'
import type { RigidBody, Shape, World } from 'crashcat'

type Params = {
  motionType?: number
}

export class Body extends Object3DBehaviour {
  motionType: Params['motionType'] = MotionType.STATIC
  objectLayer: number | null = null
  body: RigidBody | null = null
  bodyBias: number = 0.01
  shape: Shape | null = null

  constructor(params?: Params) {
    super()

    this.motionType = params?.motionType ?? MotionType.STATIC
  }

  onAwake() {
    const { OBJECT_LAYER_NOT_MOVING, OBJECT_LAYER_MOVING } = this.ctx.modules.physics
    this.objectLayer = this.motionType === MotionType.STATIC ? OBJECT_LAYER_NOT_MOVING : OBJECT_LAYER_MOVING

    this.createShape()
    this.createBody()
  }

  onDestroy() {
    rigidBody.remove(this.ctx.modules.physics.world as World, this.body as RigidBody)

    const { geometry } = this.object as THREE.Mesh

    geometry?.dispose()
    this.object.removeFromParent()
  }

  onUpdate() {
    if (this.motionType === MotionType.STATIC) return

    this.object.position.set(
      this.body!.position[0],
      this.body!.position[1],
      this.body!.position[2],
    )

    this.object.quaternion.set(
      this.body!.quaternion[0],
      this.body!.quaternion[1],
      this.body!.quaternion[2],
      this.body!.quaternion[3],
    )
  }

  createBody() {
    this.body = rigidBody.create(this.ctx.modules.physics.world as World, {
      motionType: this.motionType as number,
      shape: this.shape,
      position: this.object.position.clone().toArray(),
      quaternion: this.object.quaternion.clone().toArray(),
      restitution: 0.2,
      objectLayer: this.objectLayer as number,
    })
  }

  createShape() {}
}
