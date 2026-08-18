'use client'

import { create } from 'zustand'
import type { Urgency } from '@/types'

interface UIStore {
  selectedNodeId: string | null
  isPanelOpen: boolean
  isCommandPaletteOpen: boolean
  currentPlaceId: string | null
  showDone: boolean
  activeUrgencyFilter: Urgency[]
  activeTagFilters: string[]
  titleFocusRequest: string | null
  selectNode: (id: string | null) => void
  openPanel: (id: string) => void
  closePanel: () => void
  toggleCommandPalette: (open?: boolean) => void
  enterPlace: (id: string) => void
  resetPlace: () => void
  setShowDone: (show: boolean) => void
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
  currentPlaceId: null,
  showDone: false,
  activeUrgencyFilter: [],
  activeTagFilters: [],
  titleFocusRequest: null,
  selectNode: (id) => set({ selectedNodeId: id }),
  openPanel: (id) => set({ selectedNodeId: id, isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
  toggleCommandPalette: (open) =>
    set((state) => ({ isCommandPaletteOpen: typeof open === 'boolean' ? open : !state.isCommandPaletteOpen })),
  enterPlace: (id) =>
    set((state) => ({
      currentPlaceId: id,
      selectedNodeId: state.currentPlaceId === id ? state.selectedNodeId : null,
      isPanelOpen: state.currentPlaceId === id ? state.isPanelOpen : false,
    })),
  resetPlace: () => set({ currentPlaceId: null, showDone: false, selectedNodeId: null, isPanelOpen: false }),
  setShowDone: (showDone) => set({ showDone }),
  setUrgencyFilter: (urgencies) => set({ activeUrgencyFilter: urgencies }),
  setTagFilter: (tags) => set({ activeTagFilters: tags }),
  clearFilters: () => set({ activeUrgencyFilter: [], activeTagFilters: [] }),
  requestTitleFocus: (id) => set({ titleFocusRequest: id, selectedNodeId: id, isPanelOpen: true }),
  clearTitleFocusRequest: () => set({ titleFocusRequest: null }),
}))
