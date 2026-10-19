const KEYWORDS = new Set([
  'abstract', 'as', 'asserts', 'async', 'await', 'break', 'case', 'catch', 'class', 'const',
  'continue', 'debugger', 'declare', 'default', 'delete', 'do', 'else', 'enum', 'export',
  'extends', 'finally', 'for', 'from', 'function', 'get', 'if', 'implements', 'import', 'in',
  'infer', 'instanceof', 'interface', 'is', 'keyof', 'let', 'module', 'namespace', 'new', 'of',
  'override', 'private', 'protected', 'public', 'readonly', 'return', 'satisfies', 'set',
  'static', 'super', 'switch', 'this', 'throw', 'try', 'type', 'typeof', 'var', 'while',
  'with', 'yield', 'constructor',
])

const TYPES = new Set([
  'any', 'bigint', 'boolean', 'never', 'number', 'object', 'string', 'symbol', 'unknown', 'void',
])

const LITERALS = new Set(['true', 'false', 'null', 'undefined'])

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function wordClass(word: string, previous: string, rest: string): string {
  if (KEYWORDS.has(word)) return 'tok-k'
  if (LITERALS.has(word)) return 'tok-n'
  if (TYPES.has(word) || /^[A-Z]/.test(word)) return 'tok-t'
  if (/^\s*\(/.test(rest)) return 'tok-f'
  if (previous === '.') return 'tok-m'
  return ''
}

/** Token colors for component TypeScript. Comments, strings, and keywords stay intact. */
export function highlightTypeScript(source: string): string {
  let html = ''
  let index = 0

  while (index < source.length) {
    const char = source[index]!

    if (char === '/' && source[index + 1] === '/') {
      const end = source.indexOf('\n', index)
      const stop = end === -1 ? source.length : end
      html += `<span class="tok-c">${escapeHtml(source.slice(index, stop))}</span>`
      index = stop
      continue
    }

    if (char === '/' && source[index + 1] === '*') {
      const end = source.indexOf('*/', index + 2)
      const stop = end === -1 ? source.length : end + 2
      html += `<span class="tok-c">${escapeHtml(source.slice(index, stop))}</span>`
      index = stop
      continue
    }

    if (char === '"' || char === "'" || char === '`') {
      let end = index + 1
      while (end < source.length) {
        if (source[end] === '\\') {
          end += 2
          continue
        }
        if (source[end] === char) {
          end += 1
          break
        }
        if (char !== '`' && source[end] === '\n') break
        end += 1
      }
      html += `<span class="tok-s">${escapeHtml(source.slice(index, end))}</span>`
      index = end
      continue
    }

    if (/[A-Za-z_$]/.test(char)) {
      const match = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(source.slice(index))
      const word = match?.[0] ?? char
      const previous = index > 0 ? source[index - 1]! : ''
      const token = wordClass(word, previous, source.slice(index + word.length))
      html += token ? `<span class="${token}">${word}</span>` : escapeHtml(word)
      index += word.length
      continue
    }

    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(source[index + 1] ?? ''))) {
      const match = /^(?:0[xX][0-9a-fA-F]+|\d+\.?\d*|\.\d+)/.exec(source.slice(index))
      const word = match?.[0] ?? char
      html += `<span class="tok-n">${word}</span>`
      index += word.length
      continue
    }

    html += escapeHtml(char)
    index += 1
  }

  return html
}
