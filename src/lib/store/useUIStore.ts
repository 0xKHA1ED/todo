'use client'

import { create } from 'zustand'

interface UIStore {
  selectedNodeId: string | null
  isPanelOpen: boolean
  isCommandPaletteOpen: boolean
  isQuickCaptureOpen: boolean
  activeLensId: string | null
  currentPlaceId: string | null
  showDone: boolean
  titleFocusRequest: string | null
  selectNode: (id: string | null) => void
  openPanel: (id: string) => void
  closePanel: () => void
  toggleCommandPalette: (open?: boolean) => void
  setQuickCaptureOpen: (open: boolean) => void
  setActiveLensId: (id: string | null) => void
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
  isQuickCaptureOpen: false,
  activeLensId: null,
  currentPlaceId: null,
  showDone: false,
  titleFocusRequest: null,
  selectNode: (id) => set({ selectedNodeId: id }),
  openPanel: (id) => set({ selectedNodeId: id, isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
  toggleCommandPalette: (open) =>
    set((state) => ({ isCommandPaletteOpen: typeof open === 'boolean' ? open : !state.isCommandPaletteOpen })),
  setQuickCaptureOpen: (open) => set({ isQuickCaptureOpen: open }),
  setActiveLensId: (activeLensId) => set({ activeLensId }),
  enterPlace: (id) =>
    set((state) => ({
      currentPlaceId: id,
      selectedNodeId: state.currentPlaceId === id ? state.selectedNodeId : null,
      isPanelOpen: state.currentPlaceId === id ? state.isPanelOpen : false,
      activeLensId: state.currentPlaceId === id ? state.activeLensId : null,
    })),
  resetPlace: () =>
    set({
      currentPlaceId: null,
      showDone: false,
      selectedNodeId: null,
      isPanelOpen: false,
      isQuickCaptureOpen: false,
      activeLensId: null,
    }),
  setShowDone: (showDone) => set({ showDone }),
  requestTitleFocus: (id) => set({ titleFocusRequest: id, selectedNodeId: id, isPanelOpen: true }),
  clearTitleFocusRequest: () => set({ titleFocusRequest: null }),
}))
