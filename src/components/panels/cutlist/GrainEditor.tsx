import { partNames } from '../../../lib/parts'
import { formatMeasurement, type Unit } from '../../../lib/units'
import { useDesignStore } from '../../../store/designStore'
import { GrainThumb } from './GrainThumb'
import { nextGrain } from './grainCycle'
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
    <div className="field-group">
      <h3>Grain</h3>
      {groups.map((group) => (
        <div className="grain-group" key={`${group.material}@${group.thickness}`}>
          <div className="grain-group__head">
            <span className="parts__swatch" style={{ background: group.color }} /> {group.material} · {fmt(group.thickness)}
          </div>
          <table className="parts__table grain-group__table">
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
                    className={`${isHovered(row.ids) ? 'is-hover' : ''}${included ? '' : ' is-excluded'}`}
                    onMouseEnter={() => onHover(row.ids)}
                    onMouseLeave={() => onHover(null)}
                  >
                    <td>
                      <input
                        type="checkbox"
                        className="grain-include"
                        checked={included}
                        onChange={() => toggleIncluded(row.ids)}
                        aria-label={included ? 'Exclude from cutlist (already cut)' : 'Include in cutlist'}
                        {...tipProps(
                          included ? 'In cutlist — uncheck if already cut' : 'Excluded — check to add back',
                        )}
                      />
                    </td>
                    <td className="parts__name">
                      {partNames(row.parts)}
                      {note && (
                        <span className="grain-warn" {...tipProps(note)}>
                          ⚠
                        </span>
                      )}
                    </td>
                    <td>{row.quantity}×</td>
                    <td>
                      {fmt(row.length)} × {fmt(row.width)}
                    </td>
                    <td>
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
    </div>
  )
}
