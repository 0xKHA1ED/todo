import { beforeEach, describe, expect, it } from 'vitest'
import { useUIStore } from './useUIStore'

function resetStore() {
  useUIStore.setState({
    selectedNodeId: null,
    isPanelOpen: false,
    isCommandPaletteOpen: false,
    isQuickCaptureOpen: false,
    filingNodeId: null,
    activeLensId: null,
    currentPlaceId: null,
    showDone: false,
    titleFocusRequest: null,
  })
}

describe('useUIStore', () => {
  beforeEach(resetStore)

  it('opens the panel, selecting the node and clearing any filing state', () => {
    useUIStore.setState({ filingNodeId: 'filing' })
    useUIStore.getState().openPanel('node-1')
    const state = useUIStore.getState()
    expect(state.selectedNodeId).toBe('node-1')
    expect(state.isPanelOpen).toBe(true)
    expect(state.filingNodeId).toBeNull()
  })

  it('closePanel leaves the selection intact', () => {
    useUIStore.getState().openPanel('node-1')
    useUIStore.getState().closePanel()
    expect(useUIStore.getState().isPanelOpen).toBe(false)
    expect(useUIStore.getState().selectedNodeId).toBe('node-1')
  })

  it('toggles the command palette and supports an explicit value', () => {
    useUIStore.getState().toggleCommandPalette()
    expect(useUIStore.getState().isCommandPaletteOpen).toBe(true)
    useUIStore.getState().toggleCommandPalette()
    expect(useUIStore.getState().isCommandPaletteOpen).toBe(false)
    useUIStore.getState().toggleCommandPalette(true)
    expect(useUIStore.getState().isCommandPaletteOpen).toBe(true)
  })

  it('starting a filing flow closes the panel', () => {
    useUIStore.getState().openPanel('node-1')
    useUIStore.getState().startFilingNode('node-2')
    const state = useUIStore.getState()
    expect(state.filingNodeId).toBe('node-2')
    expect(state.isPanelOpen).toBe(false)
  })

  it('entering the same place preserves selection, panel, and lens', () => {
    useUIStore.setState({ currentPlaceId: 'place-1', selectedNodeId: 'node-1', isPanelOpen: true, activeLensId: 'errands' })
    useUIStore.getState().enterPlace('place-1')
    const state = useUIStore.getState()
    expect(state.selectedNodeId).toBe('node-1')
    expect(state.isPanelOpen).toBe(true)
    expect(state.activeLensId).toBe('errands')
  })

  it('entering a different place clears selection, panel, lens, and filing', () => {
    useUIStore.setState({
      currentPlaceId: 'place-1',
      selectedNodeId: 'node-1',
      isPanelOpen: true,
      activeLensId: 'errands',
      filingNodeId: 'filing',
    })
    useUIStore.getState().enterPlace('place-2')
    const state = useUIStore.getState()
    expect(state.currentPlaceId).toBe('place-2')
    expect(state.selectedNodeId).toBeNull()
    expect(state.isPanelOpen).toBe(false)
    expect(state.activeLensId).toBeNull()
    expect(state.filingNodeId).toBeNull()
  })

  it('resetPlace returns to the initial standing state', () => {
    useUIStore.setState({
      currentPlaceId: 'place-1',
      showDone: true,
      selectedNodeId: 'node-1',
      isPanelOpen: true,
      isQuickCaptureOpen: true,
      filingNodeId: 'filing',
      activeLensId: 'errands',
    })
    useUIStore.getState().resetPlace()
    expect(useUIStore.getState()).toMatchObject({
      currentPlaceId: null,
      showDone: false,
      selectedNodeId: null,
      isPanelOpen: false,
      isQuickCaptureOpen: false,
      filingNodeId: null,
      activeLensId: null,
    })
  })

  it('requestTitleFocus opens the panel focused on the node and clearTitleFocusRequest resets it', () => {
    useUIStore.getState().requestTitleFocus('node-9')
    const focused = useUIStore.getState()
    expect(focused.titleFocusRequest).toBe('node-9')
    expect(focused.selectedNodeId).toBe('node-9')
    expect(focused.isPanelOpen).toBe(true)
    useUIStore.getState().clearTitleFocusRequest()
    expect(useUIStore.getState().titleFocusRequest).toBeNull()
  })

  it('setActiveLensId and setQuickCaptureOpen both clear filing state', () => {
    useUIStore.setState({ filingNodeId: 'filing' })
    useUIStore.getState().setActiveLensId('calls')
    expect(useUIStore.getState().filingNodeId).toBeNull()

    useUIStore.setState({ filingNodeId: 'filing' })
    useUIStore.getState().setQuickCaptureOpen(true)
    expect(useUIStore.getState().filingNodeId).toBeNull()
    expect(useUIStore.getState().isQuickCaptureOpen).toBe(true)
  })
})
