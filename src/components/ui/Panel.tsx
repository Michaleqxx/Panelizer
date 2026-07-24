import type { ReactNode } from 'react'
import { cx } from './cx'

/**
 * A titled group of controls in a sidebar, with an optional action in the
 * header (a "+ Add" button, typically). Used by every settings block.
 */
export function Section({
  title,
  action,
  children,
  className,
}: {
  title: ReactNode
  action?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <section className={cx('border-b border-edge px-3 py-2.5', className)}>
      <header className="mb-1.5 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-ink-dim uppercase">{title}</h3>
        {action}
      </header>
      {children}
    </section>
  )
}

/** Muted explanatory text — empty states and inline guidance. */
export function Hint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('m-0 py-1 text-xs leading-relaxed text-ink-dim', className)}>{children}</p>
}

/** A material's colour chip, shown beside its name everywhere it appears. */
export function Swatch({ color }: { color?: string }) {
  return (
    <span
      data-swatch
      className="inline-block size-3 shrink-0 rounded-xs border border-black/30 align-middle"
      style={{ background: color }}
    />
  )
}
