import { useEffect, useState } from 'react'
import {
  DialogRoot,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from './ui/dialog'
import { Button } from './ui/button'

type KeyboardShortcutsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Shortcut = {
  keys: string[]
  description: string
}

const isMac =
  typeof navigator !== 'undefined' &&
  navigator.platform.toUpperCase().indexOf('MAC') >= 0

const shortcuts: Shortcut[] = [
  {
    keys: [isMac ? '⌘' : 'Ctrl', 'K'],
    description: 'Start a new chat',
  },
  {
    keys: [isMac ? '⌘' : 'Ctrl', '/'],
    description: 'Focus message input',
  },
  {
    keys: ['Esc'],
    description: 'Close dialogs / Clear focus',
  },
  {
    keys: [isMac ? '⌘' : 'Ctrl', 'Shift', 'C'],
    description: 'Copy last response',
  },
  {
    keys: ['?'],
    description: 'Show this help dialog',
  },
]

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(500px,92vw)]">
        <div className="p-6">
          <DialogTitle className="mb-2">Keyboard Shortcuts</DialogTitle>
          <DialogDescription className="mb-6">
            Speed up your workflow with these keyboard shortcuts
          </DialogDescription>

          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-primary-100 last:border-0"
              >
                <span className="text-sm text-primary-700">
                  {shortcut.description}
                </span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, keyIndex) => (
                    <span key={keyIndex} className="inline-flex items-center">
                      <kbd className="px-2 py-1 text-xs font-semibold text-primary-800 bg-primary-100 border border-primary-200 rounded">
                        {key}
                      </kbd>
                      {keyIndex < shortcut.keys.length - 1 && (
                        <span className="mx-1 text-primary-400">+</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <DialogClose>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </DialogRoot>
  )
}
