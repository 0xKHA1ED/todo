'use client'

import { Button } from '@/components/ui/button'
import { canSignOff, canSkipReview, nextStage } from '@/lib/life-pm/workflowModel'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useToast } from '@/components/ui/use-toast'
import type { NodeRecord, WorkflowStage } from '@/types'

const LABEL: Record<WorkflowStage, string> = {
  problem: 'Sign off Problem →',
  shape: 'Ready for Plan →',
  plan: 'Ready for Spec →',
  spec: 'Ready for Execute →',
  execute: 'Ready for Review →',
  review: 'Close',
}

interface SignOffButtonProps {
  node: NodeRecord
  onBeforeSignOff?: () => Promise<void> | void
}

export function SignOffButton({ node, onBeforeSignOff }: SignOffButtonProps) {
  const { toast } = useToast()
  const nodes = useNodeStore((state) => state.nodes)
  const signOffStage = useNodeStore((state) => state.signOffStage)
  const skipReview = useNodeStore((state) => state.skipReview)
  const stage = node.workflow_stage
  if (!stage) return null

  const ready = canSignOff(node, nodes)
  const next = nextStage(stage)

  async function handleSignOff() {
    try {
      await onBeforeSignOff?.()
      await signOffStage(node.id)
    } catch (error) {
      toast({
        title: 'Cannot sign off yet',
        description: error instanceof Error ? error.message : 'Finish the stage checklist first.',
        variant: 'destructive',
      })
    }
  }

  async function handleSkip() {
    try {
      await onBeforeSignOff?.()
      await skipReview(node.id)
    } catch (error) {
      toast({
        title: 'Could not skip review',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {stage === 'execute' && canSkipReview(node) && (
        <Button type="button" variant="ghost" disabled={!ready} onClick={() => void handleSkip()}>
          Skip review
        </Button>
      )}
      <Button type="button" data-testid="sign-off" disabled={!ready} onClick={() => void handleSignOff()}>
        {LABEL[stage]}
      </Button>
      {!ready && (
        <p className="w-full text-right text-xs text-muted-foreground">
          {stage === 'execute'
            ? 'Complete all work items before review.'
            : next
              ? `Complete this stage to unlock ${next}.`
              : 'Finish the remaining checklist items.'}
        </p>
      )}
    </div>
  )
}
