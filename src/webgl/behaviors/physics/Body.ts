import { Vector3, Quaternion, Mesh } from 'three/webgpu'
import { Object3DBehaviour } from 'three-start'
import { MotionType, rigidBody } from 'crashcat'

import type { RigidBody, Shape, World, RigidBodySettings } from 'crashcat'

type Params = {
  motionType?: number
}

export class Body extends Object3DBehaviour {
  motionType: Params['motionType'] = MotionType.STATIC
  objectLayer: number | null = null
  body: RigidBody | null = null
  shape: Shape | null = null
  objectWorldPosition: Vector3 = new Vector3()
  objectWorldQuaternion: Quaternion = new Quaternion()

  private positionArray: [number, number, number] = [0, 0, 0]
  private quaternionArray: [number, number, number, number] = [0, 0, 0, 1]

  settings: RigidBodySettings | null = null

  constructor(settings: RigidBodySettings) {
    super()

    this.settings = settings
  }

  onAwake() {
    this.motionType = this.settings?.motionType ?? MotionType.STATIC

    this.createShape()
    this.createBody()
  }

  onDestroy() {
    rigidBody.remove(this.ctx.modules.physics.world as World, this.body as RigidBody)

    if (this.object instanceof Mesh) {
      const { geometry } = this.object
      geometry?.dispose()
    }

    this.object.removeFromParent()
  }

  onUpdate() {
    if (this.motionType === MotionType.DYNAMIC) {
      return
    }

    this.syncFromObject()
  }

  onBeforeRender() {
    if (this.motionType !== MotionType.DYNAMIC) {
      return
    }

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
    const {
      OBJECT_LAYER_NOT_MOVING,
      OBJECT_LAYER_MOVING
    } = this.ctx.modules.physics

    const objectLayer = this.motionType === MotionType.STATIC ?
                          OBJECT_LAYER_NOT_MOVING :
                          OBJECT_LAYER_MOVING

    this.object.getWorldPosition(this.objectWorldPosition)
    this.object.getWorldQuaternion(this.objectWorldQuaternion)

    this.body = rigidBody.create(
      this.ctx.modules.physics.world as World,
        {
        ...this.settings,
        shape: this.shape,
        position: this.objectWorldPosition.toArray(this.positionArray),
        quaternion: this.objectWorldQuaternion.toArray(this.quaternionArray),
        objectLayer,
        motionType: this.motionType,
      } as RigidBodySettings
    )
  }

  createShape() {}

  private syncFromObject() {
    this.object.getWorldPosition(this.objectWorldPosition)
    this.object.getWorldQuaternion(this.objectWorldQuaternion)

    rigidBody.setTransform(
      this.ctx.modules.physics.world as World,
      this.body as RigidBody,
      this.objectWorldPosition.toArray(this.positionArray),
      this.objectWorldQuaternion.toArray(this.quaternionArray),
      false
    )
  }
}
