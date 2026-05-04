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
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      debounceRef.current = window.setTimeout(() => {
        updateNode(nodeId, { description: JSON.stringify(activeEditor.getJSON()) }).catch(() => undefined)
      }, 800)
    },
  })

  useEffect(() => {
    if (!editor) return
    editor.commands.setContent(parsedContent, false)
  }, [editor, nodeId, parsedContent])

  useEffect(
    () => () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    },
    [],
  )

  return (
    <div className="tiptap-wrapper">
      <EditorContent editor={editor} />
    </div>
  )
}
