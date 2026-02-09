import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  ArrowLeft01Icon,
  Cancel01Icon,
  Delete01Icon,
  Loading02Icon,
  PencilEdit01Icon,
  Alert01Icon,
  SidebarLeft01Icon,
} from '@hugeicons/core-free-icons'
import { AnimatePresence, motion } from 'motion/react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Link } from '@tanstack/react-router'
import {
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { chatUiQueryKey, getChatUiState, setChatUiState } from '../chat/chat-ui'
import { OpenCamiLogo, OpenCamiText } from '@/components/icons/opencami-logo'

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
  sandbox?: boolean
  tools?: string[]
  deniedTools?: string[]
  channelBindings?: string[]
  sessionScope?: 'per-sender' | 'global'
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

// ─── Agent Card ─────────────────────────────────────────────────────────

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
  const shortModel = agent.model ? agent.model.split('/').pop() : undefined

  return (
    <div className="rounded-xl border border-primary-200 bg-surface p-4 hover:border-primary-300 transition-colors">
      <div className="flex items-start gap-4">
        <div className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-xl">
          {agent.emoji || '🤖'}
          {isMain && (
            <span className="absolute -top-1 -right-1 size-3 rounded-full bg-green-500 ring-2 ring-surface" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-primary-900 truncate">{displayName}</span>
            {displayName !== agent.id && (
              <span className="text-xs text-primary-400 font-mono">{agent.id}</span>
            )}
            {isMain && (
              <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                PRIMARY
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-primary-500 mb-2">
            {shortModel && (
              <span className="inline-flex items-center rounded-md bg-primary-100 px-2 py-0.5 font-mono text-[11px] text-primary-600 truncate max-w-[250px]">
                {shortModel}
              </span>
            )}
            {agent.sandbox !== undefined && (
              <span className={cn(
                'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium',
                agent.sandbox
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-primary-100 text-primary-500'
              )}>
                {agent.sandbox ? '🔒 Sandbox' : '🔓 No sandbox'}
              </span>
            )}
            {agent.sessionScope && (
              <span className="inline-flex items-center rounded-md bg-primary-100 px-2 py-0.5 text-[11px] text-primary-500">
                {agent.sessionScope === 'per-sender' ? '👤 Per-sender' : '🌐 Global'}
              </span>
            )}
          </div>

          {/* Tools */}
          {agent.tools && agent.tools.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {agent.tools.slice(0, 8).map((tool) => (
                <span key={tool} className="inline-flex items-center rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-mono text-blue-600 dark:text-blue-400">
                  {tool}
                </span>
              ))}
              {agent.tools.length > 8 && (
                <span className="text-[10px] text-primary-400">+{agent.tools.length - 8} more</span>
              )}
            </div>
          )}

          {/* Channel bindings */}
          {agent.channelBindings && agent.channelBindings.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {agent.channelBindings.map((ch) => (
                <span key={ch} className="inline-flex items-center rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-600 dark:text-purple-400">
                  #{ch}
                </span>
              ))}
            </div>
          )}

          {agent.workspace && (
            <div className="text-[11px] font-mono text-primary-400 truncate" title={agent.workspace}>
              {agent.workspace}
            </div>
          )}

          {agent.activeSessions !== undefined && agent.activeSessions > 0 && (
            <div className="text-[11px] text-primary-400 mt-1">
              {agent.activeSessions} active session{agent.activeSessions !== 1 ? 's' : ''}
            </div>
          )}
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
    </div>
  )
}

// ─── Tag Input ──────────────────────────────────────────────────────────

function TagInput({
  label,
  placeholder,
  values,
  onChange,
}: {
  label: string
  placeholder: string
  values: string[]
  onChange: (values: string[]) => void
}) {
  const [input, setInput] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      if (!values.includes(input.trim())) {
        onChange([...values, input.trim()])
      }
      setInput('')
    }
    if (e.key === 'Backspace' && !input && values.length > 0) {
      onChange(values.slice(0, -1))
    }
  }

  return (
    <div>
      <label className="block text-xs text-primary-600 mb-1">{label}</label>
      <div className="flex flex-wrap gap-1 p-2 rounded-md border border-primary-200 bg-surface min-h-[36px]">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded bg-primary-100 px-2 py-0.5 text-xs text-primary-700">
            {v}
            <button onClick={() => onChange(values.filter((x) => x !== v))} className="text-primary-400 hover:text-primary-600">
              ×
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={values.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] bg-transparent text-sm outline-none"
        />
      </div>
    </div>
  )
}

// ─── Agent Form ─────────────────────────────────────────────────────────

function AgentForm({
  agent,
  onSave,
  onCancel,
  saving,
}: {
  agent?: Agent
  onSave: (data: {
    name: string
    workspace: string
    emoji: string
    model: string
    avatar: string
    sandbox: boolean
    tools: string[]
    deniedTools: string[]
    channelBindings: string[]
    sessionScope: 'per-sender' | 'global'
  }) => void
  onCancel: () => void
  saving: boolean
}) {
  const [name, setName] = useState(agent?.name ?? '')
  const [workspace, setWorkspace] = useState(agent?.workspace ?? '')
  const [emoji, setEmoji] = useState(agent?.emoji ?? '')
  const [avatar, setAvatar] = useState(agent?.avatar ?? '')
  const [model, setModel] = useState(agent?.model ?? '')
  const [sandbox, setSandbox] = useState(agent?.sandbox ?? false)
  const [tools, setTools] = useState<string[]>(agent?.tools ?? [])
  const [deniedTools, setDeniedTools] = useState<string[]>(agent?.deniedTools ?? [])
  const [channelBindings, setChannelBindings] = useState<string[]>(agent?.channelBindings ?? [])
  const [sessionScope, setSessionScope] = useState<'per-sender' | 'global'>(agent?.sessionScope ?? 'per-sender')

  const isEdit = !!agent

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-primary-900">{isEdit ? 'Edit Agent' : 'Create Agent'}</h2>
        <Button size="icon-sm" variant="ghost" onClick={onCancel}>
          <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.5} />
        </Button>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-xl border border-primary-200 bg-surface p-4">
          <h3 className="text-xs font-medium text-primary-500 uppercase tracking-wider mb-3">Basic Info</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
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
            <div className="col-span-2">
              <label className="block text-xs text-primary-600 mb-1">Avatar URL</label>
              <input
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-md border border-primary-200 bg-surface px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Model & Config */}
        <div className="rounded-xl border border-primary-200 bg-surface p-4">
          <h3 className="text-xs font-medium text-primary-500 uppercase tracking-wider mb-3">Model & Config</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-primary-600 mb-1">Model</label>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="anthropic/claude-sonnet-4-20250514"
                className="w-full rounded-md border border-primary-200 bg-surface px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-primary-800">Sandbox Mode</div>
                <div className="text-xs text-primary-500">Run agent in isolated sandbox</div>
              </div>
              <Switch checked={sandbox} onCheckedChange={setSandbox} />
            </div>
            <div>
              <label className="block text-xs text-primary-600 mb-1">Session Scope</label>
              <select
                value={sessionScope}
                onChange={(e) => setSessionScope(e.target.value as 'per-sender' | 'global')}
                className="w-full rounded-md border border-primary-200 bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="per-sender">Per-sender</option>
                <option value="global">Global</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tools */}
        <div className="rounded-xl border border-primary-200 bg-surface p-4">
          <h3 className="text-xs font-medium text-primary-500 uppercase tracking-wider mb-3">Tools</h3>
          <div className="space-y-3">
            <TagInput
              label="Allowed Tools"
              placeholder="Type tool name and press Enter"
              values={tools}
              onChange={setTools}
            />
            <TagInput
              label="Denied Tools"
              placeholder="Type tool name and press Enter"
              values={deniedTools}
              onChange={setDeniedTools}
            />
          </div>
        </div>

        {/* Channel Bindings */}
        <div className="rounded-xl border border-primary-200 bg-surface p-4">
          <h3 className="text-xs font-medium text-primary-500 uppercase tracking-wider mb-3">Channel Bindings</h3>
          <TagInput
            label="Bound Channels"
            placeholder="Type channel name and press Enter"
            values={channelBindings}
            onChange={setChannelBindings}
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          size="sm"
          onClick={() => onSave({ name, workspace, emoji, model, avatar, sandbox, tools, deniedTools, channelBindings, sessionScope })}
          disabled={!name.trim() || saving}
        >
          {saving ? (
            <HugeiconsIcon icon={Loading02Icon} size={16} className="animate-spin" />
          ) : isEdit ? 'Save Changes' : 'Create Agent'}
        </Button>
      </div>
    </div>
  )
}

// ─── Delete Confirm ─────────────────────────────────────────────────────

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

// ─── Main Screen ────────────────────────────────────────────────────────

export function AgentsScreen() {
  const queryClient = useQueryClient()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [view, setView] = useState<'list' | 'create' | 'edit'>('list')
  const [editAgent, setEditAgent] = useState<Agent | null>(null)
  const [deleteAgent, setDeleteAgent] = useState<Agent | null>(null)

  const uiQuery = useQuery({
    queryKey: chatUiQueryKey,
    queryFn: function readUiState() {
      return getChatUiState(queryClient)
    },
    initialData: function initialUiState() {
      return getChatUiState(queryClient)
    },
    staleTime: Infinity,
  })

  const isSidebarCollapsed = uiQuery.data?.isSidebarCollapsed ?? false

  const handleToggleSidebarCollapse = useCallback(() => {
    setChatUiState(queryClient, function toggle(state) {
      return { ...state, isSidebarCollapsed: !state.isSidebarCollapsed }
    })
  }, [queryClient])

  const transition = useMemo(() => ({
    duration: 0.15,
    ease: isSidebarCollapsed ? 'easeIn' as const : 'easeOut' as const,
  }), [isSidebarCollapsed])

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

  useEffect(() => { void load() }, [load])

  const handleCreate = async (data: {
    name: string; workspace: string; emoji: string; model: string; avatar: string
    sandbox: boolean; tools: string[]; deniedTools: string[]; channelBindings: string[]; sessionScope: string
  }) => {
    setSaving(true)
    try {
      const res = await agentAction({
        action: 'create',
        name: data.name,
        workspace: data.workspace || undefined,
        emoji: data.emoji || undefined,
        avatar: data.avatar || undefined,
      })
      if (res.error) { setError(res.error); return }
      setView('list')
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (data: {
    name: string; workspace: string; emoji: string; model: string; avatar: string
    sandbox: boolean; tools: string[]; deniedTools: string[]; channelBindings: string[]; sessionScope: string
  }) => {
    if (!editAgent) return
    setSaving(true)
    try {
      const res = await agentAction({
        action: 'update',
        agentId: editAgent.id,
        name: data.name || undefined,
        workspace: data.workspace || undefined,
        model: data.model || undefined,
        avatar: data.avatar || undefined,
      })
      if (res.error) { setError(res.error); return }
      setEditAgent(null)
      setView('list')
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

  // Minimal sidebar (same pattern as files)
  const sidebar = (
    <motion.aside
      initial={false}
      animate={{ width: isSidebarCollapsed ? 48 : 300 }}
      transition={transition}
      className="border-r border-primary-200 h-full overflow-hidden bg-primary-100 flex flex-col"
    >
      <motion.div
        layout
        transition={{ layout: transition }}
        className="flex items-center h-12 px-2 justify-between"
      >
        <AnimatePresence initial={false}>
          {!isSidebarCollapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
            >
              <Link
                to="/new"
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  'w-full pl-1.5 justify-start',
                )}
              >
                <OpenCamiLogo className="size-5" />
                <OpenCamiText />
              </Link>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <TooltipProvider>
          <TooltipRoot>
            <TooltipTrigger
              onClick={handleToggleSidebarCollapse}
              render={
                <Button size="icon-sm" variant="ghost">
                  <HugeiconsIcon icon={SidebarLeft01Icon} size={20} strokeWidth={1.5} />
                </Button>
              }
            />
            <TooltipContent side="right">
              {isSidebarCollapsed ? 'Open Sidebar' : 'Close Sidebar'}
            </TooltipContent>
          </TooltipRoot>
        </TooltipProvider>
      </motion.div>

      <div className="px-2 mb-4">
        <Link
          to="/"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            'w-full pl-1.5 justify-start',
          )}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={1.5} className="min-w-5" />
          <AnimatePresence initial={false} mode="wait">
            {!isSidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={transition}
                className="overflow-hidden whitespace-nowrap"
              >
                Back to Chat
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>
    </motion.aside>
  )

  return (
    <div className="h-screen bg-surface text-primary-900">
      <div className="h-full overflow-hidden grid grid-cols-[auto_1fr]">
        {sidebar}

        <main aria-label="Agent manager" className="flex flex-col h-full min-h-0">
          <header className="border-b border-primary-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-primary-900">Agents</h1>
                <p className="text-xs text-primary-500 mt-0.5">
                  {agents.length} agent{agents.length !== 1 ? 's' : ''} configured
                </p>
              </div>
              {view === 'list' && (
                <Button size="sm" onClick={() => { setEditAgent(null); setView('create') }}>
                  <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.5} />
                  <span className="ml-1">Create Agent</span>
                </Button>
              )}
            </div>
          </header>

          <div className="flex-1 min-h-0 overflow-auto p-6">
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <HugeiconsIcon icon={Loading02Icon} size={24} className="animate-spin text-primary-400" />
              </div>
            ) : view === 'list' ? (
              <div className="max-w-3xl mx-auto space-y-3">
                {agents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onEdit={() => { setEditAgent(agent); setView('edit') }}
                    onDelete={() => setDeleteAgent(agent)}
                  />
                ))}
                {agents.length === 0 && (
                  <div className="text-center py-16 text-sm text-primary-400">
                    No agents found. Create one to get started.
                  </div>
                )}
              </div>
            ) : view === 'create' ? (
              <AgentForm
                onSave={handleCreate}
                onCancel={() => setView('list')}
                saving={saving}
              />
            ) : view === 'edit' && editAgent ? (
              <AgentForm
                agent={editAgent}
                onSave={handleEdit}
                onCancel={() => { setEditAgent(null); setView('list') }}
                saving={saving}
              />
            ) : null}
          </div>

          {deleteAgent && (
            <DeleteConfirmModal
              agent={deleteAgent}
              onConfirm={handleDelete}
              onCancel={() => setDeleteAgent(null)}
              deleting={saving}
            />
          )}
        </main>
      </div>
    </div>
  )
}
