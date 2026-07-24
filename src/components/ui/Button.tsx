import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

type Variant = 'default' | 'primary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded border font-inherit cursor-pointer ' +
  'transition-colors disabled:opacity-40 disabled:cursor-not-allowed ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent'

const VARIANTS: Record<Variant, string> = {
  default:
    'bg-surface-2 border-edge text-ink enabled:hover:bg-surface-3 enabled:hover:border-edge-strong',
  primary: 'bg-accent border-accent text-white enabled:hover:bg-accent-hover',
  // Ghost carries no chrome until hovered — for icon buttons sitting inside
  // dense rows, where a full button outline would be visual noise.
  ghost:
    'bg-transparent border-transparent text-ink-dim enabled:hover:bg-surface-2 enabled:hover:text-ink',
  danger: 'bg-transparent border-transparent text-ink-dim enabled:hover:bg-danger enabled:hover:text-white',
}

const SIZES: Record<Size, string> = {
  sm: 'text-xs px-2 py-1',
  md: 'px-3 py-1.5',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  /** Render as a square icon-only button (equal padding, no text metrics). */
  icon?: boolean
  children?: ReactNode
}

export function Button({
  variant = 'default',
  size = 'md',
  icon = false,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(BASE, VARIANTS[variant], icon ? 'p-1.5' : SIZES[size], className)}
      {...rest}
    />
  )
}
