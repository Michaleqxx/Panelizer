import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes } from 'react'
import { cx } from './cx'

/** Shared input/select chrome, so a raw `<input>` and a `<select>` match. */
export const CONTROL =
  'w-full rounded border border-edge bg-bg px-2 py-1 text-ink ' +
  'focus:border-accent focus:outline-none disabled:opacity-40'

/**
 * A labelled form row: label on the left, control on the right, with an
 * optional trailing unit suffix. This is the layout every settings field in the
 * app uses, and it was previously hand-written in four places.
 */
export function Field({
  label,
  suffix,
  children,
  className,
}: {
  label: ReactNode
  suffix?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cx('flex items-center justify-between gap-2 py-1', className)}>
      <span className="shrink-0 text-ink-dim">{label}</span>
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        {children}
        {suffix && <span className="shrink-0 text-xs text-ink-dim">{suffix}</span>}
      </span>
    </label>
  )
}

/** A `<select>` wearing the shared control chrome, in a Field row. */
export function SelectField({
  label,
  className,
  children,
  ...rest
}: { label: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label}>
      <select className={cx(CONTROL, className)} {...rest}>
        {children}
      </select>
    </Field>
  )
}

/** A plain `<input>` wearing the shared control chrome, in a Field row. */
export function InputField({
  label,
  suffix,
  className,
  ...rest
}: { label: ReactNode; suffix?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} suffix={suffix}>
      <input className={cx(CONTROL, className)} {...rest} />
    </Field>
  )
}
