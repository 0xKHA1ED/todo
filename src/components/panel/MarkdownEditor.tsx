'use client'

import { useEffect, useMemo, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { editorExtensions } from '@/lib/editor/extensions'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { defaultEditorContent } from '@/lib/utils'

interface MarkdownEditorProps {
  nodeId: string
  initialContent: string
}

function parseContent(content: string) {
  try {
    return content ? JSON.parse(content) : JSON.parse(defaultEditorContent())
  } catch {
    return JSON.parse(defaultEditorContent())
  }
}

export function MarkdownEditor({ nodeId, initialContent }: MarkdownEditorProps) {
  const updateNode = useNodeStore((state) => state.updateNode)
  const debounceRef = useRef<number | null>(null)
  const pendingContentRef = useRef<string | null>(null)
  const hydratedNodeIdRef = useRef<string | null>(null)
  const parsedContent = useMemo(() => parseContent(initialContent), [initialContent])

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
      pendingContentRef.current = JSON.stringify(activeEditor.getJSON())
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      debounceRef.current = window.setTimeout(() => {
        const content = pendingContentRef.current
        pendingContentRef.current = null
        if (!content) return
        updateNode(nodeId, { description: content }).catch(() => undefined)
      }, 800)
    },
  })

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

      const content = pendingContentRef.current
      pendingContentRef.current = null
      if (content) {
        updateNode(nodeId, { description: content }).catch(() => undefined)
      }
    },
    [nodeId, updateNode],
  )

  return (
    <div className="tiptap-wrapper">
      <EditorContent editor={editor} />
    </div>
  )
}
