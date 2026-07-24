import { formatMeasurement, type Unit } from '../../../lib/units'
import { useDesignStore } from '../../../store/designStore'
import { GrainThumb } from './GrainThumb'
import { nextGrain } from './grainCycle'
import { Section, Swatch } from '../../ui/Panel'
import { PartNames } from '../../ui/PartNames'
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
        <div className="mb-3 last:mb-0" key={`${group.material}@${group.thickness}`}>
          {/* Stock heading: the same "header for the rows it owns" treatment the
              parts list gives an expanded group. */}
          <div className="flex items-center gap-1.5 rounded-t border-b border-edge-strong bg-surface-2 px-1.5 py-1">
            <Swatch color={group.color} />
            <span className="text-[13px] font-medium text-ink">{group.material}</span>
            <span className="text-small text-ink-dim tabular-nums">· {fmt(group.thickness)}</span>
          </div>

          <table className="w-full border-collapse text-[13px]">
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
                      'border-b border-edge/60 transition-colors last:border-b-0',
                      isHovered(row.ids) ? 'bg-accent/20' : 'hover:bg-surface-2',
                      // An excluded part stays legible — it's dimmed, not
                      // struck through, so its size can still be read.
                      !included && 'text-ink-faint',
                    )}
                    onMouseEnter={() => onHover(row.ids)}
                    onMouseLeave={() => onHover(null)}
                  >
                    <td className="w-7 pl-1.5">
                      <input
                        type="checkbox"
                        className="size-3.5 cursor-pointer accent-accent"
                        checked={included}
                        onChange={() => toggleIncluded(row.ids)}
                        aria-label={included ? 'Exclude from cutlist (already cut)' : 'Include in cutlist'}
                        {...tipProps(
                          included ? 'In cutlist — uncheck if already cut' : 'Excluded — check to add back',
                        )}
                      />
                    </td>
                    <td className={cx('py-1.5 pr-1', included && 'text-ink')}>
                      <span className="flex min-w-0 items-center gap-1">
                        <PartNames names={row.parts} />
                        {note && (
                          <span className="shrink-0 cursor-help text-snap-middle" {...tipProps(note)}>
                            ⚠
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="w-8 py-1.5 text-right text-ink-dim tabular-nums">{row.quantity}×</td>
                    <td className="py-1.5 pl-2 text-right text-ink-dim tabular-nums">
                      {fmt(row.length)} × {fmt(row.width)}
                    </td>
                    <td className="w-12 py-1 pl-1.5">
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
