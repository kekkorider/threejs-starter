import { Matrix4, Vector3, type Mesh } from 'three/webgpu'
import {
  box,
  convexHull,
  dof,
  MaterialCombineMode,
  MotionQuality,
  MotionType,
  rigidBody,
  sphere,
  triangleMesh,
} from 'crashcat'
import type { RigidBodySettings, Shape } from 'crashcat'
import {
  type BodyMotion,
  type BodySettings,
  type CombineModeName,
  copyBodySettings,
} from '../../../editor/physicsBody'
import { Body } from './Body'

const relative = new Matrix4()
const vertex = new Vector3()

function motionOf(motion: BodyMotion): MotionType {
  if (motion === 'kinematic') return MotionType.KINEMATIC
  if (motion === 'dynamic') return MotionType.DYNAMIC
  return MotionType.STATIC
}

function combineOf(mode: CombineModeName): MaterialCombineMode {
  if (mode === 'average') return MaterialCombineMode.AVERAGE
  if (mode === 'multiply') return MaterialCombineMode.MULTIPLY
  if (mode === 'min') return MaterialCombineMode.MIN
  if (mode === 'max') return MaterialCombineMode.MAX
  return MaterialCombineMode.GEOMETRIC_MEAN
}

function rigidSettings(editor: BodySettings): RigidBodySettings {
  const axes = editor.dof
  return {
    shape: null,
    objectLayer: 0,
    motionType: motionOf(editor.motion),
    motionQuality: editor.motionQuality === 'linearCast' ? MotionQuality.LINEAR_CAST : MotionQuality.DISCRETE,
    allowedDegreesOfFreedom: dof(
      axes.translateX,
      axes.translateY,
      axes.translateZ,
      axes.rotateX,
      axes.rotateY,
      axes.rotateZ,
    ),
    gravityFactor: editor.gravityFactor,
    linearDamping: editor.linearDamping,
    angularDamping: editor.angularDamping,
    maxLinearVelocity: editor.maxLinearVelocity,
    maxAngularVelocity: editor.maxAngularVelocity,
    friction: editor.friction,
    restitution: editor.restitution,
    frictionCombineMode: combineOf(editor.frictionCombine),
    restitutionCombineMode: combineOf(editor.restitutionCombine),
    useManifoldReduction: editor.useManifoldReduction,
    allowSleeping: editor.allowSleeping,
    sensor: editor.sensor,
    enhancedInternalEdgeRemoval: editor.enhancedInternalEdgeRemoval,
    collideKinematicVsNonDynamic: editor.collideKinematicVsNonDynamic,
    mass: editor.mass,
  }
}

/**
 * Play-mode body for an editor Body node.
 * The node stays in the tree when play stops. Only the crashcat body is removed.
 */
export class SceneBody extends Body {
  editor: BodySettings
  mesh: Mesh | null

  constructor(editor: BodySettings, mesh: Mesh | null = null) {
    super(rigidSettings(editor))
    this.editor = copyBodySettings(editor)
    this.mesh = mesh
  }

  override createShape(): void {
    try {
      this.shape = this.makeShape()
    } catch {
      this.shape = null
    }
  }

  override onDestroy(): void {
    const world = this.ctx.modules.physics?.world
    if (world && this.body) rigidBody.remove(world, this.body)
    this.body = null
    this.shape = null
  }

  private makeShape(): Shape | null {
    const editor = this.editor
    this.object.updateWorldMatrix(true, false)
    const scale = new Vector3()
    this.object.getWorldScale(scale)
    if (editor.shape === 'box') {
      return box.create({
        halfExtents: [
          (editor.width * Math.abs(scale.x)) / 2,
          (editor.height * Math.abs(scale.y)) / 2,
          (editor.depth * Math.abs(scale.z)) / 2,
        ],
      })
    }
    if (editor.shape === 'sphere') {
      const uniform = Math.max(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z))
      return sphere.create({ radius: editor.radius * uniform })
    }
    const mesh = this.mesh
    if (!mesh) return null
    const positions = mesh.geometry.getAttribute('position')
    if (!positions || positions.count < 1) return null
    const points = this.pointsInBodySpace(mesh, positions.count)
    if (editor.shape === 'convexHull') {
      if (points.length < 9) return null
      return convexHull.create({ positions: points })
    }
    const index = mesh.geometry.getIndex()
    const indices = index
      ? [...index.array]
      : Array.from({ length: positions.count }, (_, item) => item)
    if (indices.length < 3) return null
    return triangleMesh.create({ positions: points, indices })
  }

  private pointsInBodySpace(mesh: Mesh, count: number): number[] {
    mesh.updateWorldMatrix(true, false)
    relative.copy(this.object.matrixWorld).invert().multiply(mesh.matrixWorld)
    const attribute = mesh.geometry.getAttribute('position')
    const points: number[] = []
    for (let index = 0; index < count; index += 1) {
      vertex.fromBufferAttribute(attribute, index).applyMatrix4(relative)
      points.push(vertex.x, vertex.y, vertex.z)
    }
    return points
  }
}
