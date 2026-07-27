import { useEffect } from 'react'
import { Toolbar } from './components/panels/Toolbar'
import { PropertiesPanel } from './components/panels/PropertiesPanel'
import { MaterialsPanel } from './components/panels/MaterialsPanel'
import { PartsPanel } from './components/panels/PartsPanel'
import { CutlistModal } from './components/panels/CutlistModal'
import { Viewport } from './components/viewport/Viewport'
import { ViewportControls } from './components/viewport/ViewportControls'
import { GestureReadout } from './components/viewport/GestureReadout'
import { WebGLUnavailable } from './components/viewport/WebGLUnavailable'
import { ResizableSidebar } from './components/layout/ResizableSidebar'
import { ConfirmHost } from './components/ui/ConfirmDialog'
import { useDesignStore } from './store/designStore'
import { useSharedLink } from './components/layout/useSharedLink'
import { hasWebGL } from './lib/webgl'

/** Whether a keystroke should be left to the focused field rather than treated
 *  as a global shortcut. */
const isTyping = (el: EventTarget | null): boolean =>
  el instanceof HTMLElement &&
  (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)

export default function App() {
  const undo = useDesignStore((s) => s.undo)
  const redo = useDesignStore((s) => s.redo)

  useSharedLink()

  // Global undo / redo. Ctrl+Z undoes; Ctrl+Y or Ctrl+Shift+Z redoes (both
  // conventions work). Skipped while typing in a field so text edits keep their
  // own undo.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || isTyping(e.target)) return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  return (
    <div className="flex h-full flex-col">
      <Toolbar />
      <main className="flex min-h-0 flex-1 print:hidden">
        {/* One gate for the whole canvas area: without WebGL the overlays would
            otherwise float their controls over a dead viewport. */}
        <div className="relative min-w-0 flex-1">
          {hasWebGL() ? (
            <>
              <Viewport />
              <ViewportControls />
              <GestureReadout />
            </>
          ) : (
            <WebGLUnavailable />
          )}
        </div>
        <ResizableSidebar>
          <PropertiesPanel />
          <MaterialsPanel />
          <PartsPanel />
        </ResizableSidebar>
      </main>
      <CutlistModal />
      <ConfirmHost />
    </div>
  )
}
