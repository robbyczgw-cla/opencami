import { useState, useEffect, useCallback } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  PencilEdit01Icon,
  Delete01Icon,
  Add01Icon,
  Cancel01Icon,
  Loading02Icon,
  Alert01Icon,
} from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'

// ─── Types ──────────────────────────────────────────────────────────────

type Agent = {
  id: string
  name: string
  workspace?: string
  model?: string
  emoji?: string
  avatar?: string
  activeSessions?: number
  isDefault?: boolean
}

// ─── API helpers ────────────────────────────────────────────────────────

async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch('/api/agents')
  if (!res.ok) throw new Error('Failed to fetch agents')
  const data = (await res.json()) as { agents?: Agent[] }
  return data.agents ?? []
}

async function agentAction(body: Record<string, unknown>): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch('/api/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return (await res.json()) as { ok?: boolean; error?: string }
}

// ─── Sub-components ─────────────────────────────────────────────────────

function AgentCard({
  agent,
  onEdit,
  onDelete,
}: {
  agent: Agent
  onEdit: () => void
  onDelete: () => void
}) {
  const isMain = agent.isDefault || agent.id === 'main'
  const displayName = agent.name || agent.id.charAt(0).toUpperCase() + agent.id.slice(1)
  // Extract short model name (last segment after /)
  const shortModel = agent.model ? agent.model.split('/').pop() : undefined
  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary-200 bg-surface p-3">
      <div className="relative flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-lg">
        {agent.emoji || '🤖'}
        {isMain && (
          <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-green-500 ring-2 ring-surface" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-primary-900 truncate">{displayName}</span>
          {displayName !== agent.id && (
            <span className="text-xs text-primary-400 font-mono">{agent.id}</span>
          )}
          {isMain && (
            <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
              PRIMARY
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-primary-500 mt-0.5">
          {shortModel && (
            <span className="inline-flex items-center rounded bg-primary-100 px-1.5 py-0.5 font-mono text-[11px] text-primary-600 truncate max-w-[200px]">
              {shortModel}
            </span>
          )}
          {agent.workspace && (
            <span className="truncate font-mono text-primary-400 max-w-[180px]" title={agent.workspace}>
              {agent.workspace}
            </span>
          )}
          {!shortModel && !agent.workspace && (
            <span className="text-primary-300 italic">no config</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="icon-sm" variant="ghost" onClick={onEdit} aria-label="Edit agent">
          <HugeiconsIcon icon={PencilEdit01Icon} size={16} strokeWidth={1.5} />
        </Button>
        {!isMain && (
          <Button size="icon-sm" variant="ghost" onClick={onDelete} aria-label="Delete agent" className="text-red-500 hover:text-red-600">
            <HugeiconsIcon icon={Delete01Icon} size={16} strokeWidth={1.5} />
          </Button>
        )}
      </div>
    </div>
  )
}

function AgentFormModal({
  agent,
  onSave,
  onCancel,
  saving,
}: {
  agent?: Agent
  onSave: (data: { name: string; workspace: string; emoji: string; model: string }) => void
  onCancel: () => void
  saving: boolean
}) {
  const [name, setName] = useState(agent?.name ?? '')
  const [workspace, setWorkspace] = useState(agent?.workspace ?? '')
  const [emoji, setEmoji] = useState(agent?.emoji ?? '')
  const [model, setModel] = useState(agent?.model ?? '')

  const isEdit = !!agent

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="w-[min(420px,90vw)] rounded-xl border border-primary-200 bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-primary-900">{isEdit ? 'Edit Agent' : 'Create Agent'}</h3>
          <Button size="icon-sm" variant="ghost" onClick={onCancel}>
            <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.5} />
          </Button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-primary-600 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-agent"
              className="w-full rounded-md border border-primary-200 bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs text-primary-600 mb-1">Emoji</label>
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="🤖"
              className="w-full rounded-md border border-primary-200 bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs text-primary-600 mb-1">Workspace Path</label>
            <input
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              placeholder="/root/.openclaw/workspace-myagent"
              className="w-full rounded-md border border-primary-200 bg-surface px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {isEdit && (
            <div>
              <label className="block text-xs text-primary-600 mb-1">Model</label>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="anthropic/claude-sonnet-4-20250514"
                className="w-full rounded-md border border-primary-200 bg-surface px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            size="sm"
            onClick={() => onSave({ name, workspace, emoji, model })}
            disabled={!name.trim() || saving}
          >
            {saving ? (
              <HugeiconsIcon icon={Loading02Icon} size={16} className="animate-spin" />
            ) : isEdit ? 'Save' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirmModal({
  agent,
  onConfirm,
  onCancel,
  deleting,
}: {
  agent: Agent
  onConfirm: (deleteFiles: boolean) => void
  onCancel: () => void
  deleting: boolean
}) {
  const [deleteFiles, setDeleteFiles] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="w-[min(380px,90vw)] rounded-xl border border-primary-200 bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <HugeiconsIcon icon={Alert01Icon} size={20} className="text-red-500" />
          <h3 className="text-sm font-medium text-primary-900">Delete Agent</h3>
        </div>
        <p className="text-sm text-primary-600 mb-4">
          Are you sure you want to delete <strong>{agent.name}</strong>? This cannot be undone.
        </p>
        <label className="flex items-center gap-2 text-sm text-primary-700 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={deleteFiles}
            onChange={(e) => setDeleteFiles(e.target.checked)}
            className="rounded border-primary-300"
          />
          Also delete workspace files
        </label>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            size="sm"
            onClick={() => onConfirm(deleteFiles)}
            disabled={deleting}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {deleting ? (
              <HugeiconsIcon icon={Loading02Icon} size={16} className="animate-spin" />
            ) : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Panel ─────────────────────────────────────────────────────────

export function AgentsPanel() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Modal state
  const [showCreate, setShowCreate] = useState(false)
  const [editAgent, setEditAgent] = useState<Agent | null>(null)
  const [deleteAgent, setDeleteAgent] = useState<Agent | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const list = await fetchAgents()
      setAgents(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (data: { name: string; workspace: string; emoji: string; model: string }) => {
    setSaving(true)
    try {
      const res = await agentAction({
        action: 'create',
        name: data.name,
        workspace: data.workspace || undefined,
        emoji: data.emoji || undefined,
      })
      if (res.error) { setError(res.error); return }
      setShowCreate(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (data: { name: string; workspace: string; emoji: string; model: string }) => {
    if (!editAgent) return
    setSaving(true)
    try {
      const res = await agentAction({
        action: 'update',
        agentId: editAgent.id,
        name: data.name || undefined,
        workspace: data.workspace || undefined,
        model: data.model || undefined,
      })
      if (res.error) { setError(res.error); return }
      setEditAgent(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (deleteFiles: boolean) => {
    if (!deleteAgent) return
    setSaving(true)
    try {
      const res = await agentAction({
        action: 'delete',
        agentId: deleteAgent.id,
        deleteFiles,
      })
      if (res.error) { setError(res.error); return }
      setDeleteAgent(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <HugeiconsIcon icon={Loading02Icon} size={20} className="animate-spin text-primary-400" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-primary-500">{agents.length} agent{agents.length !== 1 ? 's' : ''}</div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.5} />
          <span className="ml-1">Create Agent</span>
        </Button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onEdit={() => setEditAgent(agent)}
            onDelete={() => setDeleteAgent(agent)}
          />
        ))}
        {agents.length === 0 && (
          <div className="text-center py-8 text-sm text-primary-400">No agents found</div>
        )}
      </div>

      {showCreate && (
        <AgentFormModal onSave={handleCreate} onCancel={() => setShowCreate(false)} saving={saving} />
      )}
      {editAgent && (
        <AgentFormModal agent={editAgent} onSave={handleEdit} onCancel={() => setEditAgent(null)} saving={saving} />
      )}
      {deleteAgent && (
        <DeleteConfirmModal agent={deleteAgent} onConfirm={handleDelete} onCancel={() => setDeleteAgent(null)} deleting={saving} />
      )}
    </div>
  )
}
