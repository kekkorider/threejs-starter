import { cp, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

const src = join(rootDir, 'node_modules', 'three', 'examples', 'jsm', 'libs', 'draco')
const dest = join(rootDir, 'public', 'draco')

// Ensure the destination directory exists
await mkdir(dest, { recursive: true })

// Copy all files recursively
await cp(src, dest, { recursive: true })

console.log(`✅ Draco files copied from ${src} to ${dest}`)
