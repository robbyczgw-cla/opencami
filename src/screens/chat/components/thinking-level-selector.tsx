import { HugeiconsIcon } from '@hugeicons/react'
import { AiBrain01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { MenuRoot, MenuTrigger, MenuContent, MenuItem } from '@/components/ui/menu'
import { cn } from '@/lib/utils'
import { useThinkingLevel, type ThinkingLevel } from '@/hooks/use-thinking-level'

type ThinkingOption = {
  value: ThinkingLevel
  label: string
  description: string
  shortLabel: string
}

const THINKING_OPTIONS: Array<ThinkingOption> = [
  { value: 'off', label: 'Off', description: 'No reasoning', shortLabel: 'Off' },
  { value: 'low', label: 'Low', description: 'Think', shortLabel: 'Low' },
  { value: 'medium', label: 'Medium', description: 'Think harder', shortLabel: 'Medium' },
  { value: 'high', label: 'High', description: 'Ultrathink', shortLabel: 'High' },
]

type ThinkingLevelSelectorProps = {
  className?: string
}

export function ThinkingLevelSelector({ className }: ThinkingLevelSelectorProps) {
  const { level, setLevel } = useThinkingLevel()
  const current = THINKING_OPTIONS.find((option) => option.value === level) ?? THINKING_OPTIONS[1]

  return (
    <MenuRoot>
      <MenuTrigger
        className={cn(
          'inline-flex h-7 items-center gap-2 rounded-md px-2 text-xs font-[450] text-primary-600 hover:text-primary-900 hover:bg-primary-100',
          className,
        )}
      >
        <HugeiconsIcon
          icon={AiBrain01Icon}
          size={20}
          strokeWidth={1.5}
          className={cn(level === 'off' ? 'text-primary-400' : 'text-primary-700')}
        />
        <span className="text-pretty">{current.shortLabel}</span>
      </MenuTrigger>
      <MenuContent side="top" align="start" className="min-w-[190px]">
        {THINKING_OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => setLevel(option.value)}
            className="justify-between"
          >
            <span className="flex flex-col text-pretty">
              <span className="text-sm text-primary-900">{option.label}</span>
              <span className="text-xs text-primary-500">{option.description}</span>
            </span>
            {level === option.value && (
              <HugeiconsIcon
                icon={Tick02Icon}
                size={20}
                strokeWidth={1.5}
                className="text-primary-600"
              />
            )}
          </MenuItem>
        ))}
      </MenuContent>
    </MenuRoot>
  )
}
