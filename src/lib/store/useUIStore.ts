'use client'

import { create } from 'zustand'
import type { Urgency } from '@/types'

interface UIStore {
  selectedNodeId: string | null
  isPanelOpen: boolean
  isCommandPaletteOpen: boolean
  focusedNodeId: string | null
  activeUrgencyFilter: Urgency[]
  activeTagFilters: string[]
  titleFocusRequest: string | null
  selectNode: (id: string | null) => void
  openPanel: (id: string) => void
  closePanel: () => void
  toggleCommandPalette: (open?: boolean) => void
  enterFocusMode: (id: string) => void
  exitFocusMode: () => void
  setUrgencyFilter: (urgencies: Urgency[]) => void
  setTagFilter: (tags: string[]) => void
  clearFilters: () => void
  requestTitleFocus: (id: string) => void
  clearTitleFocusRequest: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  selectedNodeId: null,
  isPanelOpen: false,
  isCommandPaletteOpen: false,
  focusedNodeId: null,
  activeUrgencyFilter: [],
  activeTagFilters: [],
  titleFocusRequest: null,
  selectNode: (id) => set({ selectedNodeId: id }),
  openPanel: (id) => set({ selectedNodeId: id, isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
  toggleCommandPalette: (open) =>
    set((state) => ({ isCommandPaletteOpen: typeof open === 'boolean' ? open : !state.isCommandPaletteOpen })),
  enterFocusMode: (id) => set({ focusedNodeId: id, selectedNodeId: id }),
  exitFocusMode: () => set({ focusedNodeId: null }),
  setUrgencyFilter: (urgencies) => set({ activeUrgencyFilter: urgencies }),
  setTagFilter: (tags) => set({ activeTagFilters: tags }),
  clearFilters: () => set({ activeUrgencyFilter: [], activeTagFilters: [] }),
  requestTitleFocus: (id) => set({ titleFocusRequest: id, selectedNodeId: id, isPanelOpen: true }),
  clearTitleFocusRequest: () => set({ titleFocusRequest: null }),
}))
