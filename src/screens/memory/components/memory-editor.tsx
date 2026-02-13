import { useEffect, useState } from 'react'
import { Markdown } from '@/components/prompt-kit/markdown'
import { Button } from '@/components/ui/button'

type MemoryEditorProps = {
  filePath: string
  content: string
  isLoading?: boolean
  onSave: (content: string) => Promise<void>
  onBack?: () => void
}

export function MemoryEditor({ filePath, content, isLoading, onSave, onBack }: MemoryEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(content)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(content)
    setIsEditing(false)
  }, [filePath, content])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(draft)
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flex-1 min-h-0 flex flex-col">
      <header className="border-b border-primary-100 px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {onBack ? (
            <Button size="sm" variant="ghost" onClick={onBack}>
              Back
            </Button>
          ) : null}
          <h1 className="text-sm font-semibold text-primary-800 truncate">{filePath}</h1>
        </div>
        {!isLoading && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-auto p-4">
        {isLoading ? (
          <div className="text-sm text-primary-500">Loading content…</div>
        ) : isEditing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full min-h-[60vh] rounded-md border border-primary-200 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        ) : (
          <Markdown className="prose prose-invert max-w-none">{content || '_Empty file_'}</Markdown>
        )}
      </div>
    </section>
  )
}
