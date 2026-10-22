<script setup lang="ts">
import { computed, ref } from 'vue'
import type { GroupScope } from '../groups'
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()
const groupFilter = ref('')
const signalFilter = ref('')
const groupName = ref('')
const groupScope = ref<GroupScope>('local')
const groupDescription = ref('')
const signalName = ref('')
const signalArgs = ref('')

const groups = computed(() => {
  const query = groupFilter.value.trim().toLowerCase()
  return store.groupDefinitions.filter((group) => {
    if (!query) return true
    return group.name.toLowerCase().includes(query) || group.description.toLowerCase().includes(query)
  })
})

const signals = computed(() => {
  const query = signalFilter.value.trim().toLowerCase()
  return store.signalRows.filter((signal) => !query || signal.name.toLowerCase().includes(query))
})

const checks = computed(() => {
  const id = store.selectedId
  if (!id) return []
  return store.groupDefinitions.map((group) => {
    const member = store.isNodeInGroup(id, group.name)
    const local = store.isNodeInGroup(id, group.name, 'local')
    const global = store.isNodeInGroup(id, group.name, 'global')
    return `${group.name}: isInGroup ${member}, isInLocalGroup ${local}, isInGlobalGroup ${global}`
  })
})

function linksFor(signal: string) {
  return store.signalLinks.filter((link) => link.signal === signal)
}

function addGroup(): void {
  store.addGroup(groupName.value, groupScope.value, groupDescription.value)
  if (!store.groupError) {
    groupName.value = ''
    groupDescription.value = ''
  }
}

function addSignal(): void {
  if (!store.selectedId) return
  store.addSignal(store.selectedId, signalName.value, signalArgs.value)
  if (!store.signalError) {
    signalName.value = ''
    signalArgs.value = ''
  }
}

function onScope(name: string, event: Event): void {
  const scope = (event.target as HTMLSelectElement).value
  if (scope === 'local' || scope === 'global') store.setGroupScope(name, scope)
}
</script>

<template>
  <section class="dock node-dock">
    <div class="dock-title">Node</div>
    <div class="node-tabs">
      <button type="button" class="node-tab" :class="{ active: store.nodeTab === 'signals' }" @click="store.nodeTab = 'signals'">Signals</button>
      <button type="button" class="node-tab" :class="{ active: store.nodeTab === 'groups' }" @click="store.nodeTab = 'groups'">Groups</button>
    </div>
    <div v-if="store.nodeTab === 'groups'" class="node-body">
      <p v-if="!store.selected" class="empty-note">Select a node.</p>
      <template v-else>
        <p class="hint">Check a group to put this node in it. A component script calls isInGroup, isInLocalGroup, and isInGlobalGroup.</p>
        <p v-if="store.nodeLocked" class="hint">This node belongs to an instanced scene. Change its groups in that scene.</p>
        <input v-model="groupFilter" class="filter dock-filter" placeholder="Filter groups" />
        <p v-if="groups.length === 0" class="hint">No groups yet.</p>
        <div v-for="group in groups" :key="group.name" class="node-row" :title="group.description">
          <label class="check node-check">
            <input
              type="checkbox"
              :checked="store.isNodeInGroup(store.selectedId, group.name)"
              :disabled="store.nodeLocked"
              @change="store.setGroupMember(store.selected.id, group.name, ($event.target as HTMLInputElement).checked)"
            />
            <span class="node-label">{{ group.name }}</span>
          </label>
          <select class="scope-select" :value="group.scope" @change="onScope(group.name, $event)">
            <option value="local">Local</option>
            <option value="global">Global</option>
          </select>
          <button type="button" class="text-btn" @click="store.removeGroup(group.name)">Remove</button>
        </div>
        <pre v-if="checks.length" class="member-check">{{ checks.join('\n') }}</pre>
        <div class="node-add">
          <input v-model="groupName" type="text" placeholder="Group name" @keydown.enter.prevent="addGroup" />
          <select v-model="groupScope">
            <option value="local">Local</option>
            <option value="global">Global</option>
          </select>
          <input v-model="groupDescription" type="text" placeholder="Description" @keydown.enter.prevent="addGroup" />
          <button type="button" class="btn" @click="addGroup">Add</button>
        </div>
        <p v-if="store.groupError" class="node-error">{{ store.groupError }}</p>
      </template>
    </div>
    <div v-else class="node-body">
      <p v-if="!store.selected" class="empty-note">Select a node.</p>
      <template v-else>
        <p class="hint">Connect sends the signal to a component method. eventemitter3 delivers it. A script calls emitSignal, connectSignal, and isSignalConnected.</p>
        <p v-if="store.nodeLocked" class="hint">This node belongs to an instanced scene. Change its signals in that scene.</p>
        <input v-model="signalFilter" class="filter dock-filter" placeholder="Filter signals" />
        <div v-for="signal in signals" :key="signal.name" class="signal-block">
          <div class="node-row">
            <span class="node-label">{{ signal.name }}<span v-if="signal.args.length" class="node-args">({{ signal.args.join(', ') }})</span></span>
            <span v-if="signal.builtin" class="scope-tag">Built-in</span>
            <button type="button" class="text-btn" @click="store.emitSignalOn(store.selected.id, signal.name)">Emit</button>
            <button type="button" class="text-btn" :disabled="store.nodeLocked" @click="store.openSignalConnect(store.selected.id, signal.name)">Connect</button>
            <button v-if="!signal.builtin" type="button" class="text-btn" :disabled="store.nodeLocked" @click="store.removeSignal(store.selected.id, signal.name)">Remove</button>
          </div>
          <div v-for="link in linksFor(signal.name)" :key="link.id" class="link-row">
            <span>{{ link.toName }}.{{ link.component }}.{{ link.method }}</span>
            <button type="button" class="text-btn" @click="store.disconnectSignalLink(link.id)">Disconnect</button>
          </div>
        </div>
        <div class="node-add">
          <input v-model="signalName" type="text" placeholder="Signal name" :disabled="store.nodeLocked" @keydown.enter.prevent="addSignal" />
          <input v-model="signalArgs" type="text" placeholder="arg1, arg2" :disabled="store.nodeLocked" @keydown.enter.prevent="addSignal" />
          <button type="button" class="btn" :disabled="store.nodeLocked" @click="addSignal">Add</button>
        </div>
        <p v-if="store.signalError" class="node-error">{{ store.signalError }}</p>
      </template>
    </div>
  </section>
</template>

<style>
.node-tabs {
  display: flex;
  gap: 2px;
  padding: 4px;
  border-bottom: 1px solid var(--line);
  flex: none;
}
.node-tab {
  border: 1px solid transparent;
  background: transparent;
  color: var(--font-dim);
  border-radius: 4px;
  height: 24px;
  padding: 0 10px;
}
.node-tab.active {
  color: white;
  background: #3a3a3a;
  box-shadow: inset 0 -2px 0 var(--accent);
}
.node-body {
  overflow: auto;
  min-height: 0;
  flex: 1;
  padding-bottom: 8px;
}
.node-body .hint { margin: 0; }
.dock-filter { width: calc(100% - 8px); }
.node-row, .link-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 26px;
  padding: 0 8px;
}
.link-row {
  color: var(--font-dim);
  padding-left: 28px;
  font-size: 12px;
}
.node-check { justify-content: flex-start; flex: 1; min-width: 0; }
.node-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.node-args { color: var(--font-mute); }
.scope-select {
  height: 22px;
  background: var(--inset);
  border: 1px solid #121212;
  border-radius: 3px;
  color: inherit;
}
.scope-tag {
  color: var(--font-mute);
  font-size: 11px;
  margin-left: auto;
}
.text-btn {
  border: 0;
  background: transparent;
  color: var(--accent);
  height: 22px;
  padding: 0 4px;
}
.text-btn:hover { color: white; }
.text-btn:disabled { color: var(--font-mute); }
.node-add {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 8px 0;
}
.node-add input, .node-add select {
  height: 24px;
  background: var(--inset);
  border: 1px solid #141414;
  border-radius: 3px;
  padding: 0 6px;
  min-width: 0;
}
.node-add input { flex: 1; }
.node-error {
  color: var(--danger);
  margin: 6px 8px 0;
}
.member-check {
  margin: 8px;
  padding: 6px 8px;
  background: var(--inset);
  border-radius: 3px;
  color: var(--font-dim);
  font-family: ui-monospace, Consolas, monospace;
  font-size: 11px;
  line-height: 1.45;
  white-space: pre-wrap;
  user-select: text;
}
.signal-block + .signal-block { border-top: 1px solid #262626; }
</style>
