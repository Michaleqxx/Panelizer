import { useTooltip } from './useTooltip'

/**
 * A part group's name(s), kept to one line.
 *
 * A group is usually all one name ("Side"), but differently-named panels can
 * share a size — rather than letting "Side, Side copy, Side copy 2…" push the
 * dimensions off the row, only the first name is shown and the rest collapse
 * into a `+n` chip that names them on hover.
 *
 * Shared by the parts list and the cutlist's grain editor so the two tables
 * behave identically.
 */
export function PartNames({ names, className }: { names: string[]; className?: string }) {
  const distinct = [...new Set(names)]
  const [first, ...rest] = distinct
  const tip = useTooltip(distinct.join(', '))

  return (
    <span className={className ?? 'flex min-w-0 items-center gap-1'}>
      <span className="truncate">{first}</span>
      {rest.length > 0 && (
        <span
          className="text-micro shrink-0 cursor-help rounded-full bg-surface-3 px-1.5 py-px text-ink-dim"
          {...tip.trigger}
        >
          +{rest.length}
          {tip.node}
        </span>
      )}
    </span>
  )
}
