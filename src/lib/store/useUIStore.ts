'use client'

import { create } from 'zustand'

interface UIStore {
  selectedNodeId: string | null
  isPanelOpen: boolean
  isCommandPaletteOpen: boolean
  currentPlaceId: string | null
  showDone: boolean
  titleFocusRequest: string | null
  selectNode: (id: string | null) => void
  openPanel: (id: string) => void
  closePanel: () => void
  toggleCommandPalette: (open?: boolean) => void
  enterPlace: (id: string) => void
  resetPlace: () => void
  setShowDone: (show: boolean) => void
  requestTitleFocus: (id: string) => void
  clearTitleFocusRequest: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  selectedNodeId: null,
  isPanelOpen: false,
  isCommandPaletteOpen: false,
  currentPlaceId: null,
  showDone: false,
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
  requestTitleFocus: (id) => set({ titleFocusRequest: id, selectedNodeId: id, isPanelOpen: true }),
  clearTitleFocusRequest: () => set({ titleFocusRequest: null }),
}))
