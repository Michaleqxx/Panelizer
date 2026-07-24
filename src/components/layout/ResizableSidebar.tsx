import type { ReactNode } from 'react'
import { useDragResize } from '../../hooks/useDragResize'
import { usePersistentState } from '../../hooks/usePersistentState'

const MIN_WIDTH = 260
const MAX_WIDTH = 560
const DEFAULT_WIDTH = 320
const STORAGE_KEY = 'panelizer.ui.sidebar'

interface SidebarPrefs {
  width: number
  collapsed: boolean
}

const DEFAULTS: SidebarPrefs = { width: DEFAULT_WIDTH, collapsed: false }

/** Merge a stored entry over the defaults, so a preference added later still
 *  loads an older, narrower entry. */
const revivePrefs = (stored: unknown): SidebarPrefs => ({ ...DEFAULTS, ...(stored as object) })

/** The right-hand panel: draggable to resize (handle on its left edge) and
 *  collapsible. Width and collapsed state are remembered as a UI preference,
 *  independent of the saved design. */
export function ResizableSidebar({ children }: { children: ReactNode }) {
  const [{ width, collapsed }, setPrefs] = usePersistentState(STORAGE_KEY, DEFAULTS, revivePrefs)

  const setCollapsed = (c: boolean) => setPrefs((p) => ({ ...p, collapsed: c }))

  // The sidebar is pinned to the window's right edge, so its width is however
  // far the cursor sits from that edge — no reference point to capture.
  const startResize = useDragResize({
    min: MIN_WIDTH,
    max: MAX_WIDTH,
    begin: () => (move) => window.innerWidth - move.clientX,
    onWidth: (w) => setPrefs((p) => ({ ...p, width: w })),
  })

  if (collapsed) {
    return (
      <button className="sidebar-reopen" onClick={() => setCollapsed(false)} aria-label="Show panel">
        ‹
      </button>
    )
  }

  return (
    <>
      <div
        className="sidebar-resizer"
        role="separator"
        aria-orientation="vertical"
        onMouseDown={startResize}
      />
      <aside className="workspace__sidebar" style={{ width }}>
        <div className="sidebar__topbar">
          <button className="sidebar__collapse" onClick={() => setCollapsed(true)} aria-label="Hide panel">
            ›
          </button>
        </div>
        {children}
      </aside>
    </>
  )
}
