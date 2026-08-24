import { wrappingInputRule } from '@tiptap/core'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import StarterKit from '@tiptap/starter-kit'
import { createLowlight } from 'lowlight'

const lowlight = createLowlight()

const markdownTaskListInputRegex = /^\s*-\s+\[([ xX])?\]\s$/

const MarkdownFriendlyTaskItem = TaskItem.extend({
  addInputRules() {
    return [
      ...(this.parent?.() ?? []),
      wrappingInputRule({
        find: markdownTaskListInputRegex,
        type: this.type,
        getAttributes: (match) => ({
          checked: typeof match[1] === 'string' && match[1].trim().toLowerCase() === 'x',
        }),
      }),
    ]
  },
})

export const editorExtensions = [
  StarterKit.configure({ codeBlock: false }),
  CodeBlockLowlight.configure({ lowlight }),
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
  TaskList,
  MarkdownFriendlyTaskItem.configure({ nested: true }),
  Link.configure({ openOnClick: false, autolink: true }),
  Image,
  Placeholder.configure({ placeholder: 'Add a description...' }),
]
