import { useRef } from 'react'
import type { Panel } from '../../types/panel'
import { useDesignStore, type Tool } from '../../store/designStore'
import { downloadDesign, parse } from '../../lib/persistence'
import { defaultThinThickness } from '../../lib/panel'
import { DOCUMENT_UNITS, IMPERIAL_PRECISIONS, sameSystem, type Unit } from '../../lib/units'
import { Menu, MenuChoices, MenuItem, MenuLabel, MenuList } from '../ui/Menu'
import { Button } from '../ui/Button'
import { cx } from '../ui/cx'
import { ToolHint } from '../layout/ToolHint'

/** Quick-add presets so a carcass can be roughed out in a few clicks. Each sets
 *  the orientation and a typical size; everything stays editable afterwards.
 *  Thickness is left to the document-unit default, except thin parts (a back),
 *  which are flagged so they get the thin-stock default. (A shelf is just a
 *  horizontal panel, i.e. the same as top/bottom.) */
const ADD_PRESETS: { label: string; preset: Partial<Panel>; thin?: boolean }[] = [
  { label: 'Side', preset: { name: 'Side', normal: 'x', length: 580, width: 720 } },
  { label: 'Top / Bottom / Shelf', preset: { name: 'Top', normal: 'y', length: 600, width: 580 } },
  { label: 'Back', preset: { name: 'Back', normal: 'z', length: 600, width: 720 }, thin: true },
]

/** Toolbar buckets. A bucket with several modes opens a dropdown; a bucket with
 *  a single mode is just a toggle button. */
const TOOL_SECTIONS: { label: string; tools: { tool: Tool; label: string }[] }[] = [
  {
    label: 'Move',
    tools: [
      { tool: 'move', label: 'Free' },
      { tool: 'move-snap', label: 'Snap point' },
    ],
  },
  { label: 'Resize', tools: [{ tool: 'resize', label: 'Resize' }] },
  { label: 'Measure', tools: [{ tool: 'measure', label: 'Measure' }] },
]

const DIVIDER = <div className="my-1 border-t border-edge" />

export function Toolbar() {
  const panels = useDesignStore((s) => s.panels)
  const materials = useDesignStore((s) => s.materials)
  const stocks = useDesignStore((s) => s.stocks)
  const unit = useDesignStore((s) => s.unit)
  const kerf = useDesignStore((s) => s.kerf)
  const margin = useDesignStore((s) => s.margin)
  const setUnit = useDesignStore((s) => s.setUnit)
  const convertUnit = useDesignStore((s) => s.convertUnit)
  const precision = useDesignStore((s) => s.precision)
  const setPrecision = useDesignStore((s) => s.setPrecision)
  const setCutlistOpen = useDesignStore((s) => s.setCutlistOpen)
  const tool = useDesignStore((s) => s.tool)
  const setTool = useDesignStore((s) => s.setTool)
  const addPanel = useDesignStore((s) => s.addPanel)
  const loadDesign = useDesignStore((s) => s.loadDesign)
  const fixPrecision = useDesignStore((s) => s.fixPrecision)
  const clear = useDesignStore((s) => s.clear)
  const fileInput = useRef<HTMLInputElement>(null)
  const empty = panels.length === 0

  // Changing the document unit converts the geometry onto the new unit's grid.
  // Crossing measuring systems (mm↔inch) is lossy — every size snaps to the
  // nearest 1/16" and small gaps close — so confirm first.
  const changeUnit = (next: Unit) => {
    if (next === unit) return
    if (empty) {
      setUnit(next)
      return
    }
    if (
      !sameSystem(next, unit) &&
      !confirm(
        `Switch to ${next === 'inch' ? 'inches' : next}? Every size snaps to the nearest ` +
          `${next === 'inch' ? '1/16"' : 'mm'} and small joint gaps are closed. This is lossy and can't be undone cleanly.`,
      )
    ) {
      return
    }
    convertUnit(next)
  }

  const handleImport = async (file: File) => {
    try {
      loadDesign(parse(await file.text()))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not read that file.')
    }
  }

  return (
    <>
      <header className="flex h-11 shrink-0 items-center gap-1.5 border-b border-edge bg-surface px-2.5 print:hidden">
        <img src="/Panelizer/logo.png" alt="Panelizer" className="mr-1.5 h-5 w-auto opacity-90" />

        <Menu label="+ Add">
          {(close) => (
            <MenuList>
              {ADD_PRESETS.map(({ label, preset, thin }) => (
                <MenuItem
                  key={label}
                  onClick={() => {
                    addPanel(thin ? { ...preset, thickness: defaultThinThickness(unit) } : preset)
                    close()
                  }}
                >
                  {label}
                </MenuItem>
              ))}
            </MenuList>
          )}
        </Menu>

        <div className="ml-1 flex items-center gap-0.5 rounded-md border border-edge bg-bg/60 p-0.5" role="group" aria-label="Tools">
          {TOOL_SECTIONS.map((section) => {
            const active = section.tools.find((t) => t.tool === tool)

            // Single-mode bucket: a plain toggle button.
            if (section.tools.length === 1) {
              const { tool: t, label } = section.tools[0]
              return (
                <Button
                  key={section.label}
                  variant={tool === t ? 'primary' : 'ghost'}
                  onClick={() => setTool(t)}
                >
                  {label}
                </Button>
              )
            }

            // Multi-mode bucket: a dropdown showing the active sub-mode.
            return (
              <Menu
                key={section.label}
                ariaLabel={section.label}
                variant={active ? 'default' : 'ghost'}
                label={
                  <span className="flex items-center gap-1.5">
                    {section.label}
                    {active && (
                      <span className="text-micro rounded-xs bg-accent/20 px-1 py-px text-accent">
                        {active.label}
                      </span>
                    )}
                  </span>
                }
              >
                {(close) => (
                  <MenuList>
                    {section.tools.map(({ tool: t, label }) => (
                      <MenuItem
                        key={t}
                        onClick={() => {
                          setTool(t)
                          close()
                        }}
                      >
                        <span className={cx(tool === t && 'text-accent')}>{label}</span>
                      </MenuItem>
                    ))}
                  </MenuList>
                )}
              </Menu>
            )
          })}
        </div>

        <div className="flex-1" />

        <Button variant="primary" disabled={empty} onClick={() => setCutlistOpen(true)}>
          Cutlist
        </Button>

        <Menu label="☰" ariaLabel="Document menu" align="right" variant="ghost">
          {(close) => (
            <MenuList>
              <MenuLabel>Default document unit</MenuLabel>
              <MenuChoices options={DOCUMENT_UNITS} value={unit} onChange={changeUnit} />

              {DIVIDER}

              <MenuItem
                disabled={empty}
                onClick={() => {
                  downloadDesign({ panels, materials, stocks, unit, precision, kerf, margin })
                  close()
                }}
              >
                Export…
              </MenuItem>
              <MenuItem
                onClick={() => {
                  fileInput.current?.click()
                  close()
                }}
              >
                Import…
              </MenuItem>

              {unit === 'inch' && (
                <>
                  <MenuLabel>Precision</MenuLabel>
                  <MenuChoices
                    options={IMPERIAL_PRECISIONS.map((p) => ({ value: p, label: `1/${p}` }))}
                    value={precision}
                    onChange={setPrecision}
                  />
                </>
              )}

              {DIVIDER}

              <MenuItem
                disabled={empty}
                onClick={() => {
                  fixPrecision()
                  close()
                }}
              >
                Fix precision
              </MenuItem>

              {DIVIDER}

              <MenuItem
                danger
                disabled={empty}
                onClick={() => {
                  if (!empty && confirm('Clear the whole design?')) clear()
                  close()
                }}
              >
                New (clear all)
              </MenuItem>
            </MenuList>
          )}
        </Menu>

        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImport(file)
            e.target.value = '' // allow re-importing the same filename
          }}
        />
      </header>
      <ToolHint />
    </>
  )
}
