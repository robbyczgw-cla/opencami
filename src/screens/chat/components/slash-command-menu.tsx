import { memo } from 'react'
import { cn } from '@/lib/utils'

export type SlashCommand = {
  command: string
  description: string
}

type SlashCommandMenuProps = {
  commands: Array<SlashCommand>
  selectedIndex: number
  onSelect: (command: SlashCommand) => void
  className?: string
}

function SlashCommandMenuComponent({
  commands,
  selectedIndex,
  onSelect,
  className,
}: SlashCommandMenuProps) {
  if (commands.length === 0) return null

  return (
    <div
      className={cn(
        'absolute left-2 right-2 md:left-5 md:right-5 bottom-full mb-2 z-20 rounded-xl border border-white/10 bg-neutral-900/95 shadow-2xl backdrop-blur-sm overflow-hidden',
        className,
      )}
      role="listbox"
      aria-label="Slash commands"
    >
      <div className="max-h-56 overflow-y-auto p-1">
        {commands.map((item, index) => {
          const active = index === selectedIndex
          return (
            <button
              key={item.command}
              type="button"
              role="option"
              aria-selected={active}
              onMouseDown={(event) => {
                event.preventDefault()
                onSelect(item)
              }}
              className={cn(
                'w-full rounded-md px-3 py-2 text-left transition-colors',
                active ? 'bg-neutral-800' : 'hover:bg-neutral-800/80',
              )}
            >
              <div className="flex items-start gap-3">
                <code className="min-w-[90px] font-mono text-xs text-primary-300">{item.command}</code>
                <span className="text-xs text-neutral-300">{item.description}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const SlashCommandMenu = memo(SlashCommandMenuComponent)
