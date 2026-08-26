'use client'

import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { ProjectCard } from '@/components/portfolio/ProjectCard'
import { Button } from '@/components/ui/button'
import { ForgottenCard } from '@/components/place/ForgottenCard'
import { LensPicker } from '@/components/place/LensPicker'
import { pickForgotten } from '@/lib/place/placeModel'
import { groupByDomain, pickAttentionModule, portfolioStatusSections, projectStageIndicator } from '@/lib/portfolio/portfolioModel'
import { useNodeStore } from '@/lib/store/useNodeStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useToast } from '@/components/ui/use-toast'
import type { NodeRecord } from '@/types'

function forgottenPathLabel(nodes: NodeRecord[], forgottenId: string, rootId: string | null): string | null {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const forgotten = byId.get(forgottenId)
  if (!forgotten?.parent_id || forgotten.parent_id === rootId) return null
  const parts: string[] = []
  let currentId: string | null = forgotten.parent_id
  while (currentId && currentId !== rootId) {
    const parent = byId.get(currentId)
    if (!parent) break
    if (parent.parent_id !== null) parts.unshift(parent.title)
    currentId = parent.parent_id
  }
  return parts.length > 0 ? parts.join(' › ') : null
}

interface PortfolioDashboardProps {
  onCreateDomain: () => void
  onCreateProject: () => void
}

export function PortfolioDashboard({ onCreateDomain, onCreateProject }: PortfolioDashboardProps) {
  const { toast } = useToast()
  const nodes = useNodeStore((state) => state.nodes)
  const reparentNode = useNodeStore((state) => state.reparentNode)
  const enterPlace = useUIStore((state) => state.enterPlace)
  const openPanel = useUIStore((state) => state.openPanel)
  const markVisited = useNodeStore((state) => state.markVisited)
  const filingNodeId = useUIStore((state) => state.filingNodeId)
  const cancelFilingNode = useUIStore((state) => state.cancelFilingNode)
  const activeLensId = useUIStore((state) => state.activeLensId)
  const setActiveLensId = useUIStore((state) => state.setActiveLensId)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const sections = useMemo(() => portfolioStatusSections(nodes), [nodes])
  const now = useMemo(() => new Date(), [])
  const root = nodes.find((node) => node.parent_id === null) ?? null
  const forgotten = root ? pickForgotten(nodes, root.id, now, new Set()) : null
  const forgottenStaleDays = forgotten
    ? forgotten.last_visited_at === null
      ? -1
      : Math.max(0, Math.floor((now.getTime() - Date.parse(forgotten.last_visited_at)) / 86_400_000))
    : null
  const forgottenPath = forgotten
    ? forgottenPathLabel(nodes, forgotten.id, root?.id ?? null)
    : null

  async function openProject(projectId: string) {
    if (filingNodeId) {
      try {
        await reparentNode(filingNodeId, projectId)
        cancelFilingNode()
      } catch (error) {
        toast({
          title: 'Tasks unlock in Execute',
          description:
            error instanceof Error
              ? error.message
              : 'Choose a leaf project or module in Execute, or use emergency skip from its workflow screen.',
        })
      }
      return
    }
    enterPlace(projectId)
  }

  const hasProjects = sections.some((section) => section.projects.length > 0)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8" data-testid="portfolio-dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Steward</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Life PM</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={onCreateDomain}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add domain
          </Button>
          <Button type="button" onClick={onCreateProject}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add project
          </Button>
        </div>
      </div>

      <LensPicker activeLensId={activeLensId} onToggle={setActiveLensId} />

      <ForgottenCard
        node={forgotten}
        staleDays={forgottenStaleDays}
        pathLabel={forgottenPath}
        onOpen={() => {
          if (!forgotten) return
          markVisited(forgotten.id).catch(() => undefined)
          if (forgotten.kind === 'project' || !forgotten.parent_id) {
            enterPlace(forgotten.id)
            return
          }
          enterPlace(forgotten.parent_id)
          window.requestAnimationFrame(() => openPanel(forgotten.id))
        }}
      />

      {!hasProjects && (
        <div className="rounded-[1.7rem] border border-white/75 bg-white/86 px-6 py-10 text-center shadow-[0_28px_90px_-50px_rgba(15,23,42,0.8)]">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Add a domain or project</p>
        </div>
      )}

      {sections.map((section) => {
        if (section.projects.length === 0) return null
        const open = expanded[section.id] ?? !section.collapsed
        const groups = groupByDomain(nodes, section.projects)
        return (
          <section key={section.id} className="space-y-4">
            <button
              type="button"
              className="flex items-center gap-2 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500"
              onClick={() => setExpanded((current) => ({ ...current, [section.id]: !open }))}
            >
              {section.label}
              <span className="text-slate-400">{section.projects.length}</span>
            </button>
            {open &&
              groups.map((group) => (
                <div key={group.label} className="space-y-3">
                  <h2 className="text-sm font-medium text-slate-600">{group.label}</h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {group.projects.map((project) => {
                      const attention = pickAttentionModule(nodes, project.id, now)
                      const stageIndicator = projectStageIndicator(nodes, project.id)
                      return (
                        <ProjectCard
                          key={project.id}
                          title={project.title}
                          status={project.pm_status}
                          health={project.health}
                          outcome={project.outcome}
                          stageLabel={stageIndicator?.stage ?? null}
                          stageLight={stageIndicator?.light ?? null}
                          attentionTitle={attention?.title ?? null}
                          breakGlass={Boolean(
                            project.break_glass?.used ||
                              nodes.some((node) => node.break_glass?.used && node.parent_id === project.id) ||
                              attention?.break_glass?.used,
                          )}
                          onClick={() => void openProject(project.id)}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
          </section>
        )
      })}
    </div>
  )
}
