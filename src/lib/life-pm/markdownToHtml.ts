const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inline(text: string): string {
  const escaped = escapeHtml(text)
  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)
}

function parseTable(lines: string[]): string {
  const rows = lines.map((line) =>
    line
      .replace(/^\s*\|/, '')
      .replace(/\|\s*$/, '')
      .split('|')
      .map((cell) => cell.trim()),
  )
  if (rows.length < 2) return `<p>${inline(lines.join(' '))}</p>`
  const header = rows[0]
  const body = rows.slice(2)
  const thead = `<thead><tr>${header.map((cell) => `<th>${inline(cell)}</th>`).join('')}</tr></thead>`
  const tbody = `<tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody>`
  return `<table>${thead}${tbody}</table>`
}

export function markdownToHtml(markdown: string): string {
  const trimmed = markdown.trim()
  if (!trimmed || trimmed === '-' || /^\(none/i.test(trimmed)) return '<p></p>'

  const lines = trimmed.split('\n')
  const blocks: string[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index] ?? ''
    if (!line.trim()) {
      index += 1
      continue
    }

    if (line.trimStart().startsWith('>')) {
      const quote: string[] = []
      while (index < lines.length && (lines[index] ?? '').trimStart().startsWith('>')) {
        quote.push((lines[index] ?? '').replace(/^\s*>\s?/, ''))
        index += 1
      }
      blocks.push(`<blockquote>${markdownToHtml(quote.join('\n'))}</blockquote>`)
      continue
    }

    if (/^\s*\|.+\|/.test(line) && index + 1 < lines.length && isTableSeparator(lines[index + 1] ?? '')) {
      const tableLines = [line, lines[index + 1] ?? '']
      index += 2
      while (index < lines.length && /^\s*\|/.test(lines[index] ?? '')) {
        tableLines.push(lines[index] ?? '')
        index += 1
      }
      blocks.push(parseTable(tableLines))
      continue
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index] ?? '')) {
        items.push((lines[index] ?? '').replace(/^\s*[-*]\s+/, ''))
        index += 1
      }
      blocks.push(`<ul>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`)
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index] ?? '')) {
        items.push((lines[index] ?? '').replace(/^\s*\d+\.\s+/, ''))
        index += 1
      }
      blocks.push(`<ol>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</ol>`)
      continue
    }

    const paragraph: string[] = []
    while (index < lines.length) {
      const current = lines[index] ?? ''
      if (!current.trim()) break
      if (current.trimStart().startsWith('>')) break
      if (/^\s*[-*]\s+/.test(current) || /^\s*\d+\.\s+/.test(current)) break
      if (/^\s*\|/.test(current)) break
      paragraph.push(current)
      index += 1
    }
    blocks.push(`<p>${inline(paragraph.join(' '))}</p>`)
  }

  return blocks.join('') || '<p></p>'
}

export function sectionsToHtml(sections: Record<string, string>, order: string[]): string {
  return order
    .filter((title) => title in sections)
    .map((title) => `<h2>${escapeHtml(title)}</h2>${markdownToHtml(sections[title] ?? '')}`)
    .join('')
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}
