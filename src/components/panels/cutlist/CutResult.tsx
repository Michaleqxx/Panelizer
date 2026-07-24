import type { CutlistResult } from '../../../lib/nesting'
import { partNames, type PartRow } from '../../../lib/parts'
import { formatMeasurement, type Unit } from '../../../lib/units'
import { useDesignStore } from '../../../store/designStore'
import { SheetSvg } from './SheetSvg'
import type { MissingStock } from './useCutlistModel'

/** Longest sheet drawn this wide (px); everything else scales to match. On
 *  paper the sheets go wider so every part's label + size stays legible. */
const SHEET_MAX_PX = 360
const PRINT_SHEET_MAX_PX = 680

/** The cut diagrams, the notices for anything that didn't nest, and the
 *  print-only parts table. */
export function CutResult({
  result,
  parts,
  missing,
  unit,
  margin,
  hovered,
  onHover,
  showTip,
  hideTip,
  printing,
}: {
  result: CutlistResult
  parts: PartRow[]
  missing: MissingStock[]
  unit: Unit
  margin: number
  hovered: string[] | null
  onHover: (ids: string[] | null) => void
  showTip: (e: { clientX: number; clientY: number }, text: string) => void
  hideTip: () => void
  printing: boolean
}) {
  const panels = useDesignStore((s) => s.panels)
  const fmt = (mm: number) => formatMeasurement(mm, unit)
  const includedOf = (ids: string[]) => !panels.find((p) => p.id === ids[0])?.excludeFromCutlist

  const tooBig = result.unplaced.filter((u) => u.reason === 'too-big')
  const noSpace = result.unplaced.filter((u) => u.reason === 'no-space')

  return (
    <main className="cutlist-view__result">
      {result.groups.length === 0 && result.unplaced.length === 0 && (
        <p className="cutlist-view__hint">Add sheet goods on the left to lay out the cut.</p>
      )}

      {result.groups.map((group) => {
        // Sheets in a group can differ in size; waste is over their actual
        // areas, and all are drawn to one scale (the group's biggest sheet) so
        // relative sizes read true.
        const sheetArea = group.sheets.reduce((sum, s) => sum + s.length * s.width, 0)
        const used = group.sheets.reduce((sum, s) => sum + s.usedArea, 0)
        const waste = sheetArea ? Math.round((1 - used / sheetArea) * 100) : 0
        const maxLength = Math.max(...group.sheets.map((s) => s.length))
        const scale = (printing ? PRINT_SHEET_MAX_PX : SHEET_MAX_PX) / maxLength

        return (
          <section className="cut-group" key={group.key}>
            <h3>
              <span className="parts__swatch" style={{ background: group.color }} /> {group.materialName} · {fmt(group.thickness)}
              <span className="cut-group__stats">
                {group.sheets.length} sheet{group.sheets.length === 1 ? '' : 's'} · {waste}% waste
              </span>
            </h3>
            <div className="cut-group__sheets">
              {group.sheets.map((sheet) => (
                <SheetSvg
                  key={sheet.index}
                  sheet={sheet}
                  scale={scale}
                  margin={margin}
                  color={group.color}
                  unit={unit}
                  hovered={hovered}
                  onHover={onHover}
                  showTip={showTip}
                  hideTip={hideTip}
                  printing={printing}
                />
              ))}
            </div>
          </section>
        )
      })}

      <MissingStockNotice missing={missing} unit={unit} />

      {tooBig.length > 0 && (
        <section className="cut-group cut-group--unplaced">
          <h3>Too big for the sheet</h3>
          <ul>
            {tooBig.map((u) => (
              <li key={u.panelId}>
                {u.name} — larger than the {u.materialName} · {fmt(u.thickness)} sheet (minus margin)
              </li>
            ))}
          </ul>
        </section>
      )}

      {noSpace.length > 0 && (
        <section className="cut-group cut-group--unplaced">
          <h3>Not enough stock</h3>
          <p className="cutlist-view__hint">
            These parts fit, but the available sheet quantity ran out — raise a quantity or add more sheets:
          </p>
          <ul>
            {noSpace.map((u) => (
              <li key={u.panelId}>
                {u.name} — {u.materialName} · {fmt(u.thickness)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Print-only parts table: every part to cut, with its dimensions, so the
          printout carries the full list next to the diagrams. */}
      <section className="cutlist-print-list">
        <h3>Parts</h3>
        <table>
          <thead>
            <tr>
              <th>Qty</th>
              <th>Part</th>
              <th>Length × Width</th>
              <th>Thickness</th>
              <th>Material</th>
            </tr>
          </thead>
          <tbody>
            {parts
              .filter((row) => includedOf(row.ids))
              .map((row, i) => (
                <tr key={i}>
                  <td>{row.quantity}×</td>
                  <td>{partNames(row.parts)}</td>
                  <td>
                    {fmt(row.length)} × {fmt(row.width)}
                  </td>
                  <td>{fmt(row.thickness)}</td>
                  <td>{row.material}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </main>
  )
}

/** Parts with no matching stock at all, with a one-click fix. */
function MissingStockNotice({ missing, unit }: { missing: MissingStock[]; unit: Unit }) {
  const materials = useDesignStore((s) => s.materials)
  const addStock = useDesignStore((s) => s.addStock)

  if (missing.length === 0) return null

  return (
    <section className="cut-group cut-group--missing">
      <h3>Missing stock</h3>
      <p className="cutlist-view__hint">These parts have no sheet to nest onto. Add the matching stock:</p>
      {missing.map((m) => (
        <div className="missing-row" key={`${m.materialId}@${m.thickness}`}>
          <span>
            <span className="parts__swatch" style={{ background: materials.find((x) => x.id === m.materialId)?.color }} />{' '}
            {m.materialName} · {formatMeasurement(m.thickness, unit)} — {m.count} part{m.count === 1 ? '' : 's'}
          </span>
          <button onClick={() => addStock(m.materialId, m.thickness)}>+ Add sheet</button>
        </div>
      ))}
    </section>
  )
}
