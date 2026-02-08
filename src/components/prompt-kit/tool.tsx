'use client'

import {
  Collapsible,
  CollapsibleTrigger,
  CollapsiblePanel,
} from '@/components/ui/collapsible'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  Tick01Icon,
  Cancel01Icon,
  Loading03Icon,
} from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'

export type ToolPart = {
  type: string
  state:
    | 'input-streaming'
    | 'input-available'
    | 'output-available'
    | 'output-error'
  input?: Record<string, unknown>
  output?: unknown
  toolCallId?: string
  errorText?: string
}

export type ToolProps = {
  toolPart: ToolPart
  defaultOpen?: boolean
}

function Tool({ toolPart, defaultOpen = false }: ToolProps) {
  const { state, input, output, toolCallId } = toolPart

  const serialize = (value: unknown, maxLength = 3200): string => {
    const normalized = value === undefined ? 'undefined' : value
    let raw: string
    if (typeof normalized === 'string') {
      try {
        raw = JSON.stringify(JSON.parse(normalized), null, 2)
      } catch {
        raw = normalized
      }
    } else {
      raw = JSON.stringify(normalized, null, 2)
    }
    if (raw.length <= maxLength) return raw
    return `${raw.slice(0, maxLength).trimEnd()}\n…[truncated]`
  }

  const statusIcon =
    state === 'output-error'
      ? Cancel01Icon
      : state === 'output-available'
        ? Tick01Icon
        : Loading03Icon

  const statusClassName =
    state === 'output-error'
      ? 'text-red-600/80'
      : state === 'output-available'
        ? 'text-green-600/80'
        : 'text-primary-500/80'

  return (
    <div className="inline-flex flex-col w-full">
      <Collapsible defaultOpen={defaultOpen}>
        <CollapsibleTrigger
          render={
            <Button
              variant="ghost"
              className="h-auto w-full justify-start gap-1.5 rounded-md px-1.5 py-1"
            />
          }
        >
          <HugeiconsIcon
            icon={statusIcon}
            size={12}
            strokeWidth={1.7}
            className={statusClassName}
          />
          <span className="text-sm font-medium text-primary-900">{toolPart.type}</span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={14}
            strokeWidth={1.5}
            className="ml-auto text-primary-700/80 transition-transform duration-150 group-data-panel-open:rotate-180"
          />
        </CollapsibleTrigger>
        <CollapsiblePanel className="mt-1">
          <div className="space-y-2 rounded-md border border-primary-200 bg-primary-100/70 p-2">
            <div className="rounded border border-primary-200 bg-primary-50 px-2 py-1.5">
              <div className="text-[11px] font-medium text-primary-600">Tool</div>
              <div className="font-mono text-xs text-primary-800 break-all">{toolPart.type}</div>
            </div>

            {input && Object.keys(input).length > 0 && (
              <div className="rounded border border-primary-200 bg-primary-50 px-2 py-1.5">
                <h4 className="mb-1 text-[11px] font-medium text-primary-600">Input</h4>
                <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-primary-800">
                  {serialize(input)}
                </pre>
              </div>
            )}

            {output !== undefined && output !== null && (
              <div className="rounded border border-primary-200 bg-primary-50 px-2 py-1.5">
                <h4 className="mb-1 text-[11px] font-medium text-primary-600">Output</h4>
                <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-primary-800">
                  {serialize(output)}
                </pre>
              </div>
            )}

            {state === 'output-error' && toolPart.errorText && (
              <div className="rounded border border-red-200 bg-red-50 px-2 py-1.5">
                <h4 className="mb-1 text-[11px] font-medium text-red-600">Error</h4>
                <div className="text-xs text-red-700">{toolPart.errorText}</div>
              </div>
            )}

            {toolCallId && (
              <div className="text-[11px] text-primary-500/80 font-mono tabular-nums">
                ID: {toolCallId.slice(0, 16)}...
              </div>
            )}
          </div>
        </CollapsiblePanel>
      </Collapsible>
    </div>
  )
}

export { Tool }
