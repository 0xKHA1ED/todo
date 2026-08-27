import { filingClickAction } from '@/lib/life-pm/workflowModel'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'

export async function activatePlace(targetId: string): Promise<{ blocked?: { title: string; description: string } }> {
  const nodes = useNodeStore.getState().nodes
  const filingNodeId = useUIStore.getState().filingNodeId
  if (!filingNodeId) {
    useUIStore.getState().enterPlace(targetId)
    return {}
  }

  const action = filingClickAction(nodes, targetId)
  if (action === 'enter') {
    useUIStore.getState().enterPlace(targetId)
    return {}
  }
  if (action === 'file') {
    await useNodeStore.getState().reparentNode(filingNodeId, targetId)
    useUIStore.getState().cancelFilingNode()
    return {}
  }

  return {
    blocked: {
      title: 'Tasks unlock in Execute',
      description: 'Open this work, finish the earlier stages (or emergency skip), then use File here.',
    },
  }
}
