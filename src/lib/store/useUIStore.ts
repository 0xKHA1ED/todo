'use client'

import { create } from 'zustand'
import { isViewModeAllowed, resolveViewMode } from '@/lib/life-pm/workflowModel'
import type { ViewMode } from '@/lib/life-pm/types'
import { useNodeStore } from '@/lib/store/useNodeStore'

export const LIFE_PM_UI_KEY = 'life-pm:ui'

function readPersisted(): { currentPlaceId: string | null; viewMode: ViewMode } {
  if (typeof window === 'undefined') return { currentPlaceId: null, viewMode: 'portfolio' }
  try {
    const raw = window.localStorage.getItem(LIFE_PM_UI_KEY)
    if (!raw) return { currentPlaceId: null, viewMode: 'portfolio' }
    const parsed = JSON.parse(raw) as { currentPlaceId?: string | null; viewMode?: ViewMode }
    return {
      currentPlaceId: parsed.currentPlaceId ?? null,
      viewMode: parsed.viewMode ?? 'portfolio',
    }
  } catch {
    return { currentPlaceId: null, viewMode: 'portfolio' }
  }
}

function persist(currentPlaceId: string | null, viewMode: ViewMode) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LIFE_PM_UI_KEY, JSON.stringify({ currentPlaceId, viewMode }))
}

const persisted = readPersisted()

interface UIStore {
  selectedNodeId: string | null
  isPanelOpen: boolean
  isCommandPaletteOpen: boolean
  isQuickCaptureOpen: boolean
  isInboxOpen: boolean
  filingNodeId: string | null
  activeLensId: string | null
  currentPlaceId: string | null
  viewMode: ViewMode
  showDone: boolean
  titleFocusRequest: string | null
  selectNode: (id: string | null) => void
  openPanel: (id: string) => void
  closePanel: () => void
  toggleCommandPalette: (open?: boolean) => void
  setQuickCaptureOpen: (open: boolean) => void
  setInboxOpen: (open: boolean) => void
  startFilingNode: (id: string) => void
  cancelFilingNode: () => void
  setActiveLensId: (id: string | null) => void
  enterPlace: (id: string) => void
  setViewMode: (viewMode: ViewMode) => void
  syncViewMode: () => void
  resetPlace: () => void
  setShowDone: (show: boolean) => void
  requestTitleFocus: (id: string) => void
  clearTitleFocusRequest: () => void
}

export const useUIStore = create<UIStore>((set, get) => ({
  selectedNodeId: null,
  isPanelOpen: false,
  isCommandPaletteOpen: false,
  isQuickCaptureOpen: false,
  isInboxOpen: false,
  filingNodeId: null,
  activeLensId: null,
  currentPlaceId: persisted.currentPlaceId,
  viewMode: persisted.viewMode,
  showDone: false,
  titleFocusRequest: null,
  selectNode: (id) => set({ selectedNodeId: id }),
  openPanel: (id) => set({ selectedNodeId: id, isPanelOpen: true, filingNodeId: null }),
  closePanel: () => set({ isPanelOpen: false }),
  toggleCommandPalette: (open) =>
    set((state) => ({
      isCommandPaletteOpen: typeof open === 'boolean' ? open : !state.isCommandPaletteOpen,
    })),
  setQuickCaptureOpen: (open) => set({ isQuickCaptureOpen: open, filingNodeId: null }),
  setInboxOpen: (open) => set({ isInboxOpen: open }),
  startFilingNode: (id) => set({ filingNodeId: id, isPanelOpen: false, isInboxOpen: false }),
  cancelFilingNode: () => set({ filingNodeId: null }),
  setActiveLensId: (activeLensId) => set({ activeLensId }),
  enterPlace: (id) => {
    const nodes = useNodeStore.getState().nodes
    const node = nodes.find((candidate) => candidate.id === id) ?? null
    const state = get()
    const same = state.currentPlaceId === id
    const viewMode = same && isViewModeAllowed(state.viewMode, node, nodes) ? state.viewMode : resolveViewMode(node, nodes)
    persist(id, viewMode)
    set({
      currentPlaceId: id,
      viewMode,
      selectedNodeId: same ? state.selectedNodeId : null,
      isPanelOpen: same ? state.isPanelOpen : false,
      activeLensId: same ? state.activeLensId : null,
    })
  },
  setViewMode: (viewMode) => {
    persist(get().currentPlaceId, viewMode)
    set({ viewMode })
  },
  syncViewMode: () => {
    const { currentPlaceId, viewMode } = get()
    if (!currentPlaceId) return
    const nodes = useNodeStore.getState().nodes
    const node = nodes.find((candidate) => candidate.id === currentPlaceId) ?? null
    if (isViewModeAllowed(viewMode, node, nodes)) return
    const next = resolveViewMode(node, nodes)
    persist(currentPlaceId, next)
    set({ viewMode: next })
  },
  resetPlace: () => {
    persist(null, 'portfolio')
    set({
      currentPlaceId: null,
      viewMode: 'portfolio',
      showDone: false,
      selectedNodeId: null,
      isPanelOpen: false,
      isQuickCaptureOpen: false,
      isInboxOpen: false,
      filingNodeId: null,
      activeLensId: null,
    })
  },
  setShowDone: (showDone) => set({ showDone }),
  requestTitleFocus: (id) => set({ titleFocusRequest: id, selectedNodeId: id, isPanelOpen: true, filingNodeId: null }),
  clearTitleFocusRequest: () => set({ titleFocusRequest: null }),
}))
