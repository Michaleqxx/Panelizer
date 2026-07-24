import type { Placement, SheetLayout } from '../../../lib/nesting'
import { formatMeasurement, type Unit } from '../../../lib/units'
import { planPlacements, type PlacementPlan } from './sheetPlan'

/** Geometry of one placed part in screen px, shared by both label renderers. */
interface PartBox {
  x: number
  y: number
  w: number
  h: number
}

/**
 * One sheet drawn to scale, with its parts, kerf gaps, and margin border.
 * Parts highlight on hover (and cross-highlight the grain list) and pop an
 * instant tooltip so even the small ones can be identified.
 */
export function SheetSvg({
  sheet,
  scale,
  margin,
  color,
  unit,
  hovered,
  onHover,
  showTip,
  hideTip,
  printing,
}: {
  sheet: SheetLayout
  scale: number
  margin: number
  color: string
  unit: Unit
  hovered: string[] | null
  onHover: (ids: string[] | null) => void
  showTip: (e: { clientX: number; clientY: number }, text: string) => void
  hideTip: () => void
  printing: boolean
}) {
  const W = sheet.length * scale
  const H = sheet.width * scale
  const label = (mm: number) => formatMeasurement(mm, unit)
  const { plan, legend } = planPlacements(sheet.placements, scale, label, printing)

  return (
    <figure className="sheet">
      <svg width={W} height={H} className="sheet__svg" role="img">
        <rect x={0} y={0} width={W} height={H} className="sheet__bg" />
        <rect
          x={margin * scale}
          y={margin * scale}
          width={W - 2 * margin * scale}
          height={H - 2 * margin * scale}
          className="sheet__margin"
        />
        {sheet.placements.map((p, i) => {
          const box: PartBox = { x: p.x * scale, y: p.y * scale, w: p.w * scale, h: p.h * scale }
          const isHot = hovered?.includes(p.panelId) ?? false
          const tipText = `${p.name} · ${label(p.w)} × ${label(p.h)}`

          return (
            <g
              key={p.panelId}
              onMouseEnter={(e) => {
                onHover([p.panelId])
                showTip(e, tipText)
              }}
              onMouseMove={(e) => showTip(e, tipText)}
              onMouseLeave={() => {
                onHover(null)
                hideTip()
              }}
            >
              <rect
                x={box.x}
                y={box.y}
                width={box.w}
                height={box.h}
                fill={color}
                className={isHot ? 'sheet__part sheet__part--hover' : 'sheet__part'}
              />
              {printing ? (
                <PrintLabel placement={p} box={box} plan={plan[i]} />
              ) : (
                <ScreenLabel placement={p} box={box} isHot={isHot} label={label} />
              )}
            </g>
          )
        })}
      </svg>

      <figcaption>
        Sheet {sheet.index} · {label(sheet.length)} × {label(sheet.width)}
        <span className="sheet__grain-hint">↔ grain</span>
      </figcaption>

      {printing && legend.length > 0 && (
        <ul className="sheet__legend">
          {legend.map((entry) => (
            <li key={entry.letter}>
              <span className="sheet__legend-key">{entry.letter}</span> {entry.text}
            </li>
          ))}
        </ul>
      )}
    </figure>
  )
}

/** A dimension chip, optionally rotated to run down a part's left edge. */
function DimChip({ x, y, text, rotateAbout }: { x: number; y: number; text: string; rotateAbout?: [number, number] }) {
  const chip = (
    <foreignObject x={x} y={y} width={80} height={15}>
      <div className="sheet__dim">
        <span className="sheet__dim-chip">{text}</span>
      </div>
    </foreignObject>
  )
  if (!rotateAbout) return chip
  return <g transform={`rotate(-90 ${rotateAbout[0]} ${rotateAbout[1]})`}>{chip}</g>
}

/**
 * Print labelling: always shows as much as fits, because a printout can't be
 * hovered. Falls back through edge dims → a single rotated dim → a legend
 * letter as parts get smaller.
 */
function PrintLabel({ placement, box, plan }: { placement: Placement; box: PartBox; plan: PlacementPlan }) {
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const { mode, size, wStr, hStr, named, letter, innerW, innerH } = plan

  if (mode === 'letter') {
    return (
      <foreignObject x={cx - 9} y={cy - 9} width={18} height={18}>
        <div className="sheet__letter">{letter}</div>
      </foreignObject>
    )
  }

  if (mode === 'dims') {
    // Thin strip: its letter + dim, rotated to run along its length.
    const portrait = box.h > box.w
    const bw = portrait ? box.h : box.w
    const bh = portrait ? box.w : box.h
    return (
      <g transform={portrait ? `rotate(-90 ${cx} ${cy})` : undefined}>
        <foreignObject x={cx - bw / 2} y={cy - bh / 2} width={bw} height={bh} className="sheet__plabel-fo">
          <div className="sheet__plabel sheet__plabel--row">
            <span className="sheet__legend-key">{letter}</span>
            <span className="sheet__plabel-size">{size}</span>
          </div>
        </foreignObject>
      </g>
    )
  }

  // Edge layout: width along the top, height down the left. The name sits
  // centred when it fits; otherwise a letter does, and the legend says which
  // part it is.
  return (
    <>
      <DimChip x={cx - 40} y={box.y + 2} text={wStr} />
      <DimChip x={box.x + 10 - 40} y={cy - 8} text={hStr} rotateAbout={[box.x + 10, cy]} />
      {named ? (
        <foreignObject x={box.x + 16} y={box.y + 16} width={innerW} height={innerH} className="sheet__namebox">
          <div className="sheet__plabel">
            <span className="sheet__plabel-name">{placement.name}</span>
          </div>
        </foreignObject>
      ) : (
        // Bottom-right corner — clear of the top/left edge dims.
        <foreignObject x={box.x + box.w - 16} y={box.y + box.h - 16} width={14} height={14}>
          <div className="sheet__letter">{letter}</div>
        </foreignObject>
      )}
    </>
  )
}

/** Screen labelling: just the name, with dimensions revealed on hover. */
function ScreenLabel({
  placement,
  box,
  isHot,
  label,
}: {
  placement: Placement
  box: PartBox
  isHot: boolean
  label: (mm: number) => string
}) {
  return (
    <>
      {box.w > 34 && box.h > 16 && (
        <foreignObject x={box.x} y={box.y} width={box.w} height={box.h} className="sheet__label-fo">
          <div className="sheet__label">
            <span className="sheet__label-text">{placement.name}</span>
          </div>
        </foreignObject>
      )}
      {isHot && (
        <>
          {/* Size on the sheet: width along the top, height down the left. */}
          <foreignObject x={box.x + box.w / 2 - 40} y={box.y + 2} width={80} height={18}>
            <div className="sheet__dim">
              <span className="sheet__dim-chip">{label(placement.w)}</span>
            </div>
          </foreignObject>
          <g transform={`rotate(-90 ${box.x + 11} ${box.y + box.h / 2})`}>
            <foreignObject x={box.x + 11 - 40} y={box.y + box.h / 2 - 9} width={80} height={18}>
              <div className="sheet__dim">
                <span className="sheet__dim-chip">{label(placement.h)}</span>
              </div>
            </foreignObject>
          </g>
        </>
      )}
    </>
  )
}
