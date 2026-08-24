export type ChecklistProgress = {
  total: number
  completed: number
}

type TipTapNode = {
  type?: string
  attrs?: {
    checked?: boolean
  }
  content?: TipTapNode[]
}

export function countChecklistItems(documentNode: unknown): ChecklistProgress {
  let total = 0
  let completed = 0

  function walk(node: TipTapNode | undefined) {
    if (!node || typeof node !== 'object') return

    if (node.type === 'taskItem') {
      total += 1
      if (node.attrs?.checked) {
        completed += 1
      }
    }

    for (const child of node.content ?? []) {
      walk(child)
    }
  }

  walk(documentNode as TipTapNode)

  return { total, completed }
}

export function parseChecklistProgress(description: string | null | undefined): ChecklistProgress {
  if (!description) {
    return { total: 0, completed: 0 }
  }

  let documentNode: TipTapNode
  try {
    documentNode = JSON.parse(description) as TipTapNode
  } catch {
    return { total: 0, completed: 0 }
  }

  return countChecklistItems(documentNode)
}