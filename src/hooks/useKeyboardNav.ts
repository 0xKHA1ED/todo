'use client'

import { useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'

function shouldIgnoreShortcut(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (!target) return false
  const tagName = target.tagName.toLowerCase()
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    target.isContentEditable ||
    Boolean(target.closest('.tiptap')) ||
    Boolean(target.closest('[cmdk-input-wrapper]'))
  )
}

export function useKeyboardNav() {
  const { toast } = useToast()
  const selectedNodeId = useUIStore((state) => state.selectedNodeId)
  const closePanel = useUIStore((state) => state.closePanel)
  const toggleCommandPalette = useUIStore((state) => state.toggleCommandPalette)
  const requestTitleFocus = useUIStore((state) => state.requestTitleFocus)
  const nodes = useNodeStore((state) => state.nodes)
  const createNode = useNodeStore((state) => state.createNode)
  const deleteNode = useNodeStore((state) => state.deleteNode)

  useEffect(() => {
    async function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        toggleCommandPalette()
        return
      }

      if (shouldIgnoreShortcut(event)) return

      const selected = nodes.find((node) => node.id === selectedNodeId)

      if (event.key === 'Escape') {
        closePanel()
        useUIStore.getState().selectNode(null)
        return
      }

      if (!selected) return

      try {
        if (event.key === 'Tab') {
          event.preventDefault()
          const child = await createNode({ parent_id: selected.id, title: 'New Task' })
          requestTitleFocus(child.id)
        }

        if (event.key === 'Enter') {
          event.preventDefault()
          const parentId = selected.parent_id ?? selected.id
          const sibling = await createNode({ parent_id: parentId, title: 'New Task' })
          requestTitleFocus(sibling.id)
        }

        if ((event.key === 'Delete' || event.key === 'Backspace') && selected.parent_id !== null) {
          event.preventDefault()
          if (window.confirm(`Delete "${selected.title}" and all of its children?`)) {
            await deleteNode(selected.id)
            closePanel()
          }
        }

        if (event.key === 'F2') {
          event.preventDefault()
          requestTitleFocus(selected.id)
        }
      } catch (error) {
        toast({
          title: 'Shortcut failed',
          description: error instanceof Error ? error.message : 'The requested action could not be completed.',
          variant: 'destructive',
        })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closePanel, createNode, deleteNode, nodes, requestTitleFocus, selectedNodeId, toast, toggleCommandPalette])
}
