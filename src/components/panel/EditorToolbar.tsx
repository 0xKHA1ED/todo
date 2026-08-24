'use client'

import type { MouseEvent } from 'react'
import type { Editor } from '@tiptap/react'
import { ListTodo } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EditorToolbarProps {
  editor: Editor | null
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const checklistActive = editor?.isActive('taskList') ?? false

  function handleChecklistMouseDown(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-white/70 px-3 py-2 shadow-sm backdrop-blur-sm">
      <Button
        type="button"
        size="sm"
        variant={checklistActive ? 'default' : 'secondary'}
        aria-pressed={checklistActive}
        disabled={!editor}
        onMouseDown={handleChecklistMouseDown}
        onClick={() => editor?.chain().focus().toggleTaskList().run()}
      >
        <ListTodo className="mr-2 h-4 w-4" />
        Checklist
      </Button>
      <p className="text-xs text-muted-foreground">Mod+Shift+9</p>
    </div>
  )
}