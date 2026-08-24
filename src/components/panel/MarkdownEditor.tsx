'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { EditorToolbar } from '@/components/panel/EditorToolbar'
import { parseChecklistProgress, type ChecklistProgress } from '@/lib/editor/checklistProgress'
import { editorExtensions } from '@/lib/editor/extensions'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { defaultEditorContent } from '@/lib/utils'
import type { UpdateNodePayload } from '@/types'

interface MarkdownEditorProps {
  nodeId: string
  initialContent: string
  initialCompleted: boolean
  onChecklistProgressChange?: (progress: ChecklistProgress) => void
}

function parseContent(content: string) {
  try {
    return content ? JSON.parse(content) : JSON.parse(defaultEditorContent())
  } catch {
    return JSON.parse(defaultEditorContent())
  }
}

export function MarkdownEditor({
  nodeId,
  initialContent,
  initialCompleted,
  onChecklistProgressChange,
}: MarkdownEditorProps) {
  const updateNode = useNodeStore((state) => state.updateNode)
  const debounceRef = useRef<number | null>(null)
  const pendingContentRef = useRef<string | null>(null)
  const pendingChecklistProgressRef = useRef<ChecklistProgress | null>(null)
  const completedRef = useRef(initialCompleted)
  const hydratedNodeIdRef = useRef<string | null>(null)
  const parsedContent = useMemo(() => parseContent(initialContent), [initialContent])

  const flushPendingUpdate = useCallback(async (targetNodeId: string) => {
    const content = pendingContentRef.current
    const progress = pendingChecklistProgressRef.current

    pendingContentRef.current = null
    pendingChecklistProgressRef.current = null

    if (!content) return

    const patch: UpdateNodePayload = { description: content }
    const currentCompleted = completedRef.current
    const checklistProgress = progress ?? parseChecklistProgress(content)

    if (checklistProgress.total > 0) {
      const nextCompleted = checklistProgress.completed === checklistProgress.total
      if (nextCompleted !== currentCompleted) {
        patch.completed = nextCompleted
      }
    }

    try {
      await updateNode(targetNodeId, patch)
      if (typeof patch.completed === 'boolean') {
        completedRef.current = patch.completed
      }
    } catch {
      completedRef.current = currentCompleted
    }
  }, [updateNode])

  const editor = useEditor({
    extensions: editorExtensions,
    content: parsedContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'tiptap',
      },
    },
    onUpdate({ editor: activeEditor }) {
      const content = JSON.stringify(activeEditor.getJSON())
      const progress = parseChecklistProgress(content)

      pendingContentRef.current = content
      pendingChecklistProgressRef.current = progress
      onChecklistProgressChange?.(progress)

      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      debounceRef.current = window.setTimeout(() => {
        void flushPendingUpdate(nodeId)
      }, 800)
    },
  })

  useEffect(() => {
    completedRef.current = initialCompleted
  }, [initialCompleted, nodeId])

  useEffect(() => {
    onChecklistProgressChange?.(parseChecklistProgress(initialContent))
  }, [initialContent, onChecklistProgressChange])

  useEffect(() => {
    if (!editor) return

    const serializedContent = JSON.stringify(editor.getJSON())
    const shouldResetForNodeChange = hydratedNodeIdRef.current !== nodeId
    const shouldApplyExternalUpdate =
      !shouldResetForNodeChange && !editor.isFocused && pendingContentRef.current === null && serializedContent !== initialContent

    if (!shouldResetForNodeChange && !shouldApplyExternalUpdate) return

    editor.commands.setContent(parsedContent, false)
    hydratedNodeIdRef.current = nodeId
  }, [editor, initialContent, nodeId, parsedContent])

  useEffect(
    () => () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
        debounceRef.current = null
      }

      void flushPendingUpdate(nodeId)
    },
    [flushPendingUpdate, nodeId],
  )

  return (
    <div className="tiptap-wrapper space-y-3">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
