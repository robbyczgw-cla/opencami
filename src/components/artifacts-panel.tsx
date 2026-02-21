import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, LinkSquare02Icon } from '@hugeicons/core-free-icons'
import { useArtifactsStore } from '@/hooks/use-artifacts'
import { Button } from '@/components/ui/button'

export function ArtifactsPanel() {
  const { content, type, closePanel } = useArtifactsStore()

  function openInNewTab() {
    if (!content) return
    const blob = new Blob([content], { type: type === 'svg' ? 'image/svg+xml' : 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex flex-col h-full border-l border-primary-200 bg-surface min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-primary-200 shrink-0">
        <span className="text-sm font-medium text-primary-900">Artifacts Preview</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={openInNewTab}
            aria-label="Open in new tab"
            className="h-7 px-2 text-xs text-primary-600 hover:text-primary-900"
          >
            <HugeiconsIcon icon={LinkSquare02Icon} size={14} strokeWidth={1.8} />
            New tab
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={closePanel}
            aria-label="Close artifacts panel"
            className="h-7 w-7 p-0 text-primary-500 hover:text-primary-900"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.8} />
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {!content ? (
          <div className="flex items-center justify-center h-full text-sm text-primary-500">
            No artifact to preview
          </div>
        ) : type === 'svg' ? (
          <div
            className="w-full h-full overflow-auto p-4 flex items-center justify-center"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG preview from AI-generated code, sandboxed display only
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <iframe
            sandbox="allow-scripts allow-same-origin"
            srcDoc={content}
            className="w-full h-full border-0"
            title="Artifacts Preview"
          />
        )}
      </div>
    </div>
  )
}
