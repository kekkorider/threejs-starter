/** Local groups belong to one scene. Global groups belong to the project. */

export type GroupScope = 'local' | 'global'

export interface GroupRecord {
  name: string
  description: string
}

export interface GroupDefinition extends GroupRecord {
  scope: GroupScope
}

const GROUP_NAME = /^[A-Za-z][A-Za-z0-9 _-]{0,47}$/

export const GLOBAL_GROUPS_KEY = 'threejs-starter.global-groups'

export function normalizeGroupName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ')
  if (!GROUP_NAME.test(name)) return null
  return name
}

export function normalizeDescription(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, 120)
}

export function isGroupRecord(value: unknown): value is GroupRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as GroupRecord
  return typeof record.name === 'string'
    && normalizeGroupName(record.name) === record.name
    && typeof record.description === 'string'
    && record.description.length <= 120
    && !record.description.includes('\n')
}

/** True when `members` contains `group`. A scope argument also checks local or global. */
export function membershipMatches(
  members: readonly string[],
  group: string,
  definedScope: GroupScope | null,
  scope?: GroupScope,
): boolean {
  const name = normalizeGroupName(group)
  if (!name || !members.includes(name)) return false
  if (scope === undefined) return true
  if (scope !== 'local' && scope !== 'global') return false
  if (definedScope) return definedScope === scope
  return scope === 'local'
}

export function copyGroupNames(names: readonly string[] | undefined): string[] {
  if (!names) return []
  const seen = new Set<string>()
  const next: string[] = []
  for (const name of names) {
    if (typeof name !== 'string' || seen.has(name) || normalizeGroupName(name) !== name) continue
    seen.add(name)
    next.push(name)
  }
  return next
}

export function readGlobalGroups(): GroupRecord[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(GLOBAL_GROUPS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const seen = new Set<string>()
    const records: GroupRecord[] = []
    for (const item of parsed) {
      if (!isGroupRecord(item) || seen.has(item.name)) continue
      seen.add(item.name)
      records.push({ name: item.name, description: item.description })
    }
    return records
  } catch {
    return []
  }
}

export function writeGlobalGroups(records: readonly GroupRecord[]): void {
  if (typeof localStorage === 'undefined') return
  const payload = records.map((record) => ({ name: record.name, description: record.description }))
  localStorage.setItem(GLOBAL_GROUPS_KEY, JSON.stringify(payload))
}

/** Project global groups plus the local groups of the open scene. */
export class GroupCatalog {
  private local: GroupRecord[] = []
  private global: GroupRecord[] = []

  constructor() {
    this.global = readGlobalGroups()
  }

  list(): GroupDefinition[] {
    const globals = this.global.map((record) => ({ ...record, scope: 'global' as const }))
    const locals = this.local.map((record) => ({ ...record, scope: 'local' as const }))
    return [...globals, ...locals].sort((left, right) => left.name.localeCompare(right.name))
  }

  localRecords(): GroupRecord[] {
    return this.local.map((record) => ({ ...record }))
  }

  globalRecords(): GroupRecord[] {
    return this.global.map((record) => ({ ...record }))
  }

  scopeOf(group: string): GroupScope | null {
    const name = normalizeGroupName(group)
    if (!name) return null
    if (this.global.some((record) => record.name === name)) return 'global'
    if (this.local.some((record) => record.name === name)) return 'local'
    return null
  }

  add(rawName: string, scope: GroupScope, rawDescription = ''): string | null {
    const name = normalizeGroupName(rawName)
    if (!name) return 'Use a group name that starts with a letter.'
    if (this.scopeOf(name)) return `Group ${name} already exists.`
    const description = normalizeDescription(rawDescription)
    if (scope === 'global') {
      this.global.push({ name, description })
      this.persist()
    } else {
      this.local.push({ name, description })
    }
    return null
  }

  remove(group: string): boolean {
    const name = normalizeGroupName(group)
    const scope = name ? this.scopeOf(name) : null
    if (!name || !scope) return false
    if (scope === 'global') {
      this.global = this.global.filter((record) => record.name !== name)
      this.persist()
    } else {
      this.local = this.local.filter((record) => record.name !== name)
    }
    return true
  }

  setScope(group: string, scope: GroupScope): string | null {
    const name = normalizeGroupName(group)
    const current = name ? this.scopeOf(name) : null
    if (!name || !current) return 'Create the group first.'
    if (current === scope) return null
    const description = this.descriptionOf(name)
    if (scope === 'global') {
      this.local = this.local.filter((record) => record.name !== name)
      this.global.push({ name, description })
    } else {
      this.global = this.global.filter((record) => record.name !== name)
      this.local.push({ name, description })
    }
    this.persist()
    return null
  }

  replaceLocal(records: readonly GroupRecord[]): void {
    const taken = new Set(this.global.map((record) => record.name))
    const seen = new Set<string>()
    const next: GroupRecord[] = []
    for (const record of records) {
      if (!isGroupRecord(record) || taken.has(record.name) || seen.has(record.name)) continue
      seen.add(record.name)
      next.push({ name: record.name, description: record.description })
    }
    this.local = next
  }

  /** Undo restores the project list exactly. */
  replaceGlobal(records: readonly GroupRecord[]): void {
    const seen = new Set<string>()
    const next: GroupRecord[] = []
    for (const record of records) {
      if (!isGroupRecord(record) || seen.has(record.name)) continue
      seen.add(record.name)
      next.push({ name: record.name, description: record.description })
    }
    const names = new Set(next.map((record) => record.name))
    this.local = this.local.filter((record) => !names.has(record.name))
    this.global = next
    this.persist()
  }

  /** Opening a scene adds global groups the file names and leaves the rest. */
  mergeGlobal(records: readonly GroupRecord[]): void {
    let changed = false
    for (const record of records) {
      if (!isGroupRecord(record) || this.scopeOf(record.name)) continue
      this.global.push({ name: record.name, description: record.description })
      changed = true
    }
    if (changed) this.persist()
  }

  private descriptionOf(name: string): string {
    return this.global.find((record) => record.name === name)?.description
      ?? this.local.find((record) => record.name === name)?.description
      ?? ''
  }

  private persist(): void {
    writeGlobalGroups(this.global)
  }
}
