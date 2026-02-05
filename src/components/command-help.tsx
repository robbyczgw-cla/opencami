'use client'

import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { CommandIcon, Cancel01Icon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Command = {
  command: string
  description: string
  usage?: string
}

const COMMANDS: Command[] = [
  // Session
  { command: '/new', description: 'Start a new conversation', usage: '/new' },
  { command: '/reset', description: 'Reset conversation context', usage: '/reset' },
  { command: '/abort', description: 'Abort current generation', usage: '/abort' },
  
  // Status & Info
  { command: '/status', description: 'Show session status card', usage: '/status' },
  { command: '/usage', description: 'Show token usage', usage: '/usage [off|tokens|full]' },
  { command: '/models', description: 'List available models', usage: '/models' },
  { command: '/agents', description: 'List available agents', usage: '/agents' },
  { command: '/sessions', description: 'List active sessions', usage: '/sessions' },
  
  // Model & Thinking
  { command: '/model', description: 'Switch model for this session', usage: '/model <alias>' },
  { command: '/reasoning', description: 'Toggle reasoning mode', usage: '/reasoning [on|off|stream]' },
  { command: '/think', description: 'Set thinking budget', usage: '/think [off|minimal|low|medium|high]' },
  
  // Output
  { command: '/verbose', description: 'Toggle verbose output', usage: '/verbose [on|full|off]' },
  { command: '/tts', description: 'Text-to-speech controls', usage: '/tts [status|off|always]' },
  
  // Advanced
  { command: '/settings', description: 'Show current settings', usage: '/settings' },
  { command: '/help', description: 'Show help', usage: '/help' },
]

type CommandHelpProps = {
  className?: string
  onCommandSelect?: (command: string) => void
}

export function CommandHelp({ className, onCommandSelect }: CommandHelpProps) {
  const [isOpen, setIsOpen] = useState(false)

  function handleCommandClick(command: string) {
    onCommandSelect?.(command)
    setIsOpen(false)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={cn('h-7 w-7 p-0', className)}
        title="Show commands (Ctrl+/)"
      >
        <HugeiconsIcon icon={CommandIcon} size={16} className="text-primary-500" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 border border-primary-200 dark:border-neutral-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-primary-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={CommandIcon} size={18} className="text-primary-600 dark:text-primary-400" />
                <h2 className="font-semibold text-primary-900 dark:text-white">Slash Commands</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 p-0"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
              </Button>
            </div>

            {/* Commands List */}
            <div className="overflow-y-auto max-h-[60vh] p-2 bg-white dark:bg-neutral-900">
              <div className="text-xs text-primary-500 dark:text-neutral-400 px-2 py-1 mb-2">
                Type these commands in the chat input
              </div>
              
              {COMMANDS.map((cmd) => (
                <button
                  key={cmd.command}
                  onClick={() => handleCommandClick(cmd.command)}
                  className="w-full flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-primary-100 dark:hover:bg-neutral-800 transition-colors text-left"
                >
                  <code className="text-sm font-mono font-medium text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded min-w-[80px]">
                    {cmd.command}
                  </code>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-primary-900 dark:text-neutral-100">{cmd.description}</div>
                    {cmd.usage && cmd.usage !== cmd.command && (
                      <div className="text-xs text-primary-500 dark:text-neutral-500 font-mono mt-0.5">
                        {cmd.usage}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-primary-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
              <div className="text-xs text-primary-500 dark:text-neutral-400">
                Press <kbd className="px-1 py-0.5 bg-primary-200 dark:bg-neutral-700 rounded text-primary-700 dark:text-neutral-300">Esc</kbd> to close
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
