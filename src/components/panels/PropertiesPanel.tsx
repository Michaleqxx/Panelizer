import type { Axis } from '../../types/panel'
import { useDesignStore } from '../../store/designStore'
import { MeasurementInput } from '../ui/MeasurementInput'
import { Button } from '../ui/Button'
import { CONTROL, Field, SelectField } from '../ui/Field'
import { Hint, Section } from '../ui/Panel'

const ORIENTATIONS: { value: Axis; label: string }[] = [
  { value: 'x', label: 'Upright side (thickness ← → X)' },
  { value: 'y', label: 'Horizontal shelf (thickness ↑ ↓ Y)' },
  { value: 'z', label: 'Back / door (thickness front-back Z)' },
]

/** A titled block of measurement fields inside the panel editor. */
function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-2.5">
      <h4 className="mb-1 text-xs font-semibold tracking-wide text-ink-dim uppercase">{title}</h4>
      {children}
    </div>
  )
}

/** Editor for the selected panel. Length and width are freely editable; the
 *  face resizes and the thickness stays put. Thickness lives here on purpose —
 *  it is the one dimension the viewport won't let you drag. */
export function PropertiesPanel() {
  const selectedIds = useDesignStore((s) => s.selectedIds)
  // The editor targets a single selection; a multi-selection shows a summary.
  const panel = useDesignStore((s) =>
    s.selectedIds.length === 1 ? (s.panels.find((p) => p.id === s.selectedIds[0]) ?? null) : null,
  )
  const materials = useDesignStore((s) => s.materials)
  const unit = useDesignStore((s) => s.unit)
  const precision = useDesignStore((s) => s.precision)
  const updatePanel = useDesignStore((s) => s.updatePanel)
  const setPanelMaterial = useDesignStore((s) => s.setPanelMaterial)
  const removePanel = useDesignStore((s) => s.removePanel)
  const removePanels = useDesignStore((s) => s.removePanels)
  const duplicatePanel = useDesignStore((s) => s.duplicatePanel)

  if (selectedIds.length > 1) {
    return (
      <Section
        title={`${selectedIds.length} panels`}
        action={
          <Button size="sm" variant="danger" onClick={() => removePanels(selectedIds)}>
            Delete
          </Button>
        }
      >
        <Hint>Drag any handle to move them together. Shift+click a panel to add or remove it.</Hint>
      </Section>
    )
  }

  if (!panel) {
    return (
      <Section title="Panel">
        <Hint>
          Select a panel to edit its dimensions, material, and position. Shift+click to select several.
        </Hint>
      </Section>
    )
  }

  const setPosition = (axis: 0 | 1 | 2, value: number) => {
    const position: [number, number, number] = [...panel.position]
    position[axis] = value
    updatePanel(panel.id, { position })
  }

  return (
    <Section
      title="Panel"
      action={
        <div className="flex gap-1.5">
          <Button size="sm" onClick={() => duplicatePanel(panel.id)}>
            Duplicate
          </Button>
          <Button size="sm" variant="danger" onClick={() => removePanel(panel.id)}>
            Delete
          </Button>
        </div>
      }
    >
      <Field label="Name">
        <input
          type="text"
          className={CONTROL}
          value={panel.name}
          onChange={(e) => updatePanel(panel.id, { name: e.target.value })}
        />
      </Field>

      <SelectField
        label="Material"
        value={panel.materialId}
        onChange={(e) => setPanelMaterial(panel.id, e.target.value)}
      >
        {materials.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Orientation"
        value={panel.normal}
        onChange={(e) => updatePanel(panel.id, { normal: e.target.value as Axis })}
      >
        {ORIENTATIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </SelectField>

      <FieldGroup title="Face">
        <MeasurementInput label="Length" value={panel.length} unit={unit} precision={precision} min={1} snap onChange={(v) => updatePanel(panel.id, { length: v })} />
        <MeasurementInput label="Width" value={panel.width} unit={unit} precision={precision} min={1} snap onChange={(v) => updatePanel(panel.id, { width: v })} />
        <MeasurementInput label="Thickness" value={panel.thickness} unit={unit} precision={precision} min={1} snap onChange={(v) => updatePanel(panel.id, { thickness: v })} />
      </FieldGroup>

      <FieldGroup title="Position (centre)">
        <MeasurementInput label="X" value={panel.position[0]} unit={unit} precision={precision} snap onChange={(v) => setPosition(0, v)} />
        <MeasurementInput label="Y" value={panel.position[1]} unit={unit} precision={precision} snap onChange={(v) => setPosition(1, v)} />
        <MeasurementInput label="Z" value={panel.position[2]} unit={unit} precision={precision} snap onChange={(v) => setPosition(2, v)} />
      </FieldGroup>
    </Section>
  )
}
