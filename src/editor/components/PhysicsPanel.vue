<script setup lang="ts">
import { useEditorStore } from '../stores/editor'
import type { PhysicsWorldSettings } from '../physicsSettings'

const store = useEditorStore()

function writeNumber(
  event: Event,
  apply: (world: PhysicsWorldSettings, value: number) => void,
): void {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) return
  store.editPhysicsWorld((world) => apply(world, value))
}

function writeFlag(
  event: Event,
  apply: (world: PhysicsWorldSettings, value: boolean) => void,
): void {
  const value = (event.target as HTMLInputElement).checked
  store.editPhysicsWorld((world) => apply(world, value))
}
</script>

<template>
  <div class="physics-panel">
    <section>
      <h3>Simulation</h3>
      <label class="physics-row">
        <span>Enable</span>
        <input type="checkbox" :checked="store.physics.enabled" @change="store.setPhysicsEnabled(($event.target as HTMLInputElement).checked)" />
      </label>
      <p class="physics-note">Turning physics off or on reloads the page. While it is off, the physics module is not imported.</p>
    </section>

    <section>
      <h3>Gravity</h3>
      <label class="physics-row">
        <span>Enabled</span>
        <input type="checkbox" :checked="store.physics.world.gravityEnabled" @change="writeFlag($event, (world, value) => { world.gravityEnabled = value })" />
      </label>
      <label class="physics-row">
        <span>X</span>
        <input type="number" step="any" :value="store.physics.world.gravity[0]" @change="writeNumber($event, (world, value) => { world.gravity[0] = value })" />
      </label>
      <label class="physics-row">
        <span>Y</span>
        <input type="number" step="any" :value="store.physics.world.gravity[1]" @change="writeNumber($event, (world, value) => { world.gravity[1] = value })" />
      </label>
      <label class="physics-row">
        <span>Z</span>
        <input type="number" step="any" :value="store.physics.world.gravity[2]" @change="writeNumber($event, (world, value) => { world.gravity[2] = value })" />
      </label>
    </section>

    <section>
      <h3>Contacts</h3>
      <label class="physics-row">
        <span>Preserve Lambda Distance²</span>
        <input type="number" step="any" :value="store.physics.world.contacts.contactPointPreserveLambdaMaxDistSq" @change="writeNumber($event, (world, value) => { world.contacts.contactPointPreserveLambdaMaxDistSq = value })" />
      </label>
    </section>

    <section>
      <h3>CCD</h3>
      <label class="physics-row">
        <span>Linear Cast Threshold</span>
        <input type="number" step="any" :value="store.physics.world.ccd.linearCastThreshold" @change="writeNumber($event, (world, value) => { world.ccd.linearCastThreshold = value })" />
      </label>
      <label class="physics-row">
        <span>Linear Cast Max Penetration</span>
        <input type="number" step="any" :value="store.physics.world.ccd.linearCastMaxPenetration" @change="writeNumber($event, (world, value) => { world.ccd.linearCastMaxPenetration = value })" />
      </label>
      <label class="physics-row">
        <span>Min Velocity For Restitution</span>
        <input type="number" step="any" :value="store.physics.world.ccd.minVelocityForRestitution" @change="writeNumber($event, (world, value) => { world.ccd.minVelocityForRestitution = value })" />
      </label>
    </section>

    <section>
      <h3>Narrowphase</h3>
      <label class="physics-row">
        <span>Collision Tolerance</span>
        <input type="number" step="any" :value="store.physics.world.narrowphase.collisionTolerance" @change="writeNumber($event, (world, value) => { world.narrowphase.collisionTolerance = value })" />
      </label>
      <label class="physics-row">
        <span>Penetration Tolerance</span>
        <input type="number" step="any" :value="store.physics.world.narrowphase.penetrationTolerance" @change="writeNumber($event, (world, value) => { world.narrowphase.penetrationTolerance = value })" />
      </label>
      <label class="physics-row">
        <span>Return Deepest Point</span>
        <input type="checkbox" :checked="store.physics.world.narrowphase.returnDeepestPoint" @change="writeFlag($event, (world, value) => { world.narrowphase.returnDeepestPoint = value })" />
      </label>
      <label class="physics-row">
        <span>Active Edges Only</span>
        <input type="checkbox" :checked="store.physics.world.narrowphase.collideOnlyWithActiveEdges" @change="writeFlag($event, (world, value) => { world.narrowphase.collideOnlyWithActiveEdges = value })" />
      </label>
      <label class="physics-row">
        <span>Speculative Contact Distance</span>
        <input type="number" step="any" :value="store.physics.world.narrowphase.speculativeContactDistance" @change="writeNumber($event, (world, value) => { world.narrowphase.speculativeContactDistance = value })" />
      </label>
      <label class="physics-row">
        <span>Manifold Tolerance</span>
        <input type="number" step="any" :value="store.physics.world.narrowphase.manifoldTolerance" @change="writeNumber($event, (world, value) => { world.narrowphase.manifoldTolerance = value })" />
      </label>
      <label class="physics-row">
        <span>Collide With Backfaces</span>
        <input type="checkbox" :checked="store.physics.world.narrowphase.collideWithBackfaces" @change="writeFlag($event, (world, value) => { world.narrowphase.collideWithBackfaces = value })" />
      </label>
      <label class="physics-row">
        <span>Manifold Reduction</span>
        <input type="checkbox" :checked="store.physics.world.narrowphase.useManifoldReduction" @change="writeFlag($event, (world, value) => { world.narrowphase.useManifoldReduction = value })" />
      </label>
      <label class="physics-row">
        <span>Normal Cos Max Delta Rotation</span>
        <input type="number" step="any" :value="store.physics.world.narrowphase.normalCosMaxDeltaRotation" @change="writeNumber($event, (world, value) => { world.narrowphase.normalCosMaxDeltaRotation = value })" />
      </label>
      <label class="physics-row">
        <span>Body Pair Contact Cache</span>
        <input type="checkbox" :checked="store.physics.world.narrowphase.useBodyPairContactCache" @change="writeFlag($event, (world, value) => { world.narrowphase.useBodyPairContactCache = value })" />
      </label>
      <label class="physics-row">
        <span>Body Pair Max Delta Position²</span>
        <input type="number" step="any" :value="store.physics.world.narrowphase.bodyPairCacheMaxDeltaPositionSq" @change="writeNumber($event, (world, value) => { world.narrowphase.bodyPairCacheMaxDeltaPositionSq = value })" />
      </label>
      <label class="physics-row">
        <span>Body Pair Cos Max Delta Rotation</span>
        <input type="number" step="any" :value="store.physics.world.narrowphase.bodyPairCacheCosMaxDeltaRotationDiv2" @change="writeNumber($event, (world, value) => { world.narrowphase.bodyPairCacheCosMaxDeltaRotationDiv2 = value })" />
      </label>
    </section>

    <section>
      <h3>Solver</h3>
      <label class="physics-row">
        <span>Min Velocity For Restitution</span>
        <input type="number" step="any" :value="store.physics.world.solver.minVelocityForRestitution" @change="writeNumber($event, (world, value) => { world.solver.minVelocityForRestitution = value })" />
      </label>
      <label class="physics-row">
        <span>Velocity Iterations</span>
        <input type="number" step="1" :value="store.physics.world.solver.velocityIterations" @change="writeNumber($event, (world, value) => { world.solver.velocityIterations = value })" />
      </label>
      <label class="physics-row">
        <span>Position Iterations</span>
        <input type="number" step="1" :value="store.physics.world.solver.positionIterations" @change="writeNumber($event, (world, value) => { world.solver.positionIterations = value })" />
      </label>
      <label class="physics-row">
        <span>Warm Starting</span>
        <input type="checkbox" :checked="store.physics.world.solver.warmStarting" @change="writeFlag($event, (world, value) => { world.solver.warmStarting = value })" />
      </label>
      <label class="physics-row">
        <span>Penetration Slop</span>
        <input type="number" step="any" :value="store.physics.world.solver.penetrationSlop" @change="writeNumber($event, (world, value) => { world.solver.penetrationSlop = value })" />
      </label>
      <label class="physics-row">
        <span>Baumgarte Factor</span>
        <input type="number" step="any" :value="store.physics.world.solver.baumgarteFactor" @change="writeNumber($event, (world, value) => { world.solver.baumgarteFactor = value })" />
      </label>
      <label class="physics-row">
        <span>Warm Start Impulse Ratio</span>
        <input type="number" step="any" :value="store.physics.world.solver.warmStartImpulseRatio" @change="writeNumber($event, (world, value) => { world.solver.warmStartImpulseRatio = value })" />
      </label>
      <label class="physics-row">
        <span>Max Penetration Distance</span>
        <input type="number" step="any" :value="store.physics.world.solver.maxPenetrationDistance" @change="writeNumber($event, (world, value) => { world.solver.maxPenetrationDistance = value })" />
      </label>
    </section>

    <section>
      <h3>Sleeping</h3>
      <label class="physics-row">
        <span>Allow Sleeping</span>
        <input type="checkbox" :checked="store.physics.world.sleeping.allowSleeping" @change="writeFlag($event, (world, value) => { world.sleeping.allowSleeping = value })" />
      </label>
      <label class="physics-row">
        <span>Time Before Sleep</span>
        <input type="number" step="any" :value="store.physics.world.sleeping.timeBeforeSleep" @change="writeNumber($event, (world, value) => { world.sleeping.timeBeforeSleep = value })" />
      </label>
      <label class="physics-row">
        <span>Point Velocity Threshold</span>
        <input type="number" step="any" :value="store.physics.world.sleeping.pointVelocitySleepThreshold" @change="writeNumber($event, (world, value) => { world.sleeping.pointVelocitySleepThreshold = value })" />
      </label>
    </section>

    <section>
      <h3>Layers</h3>
      <p class="physics-note">Moving and Not Moving are the two object layers. Changing a pair reloads the page, because layers are fixed when the world is created.</p>
      <label class="physics-row">
        <span>Moving / Not Moving</span>
        <input type="checkbox" :checked="store.physics.world.pairs.movingNotMoving" @change="store.setPhysicsPair('movingNotMoving', ($event.target as HTMLInputElement).checked)" />
      </label>
      <label class="physics-row">
        <span>Moving / Moving</span>
        <input type="checkbox" :checked="store.physics.world.pairs.movingMoving" @change="store.setPhysicsPair('movingMoving', ($event.target as HTMLInputElement).checked)" />
      </label>
    </section>
  </div>
</template>
