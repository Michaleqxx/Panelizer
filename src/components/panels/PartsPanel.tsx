import { useMemo, useState } from 'react'
import type { Panel } from '../../types/panel'
import { buildParts, partNames, partsToCsv } from '../../lib/parts'
import { formatMeasurement, UNIT_SUFFIX, type Unit } from '../../lib/units'
import { useDesignStore } from '../../store/designStore'
import { useTooltip } from '../ui/useTooltip'
import { Button } from '../ui/Button'
import { Hint, Section, Swatch } from '../ui/Panel'
import { cx } from '../ui/cx'

type PartRow = ReturnType<typeof buildParts>[number]

/** Stable identity for a group row, so expand state survives re-derivation. */
const groupKey = (r: PartRow) => `${r.length}x${r.width}x${r.thickness}@${r.material}`

const CELL = "px-1.5 py-1 text-left"

/** Live list of the project's parts, derived from the panels. Identical parts
 *  are grouped and counted; a group can be expanded to reach each panel on its
 *  own, and every panel (or a whole group) can be hidden — ghosted in the
 *  viewport, but still counted here and for snapping. The CSV button copies the
 *  same table for a spreadsheet or the shop. */
export function PartsPanel() {
  const panels = useDesignStore((s) => s.panels)
  const materials = useDesignStore((s) => s.materials)
  const unit = useDesignStore((s) => s.unit)
  const selectedIds = useDesignStore((s) => s.selectedIds)
  const select = useDesignStore((s) => s.select)
  const setHidden = useDesignStore((s) => s.setHidden)
  const precision = useDesignStore((s) => s.precision)
  const rows = useMemo(() => buildParts(panels, materials, unit, precision), [panels, materials, unit, precision])
  const byId = useMemo(() => new Map(panels.map((p) => [p.id, p])), [panels])

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggleExpanded = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const copyCsv = () => navigator.clipboard.writeText(partsToCsv(rows, unit))

  // Clicking a group row selects (and so highlights) its panels. Each click
  // steps to the next one, so identical panels can all be found.
  const cycle = (ids: string[]) => {
    const at = ids.findIndex((id) => selectedIds.includes(id))
    select(ids[(at + 1) % ids.length])
  }

  return (
    <Section
      title="Parts"
      action={
        <Button size="sm" onClick={copyCsv} disabled={rows.length === 0}>
          Copy CSV
        </Button>
      }
    >
      {rows.length === 0 ? (
        <Hint>No panels yet.</Hint>
      ) : (
        <table className="text-small w-full border-collapse">
          <thead>
            <tr className="label-micro border-b border-edge">
              <th className="w-4" />
              <th className={cx(CELL, "text-right")}>Qty</th>
              <th className={CELL}>Part</th>
              <th className={cx(CELL, "text-right")}>Length</th>
              <th className={cx(CELL, "text-right")}>Width</th>
              <th className={cx(CELL, "text-right")}>Thick.</th>
              <th className={CELL}>Material</th>
              <th className="w-6" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const key = groupKey(r)
              const open = expanded.has(key)
              const allHidden = r.ids.every((id) => byId.get(id)?.hidden)
              return (
                <GroupRow
                  key={key}
                  row={r}
                  unit={unit}
                  open={open}
                  allHidden={allHidden}
                  selected={r.ids.some((id) => selectedIds.includes(id))}
                  onToggleOpen={() => toggleExpanded(key)}
                  onSelect={() => cycle(r.ids)}
                  onToggleHidden={() => setHidden(r.ids, !allHidden)}
                >
                  {open &&
                    r.ids.map((id, i) => {
                      const child = byId.get(id)
                      if (!child) return null
                      return (
                        <ChildRow
                          key={id}
                          panel={child}
                          name={r.parts[i]}
                          selected={selectedIds.includes(id)}
                          onSelect={() => select(id)}
                          onToggleHidden={() => setHidden([id], !child.hidden)}
                        />
                      )
                    })}
                </GroupRow>
              )
            })}
          </tbody>
        </table>
      )}

      <p className="text-micro mt-2 mb-0 text-ink-faint">
        {panels.length} panel{panels.length === 1 ? '' : 's'} · {rows.length} unique part
        {rows.length === 1 ? '' : 's'} · dimensions in {UNIT_SUFFIX[unit]}
      </p>
    </Section>
  )
}

/** A grouped parts row: expand chevron (multi-part groups only), the shared
 *  dimensions, and an eye that hides/shows the whole group. Clicking the row
 *  cycles the selection through its panels. Its expanded child rows are passed
 *  in as `children` so they sit directly beneath it in the table body. */
function GroupRow({
  row,
  unit,
  open,
  allHidden,
  selected,
  onToggleOpen,
  onSelect,
  onToggleHidden,
  children,
}: {
  row: PartRow
  unit: Unit
  open: boolean
  allHidden: boolean
  selected: boolean
  onToggleOpen: () => void
  onSelect: () => void
  onToggleHidden: () => void
  children?: React.ReactNode
}) {
  const fmt = (mm: number) => formatMeasurement(mm, unit)
  const expandable = row.quantity > 1
  const tip = useTooltip(expandable ? 'Click to cycle matching panels; use ▸ to list them' : 'Click to select')

  return (
    <>
      <tr
        className={cx('cursor-pointer border-b border-edge/50 transition-colors hover:bg-surface-2',
          selected && 'bg-accent/20 hover:bg-accent/25')}
        onClick={onSelect}
        {...tip.trigger}
      >
        <td className="w-4">
          {expandable && (
            <button
              type="button"
              className={cx(
                'cursor-pointer border-0 bg-transparent p-0 text-ink-dim transition-transform hover:text-ink',
                open && 'rotate-90',
              )}
              onClick={(e) => {
                e.stopPropagation()
                onToggleOpen()
              }}
              aria-label={open ? 'Collapse group' : 'Expand group'}
            >
              ▸
            </button>
          )}
        </td>
        <td className={cx(CELL, "text-right tabular-nums text-ink-dim")}>{row.quantity}</td>
        <td className={cx(CELL, 'text-ink')}>{partNames(row.parts)}</td>
        <td className={cx(CELL, "text-right tabular-nums")}>{fmt(row.length)}</td>
        <td className={cx(CELL, "text-right tabular-nums")}>{fmt(row.width)}</td>
        <td className={cx(CELL, "text-right tabular-nums")}>{fmt(row.thickness)}</td>
        <td className={cx(CELL, 'whitespace-nowrap')}>
          <Swatch color={row.color} /> {row.material}
          {tip.node}
        </td>
        <td className="w-6">
          <EyeButton
            hidden={allHidden}
            onToggle={onToggleHidden}
            label={allHidden ? 'Show all in group' : 'Hide all in group'}
          />
        </td>
      </tr>
      {children}
    </>
  )
}

/** One panel inside an expanded group: its own name, selectable and hideable
 *  independently of its siblings. */
function ChildRow({
  panel,
  name,
  selected,
  onSelect,
  onToggleHidden,
}: {
  panel: Panel
  name: string
  selected: boolean
  onSelect: () => void
  onToggleHidden: () => void
}) {
  return (
    <tr
      className={cx(
        'cursor-pointer border-b border-edge/50 text-ink-dim transition-colors hover:bg-surface-2',
        selected && 'bg-accent/20',
        panel.hidden && 'opacity-50',
      )}
      onClick={onSelect}
    >
      <td className="w-4" />
      <td />
      <td className={cx(CELL, 'pl-2')} colSpan={4}>
        {name}
      </td>
      <td className="w-6">
        <EyeButton
          hidden={panel.hidden === true}
          onToggle={onToggleHidden}
          label={panel.hidden ? 'Show panel' : 'Hide panel'}
        />
      </td>
    </tr>
  )
}

/** Small open/closed-eye toggle. Stops propagation so it never triggers the
 *  row's select. */
function EyeButton({ hidden, onToggle, label }: { hidden: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      className={cx(
        'cursor-pointer border-0 bg-transparent p-0.5 hover:text-ink',
        hidden ? 'text-ink-dim/50' : 'text-ink-dim',
      )}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      aria-label={label}
      title={label}
    >
      <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"
        />
        <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
        {hidden && <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M4 20 20 4" />}
      </svg>
    </button>
  )
}
