import { useState } from 'react'
import type { Stock } from '../../../lib/stock'
import { formatMeasurement, type Unit } from '../../../lib/units'
import { useDesignStore } from '../../../store/designStore'
import { MeasurementInput } from '../../ui/MeasurementInput'
import { CheckIcon, PencilIcon } from './icons'

/**
 * Kerf/margin settings plus the sheet-goods inventory. Each stock row collapses
 * to a one-line summary unless it's the one being edited — a fresh sheet always
 * needs sizing, so adding one drops straight into edit mode.
 */
export function StockList({ unit, precision }: { unit: Unit; precision: number }) {
  const materials = useDesignStore((s) => s.materials)
  const stocks = useDesignStore((s) => s.stocks)
  const kerf = useDesignStore((s) => s.kerf)
  const margin = useDesignStore((s) => s.margin)
  const setKerf = useDesignStore((s) => s.setKerf)
  const setMargin = useDesignStore((s) => s.setMargin)
  const addStock = useDesignStore((s) => s.addStock)
  const updateStock = useDesignStore((s) => s.updateStock)
  const removeStock = useDesignStore((s) => s.removeStock)

  const [editing, setEditing] = useState<string | null>(null)

  const addAndEdit = () => {
    addStock(materials[0].id)
    const created = useDesignStore.getState().stocks.at(-1)
    if (created) setEditing(created.id)
  }

  return (
    <>
      <div className="field-group">
        <h3>Settings</h3>
        <MeasurementInput label="Kerf" value={kerf} unit={unit} precision={precision} min={0} snap onChange={setKerf} />
        <MeasurementInput label="Margin" value={margin} unit={unit} precision={precision} min={0} snap onChange={setMargin} />
      </div>

      <div className="field-group">
        <div className="sidebar__header">
          <h3>Sheet goods</h3>
          <button onClick={addAndEdit}>+ Add</button>
        </div>

        {stocks.length === 0 && (
          <p className="cutlist-view__hint">
            Add the sheets you have — parts nest onto stock of the same material and thickness.
          </p>
        )}

        {stocks.map((stock) =>
          editing === stock.id ? (
            <StockEditor
              key={stock.id}
              stock={stock}
              unit={unit}
              precision={precision}
              onChange={(patch) => updateStock(stock.id, patch)}
              onRemove={() => removeStock(stock.id)}
              onDone={() => setEditing(null)}
            />
          ) : (
            <StockSummary
              key={stock.id}
              stock={stock}
              unit={unit}
              onEdit={() => setEditing(stock.id)}
              onRemove={() => removeStock(stock.id)}
            />
          ),
        )}
      </div>
    </>
  )
}

function StockEditor({
  stock,
  unit,
  precision,
  onChange,
  onRemove,
  onDone,
}: {
  stock: Stock
  unit: Unit
  precision: number
  onChange: (patch: Partial<Stock>) => void
  onRemove: () => void
  onDone: () => void
}) {
  const materials = useDesignStore((s) => s.materials)

  return (
    <div className="stock stock--editing">
      <div className="stock__row">
        <select value={stock.materialId} onChange={(e) => onChange({ materialId: e.target.value })}>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div className="stock__grid">
        <MeasurementInput label="Thickness" value={stock.thickness} unit={unit} precision={precision} min={1} snap onChange={(v) => onChange({ thickness: v })} />
        <label className="field">
          <span className="field__label">Quantity</span>
          <span className="field__control">
            <input
              type="number"
              min={1}
              placeholder="∞"
              value={stock.quantity ?? ''}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10)
                onChange({ quantity: Number.isFinite(n) && n > 0 ? n : null })
              }}
            />
          </span>
        </label>
        <MeasurementInput label="Length" value={stock.length} unit={unit} precision={precision} min={1} snap onChange={(v) => onChange({ length: v })} />
        <MeasurementInput label="Width" value={stock.width} unit={unit} precision={precision} min={1} snap onChange={(v) => onChange({ width: v })} />
      </div>

      <div className="stock__actions">
        <button className="material__remove" aria-label="Remove stock" onClick={onRemove}>
          ✕
        </button>
        <button className="stock__done" aria-label="Done editing" onClick={onDone}>
          <CheckIcon />
        </button>
      </div>
    </div>
  )
}

function StockSummary({
  stock,
  unit,
  onEdit,
  onRemove,
}: {
  stock: Stock
  unit: Unit
  onEdit: () => void
  onRemove: () => void
}) {
  const material = useDesignStore((s) => s.materials.find((m) => m.id === stock.materialId))
  const fmt = (mm: number) => formatMeasurement(mm, unit)

  return (
    <div className="stock stock__summary">
      <span className="parts__swatch" style={{ background: material?.color }} />
      <span className="stock__name">
        {material?.name} · {fmt(stock.thickness)}
      </span>
      <span className="stock__dims">
        {fmt(stock.length)} × {fmt(stock.width)} · {stock.quantity ? `${stock.quantity}×` : '∞'}
      </span>
      <button className="stock__edit" aria-label="Edit stock" onClick={onEdit}>
        <PencilIcon />
      </button>
      <button className="material__remove" aria-label="Remove stock" onClick={onRemove}>
        ✕
      </button>
    </div>
  )
}
