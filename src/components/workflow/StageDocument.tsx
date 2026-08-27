'use client'

import { useEffect, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { editorExtensions } from '@/lib/editor/extensions'

interface StageDocumentProps {
  html: string
  editable: boolean
  onChange: (html: string) => void
}

export function StageDocument({ html, editable, onChange }: StageDocumentProps) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const lastEmittedRef = useRef(html || '<p></p>')
  const pendingRef = useRef<string | null>(null)

  const editor = useEditor({
    extensions: editorExtensions,
    content: html || '<p></p>',
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor: instance }) => {
      const next = instance.getHTML()
      lastEmittedRef.current = next
      pendingRef.current = next
      onChangeRef.current(next)
    },
  })

  useEffect(() => {
    if (!editor) return
    editor.setEditable(editable)
  }, [editable, editor])

  useEffect(() => {
    if (!editor) return
    const next = html || '<p></p>'
    if (next === lastEmittedRef.current) return
    if (editor.isFocused && pendingRef.current !== null) return
    if (editor.getHTML() === next) {
      lastEmittedRef.current = next
      return
    }
    editor.commands.setContent(next, false)
    lastEmittedRef.current = next
    pendingRef.current = null
  }, [editor, html])

  return (
    <div
      data-testid="stage-document"
      className="min-h-[24rem] rounded-[1.2rem] border border-white/80 bg-white/90 p-4 shadow-inner"
    >
      <EditorContent editor={editor} className="prose prose-sm max-w-none focus:outline-none" />
      {!editable && <p className="mt-3 text-xs text-muted-foreground">Read-only — switch to the current stage to edit.</p>}
    </div>
  )
}
