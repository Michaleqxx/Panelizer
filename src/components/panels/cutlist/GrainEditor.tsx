import { partNames } from '../../../lib/parts'
import { formatMeasurement, type Unit } from '../../../lib/units'
import { useDesignStore } from '../../../store/designStore'
import { GrainThumb } from './GrainThumb'
import { nextGrain } from './grainCycle'
import { Section, Swatch } from '../../ui/Panel'
import { cx } from '../../ui/cx'
import type { GrainGroup } from './useCutlistModel'

/**
 * Per-part grain editing, grouped by material + thickness (the way stock is
 * keyed). Rows cross-highlight with the cut diagrams on hover, can be excluded
 * from the cutlist when a part is already cut, and flag parts that failed to
 * nest.
 */
export function GrainEditor({
  groups,
  unit,
  hovered,
  onHover,
  unplacedNote,
  tipProps,
}: {
  groups: GrainGroup[]
  unit: Unit
  hovered: string[] | null
  onHover: (ids: string[] | null) => void
  unplacedNote: (ids: string[]) => string | null
  tipProps: (text: string) => object
}) {
  const panels = useDesignStore((s) => s.panels)
  const updatePanel = useDesignStore((s) => s.updatePanel)
  const fmt = (mm: number) => formatMeasurement(mm, unit)

  const isHovered = (ids: string[]) => hovered !== null && ids.some((id) => hovered.includes(id))
  const panelOf = (ids: string[]) => panels.find((p) => p.id === ids[0])
  const includedOf = (ids: string[]) => !panelOf(ids)?.excludeFromCutlist

  const cycleGrain = (ids: string[]) => {
    const grain = nextGrain(panelOf(ids)?.grain ?? 'length')
    ids.forEach((id) => updatePanel(id, { grain }))
  }

  const toggleIncluded = (ids: string[]) => {
    const exclude = includedOf(ids) // currently included → exclude it
    ids.forEach((id) => updatePanel(id, { excludeFromCutlist: exclude }))
  }

  return (
    <Section title="Grain">
      {groups.map((group) => (
        <div className="mb-2" key={`${group.material}@${group.thickness}`}>
          <div className="mb-0.5 flex items-center gap-1.5 text-xs text-ink-dim">
            <Swatch color={group.color} /> {group.material} · {fmt(group.thickness)}
          </div>
          <table className="w-full border-collapse text-xs">
            <tbody>
              {group.rows.map((row, i) => {
                const note = unplacedNote(row.ids)
                const included = includedOf(row.ids)
                // Use the real panel's length/width — PartRow dims are
                // normalised longest-first, which would flip the thumb.
                const panel = panelOf(row.ids)

                return (
                  <tr
                    key={i}
                    className={cx(
                      isHovered(row.ids) && 'bg-accent/15',
                      !included && 'opacity-45 line-through',
                    )}
                    onMouseEnter={() => onHover(row.ids)}
                    onMouseLeave={() => onHover(null)}
                  >
                    <td className="w-5">
                      <input
                        type="checkbox"
                        className="cursor-pointer accent-accent"
                        checked={included}
                        onChange={() => toggleIncluded(row.ids)}
                        aria-label={included ? 'Exclude from cutlist (already cut)' : 'Include in cutlist'}
                        {...tipProps(
                          included ? 'In cutlist — uncheck if already cut' : 'Excluded — check to add back',
                        )}
                      />
                    </td>
                    <td className="py-1 text-ink">
                      {partNames(row.parts)}
                      {note && (
                        <span className="ml-1 cursor-help text-snap-middle" {...tipProps(note)}>
                          ⚠
                        </span>
                      )}
                    </td>
                    <td className="py-1 text-ink-dim">{row.quantity}×</td>
                    <td className="py-1 text-ink-dim tabular-nums">
                      {fmt(row.length)} × {fmt(row.width)}
                    </td>
                    <td className="w-11">
                      <GrainThumb
                        length={panel?.length ?? row.length}
                        width={panel?.width ?? row.width}
                        grain={panel?.grain ?? 'length'}
                        onClick={() => cycleGrain(row.ids)}
                        tipProps={tipProps}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </Section>
  )
}
