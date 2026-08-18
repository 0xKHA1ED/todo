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
  const currentPlaceId = useUIStore((state) => state.currentPlaceId)
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

      if (event.key === 'Escape') {
        closePanel()
        useUIStore.getState().selectNode(null)
        return
      }

      if (shouldIgnoreShortcut(event)) return

      const selected = nodes.find((node) => node.id === selectedNodeId)
      const enterPlace = useUIStore.getState().enterPlace
      const openPanel = useUIStore.getState().openPanel

      try {
        if (event.key === 'Tab') {
          event.preventDefault()
          if (!selected || selected.parent_id === null) return
          const child = await createNode({ parent_id: selected.id, title: 'New Task' })
          enterPlace(selected.id)
          requestTitleFocus(child.id)
          return
        }

        if (event.key === 'Enter') {
          event.preventDefault()
          if (!selected) return
          const isArea = nodes.some((node) => node.parent_id === selected.id)
          if (isArea) enterPlace(selected.id)
          else openPanel(selected.id)
          return
        }

        if (!selected) return

        if (event.key === 'Delete' && selected.parent_id !== null) {
          event.preventDefault()
          if (window.confirm(`Delete "${selected.title}" and all of its children?`)) {
            const parentId = selected.parent_id
            const standing = useUIStore.getState().currentPlaceId
            await deleteNode(selected.id)
            closePanel()
            if (standing === selected.id) enterPlace(parentId)
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
  }, [
    closePanel,
    createNode,
    currentPlaceId,
    deleteNode,
    nodes,
    requestTitleFocus,
    selectedNodeId,
    toast,
    toggleCommandPalette,
  ])
}
