import { useState, useEffect } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Cancel01Icon,
  ComputerIcon,
  Moon01Icon,
  Sun01Icon,
  Leaf01Icon,
  Tick01Icon,
  Cancel02Icon,
  Loading02Icon,
} from '@hugeicons/core-free-icons'
import type { PathsPayload } from '../types'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTab } from '@/components/ui/tabs'
import { useChatSettings } from '@/hooks/use-chat-settings'
import type { ThemeMode } from '@/hooks/use-chat-settings'
import { Button } from '@/components/ui/button'
import { useLlmSettings } from '@/hooks/use-llm-settings'

type SettingsSectionProps = {
  title: string
  children: React.ReactNode
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div className="border-b border-primary-200 py-4 last:border-0">
      <h3 className="mb-3 text-sm font-medium text-primary-900">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

type SettingsRowProps = {
  label: string
  description?: string
  children: React.ReactNode
}

function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1 select-none">
        <div className="text-sm text-primary-800">{label}</div>
        {description && (
          <div className="text-xs text-primary-500">{description}</div>
        )}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  pathsLoading: boolean
  pathsError: string | null
  paths: PathsPayload | null
  onClose: () => void
  onCopySessionsDir: () => void
  onCopyStorePath: () => void
}

const textSizeOptions = [
  { value: '14px', label: 'Small' },
  { value: '16px', label: 'Medium' },
  { value: '18px', label: 'Large' },
  { value: '20px', label: 'Extra Large' },
] as const

type TextSizeValue = (typeof textSizeOptions)[number]['value']

function isTextSizeValue(value: string): value is TextSizeValue {
  return textSizeOptions.some((option) => option.value === value)
}

export function SettingsDialog({
  open,
  onOpenChange,
  onClose,
}: SettingsDialogProps) {
  const { settings, updateSettings } = useChatSettings()
  const {
    settings: llmSettings,
    updateSettings: updateLlmSettings,
    status: llmStatus,
    testApiKey,
  } = useLlmSettings()

  const [apiKeyInput, setApiKeyInput] = useState(llmSettings.openaiApiKey)
  const [testingKey, setTestingKey] = useState(false)
  const [testResult, setTestResult] = useState<{ valid: boolean; error?: string } | null>(null)

  const [textSize, setTextSize] = useState<TextSizeValue>(() => {
    if (typeof window === 'undefined') return '16px'
    try {
      const stored = localStorage.getItem('opencami-text-size')
      if (stored && isTextSizeValue(stored)) return stored
    } catch {
      // ignore storage errors
    }
    return '16px'
  })

  // TTS state
  const [ttsEnabled, setTtsEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      const stored = localStorage.getItem('opencami-tts-enabled')
      return stored === null ? true : stored === 'true'
    } catch {
      return true
    }
  })

  function applyTextSize(value: TextSizeValue) {
    if (typeof document === 'undefined') return
    document.documentElement.style.setProperty('--opencami-text-size', value)
  }

  const handleTextSizeChange = (value: string) => {
    if (!isTextSizeValue(value)) return
    setTextSize(value)
    applyTextSize(value)
    try {
      localStorage.setItem('opencami-text-size', value)
    } catch {
      // ignore storage errors
    }
  }

  const handleTtsToggle = (checked: boolean) => {
    setTtsEnabled(checked)
    try {
      localStorage.setItem('opencami-tts-enabled', String(checked))
    } catch {
      // ignore storage errors
    }
    // Dispatch storage event so MessageActionsBar can react in real-time
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'opencami-tts-enabled',
      newValue: String(checked),
    }))
  }

  // Personas state
  const [personasAvailable, setPersonasAvailable] = useState(false)
  const [personasEnabled, setPersonasEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      const stored = localStorage.getItem('opencami-personas-enabled')
      return stored === null ? true : stored === 'true'
    } catch {
      return true
    }
  })

  useEffect(() => {
    let mounted = true
    async function checkPersonas() {
      try {
        const res = await fetch('/api/personas')
        if (!res.ok) return
        const data = (await res.json()) as { ok: boolean; available: boolean }
        if (mounted && data.ok) {
          setPersonasAvailable(data.available)
        }
      } catch {
        // ignore
      }
    }
    checkPersonas()
    return () => { mounted = false }
  }, [])

  const handlePersonasToggle = (checked: boolean) => {
    setPersonasEnabled(checked)
    try {
      localStorage.setItem('opencami-personas-enabled', String(checked))
    } catch {
      // ignore storage errors
    }
    // Dispatch storage event so PersonaPicker can react in real-time
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'opencami-personas-enabled',
      newValue: String(checked),
    }))
  }

  const handleTestApiKey = async () => {
    if (!apiKeyInput.trim()) return
    setTestingKey(true)
    setTestResult(null)
    try {
      const result = await testApiKey(apiKeyInput.trim())
      setTestResult(result)
      if (result.valid) {
        updateLlmSettings({ openaiApiKey: apiKeyInput.trim() })
      }
    } finally {
      setTestingKey(false)
    }
  }

  const handleSaveApiKey = () => {
    updateLlmSettings({ openaiApiKey: apiKeyInput.trim() })
    setTestResult(null)
  }

  const handleClearApiKey = () => {
    setApiKeyInput('')
    updateLlmSettings({ openaiApiKey: '' })
    setTestResult(null)
  }

  const themeOptions = [
    { value: 'system', label: 'System', icon: ComputerIcon },
    { value: 'light', label: 'Light', icon: Sun01Icon },
    { value: 'dark', label: 'Dark', icon: Moon01Icon },
    { value: 'chameleon', label: 'Chameleon', icon: Leaf01Icon },
  ] as const
  function applyTheme(theme: ThemeMode) {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    root.classList.remove('light', 'dark', 'system', 'chameleon')
    root.classList.add(theme)
    if (theme === 'system' && media.matches) {
      root.classList.add('dark')
    }
  }

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(480px,92vw)] max-h-[80vh] overflow-auto">
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="mb-1">Settings</DialogTitle>
              <DialogDescription className="hidden">
                Configure OpenCami
              </DialogDescription>
            </div>
            <DialogClose
              render={
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-primary-500 hover:bg-primary-100 hover:text-primary-700"
                  aria-label="Close"
                >
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    size={20}
                    strokeWidth={1.5}
                  />
                </Button>
              }
            />
          </div>

          <SettingsSection title="Connection">
            <SettingsRow label="Status">
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <span className="size-2 rounded-full bg-green-500" />
                Connected
              </span>
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title="Appearance">
            <SettingsRow label="Theme">
              <Tabs
                value={settings.theme}
                onValueChange={(value) => {
                  const theme = value as ThemeMode
                  applyTheme(theme)
                  updateSettings({ theme })
                }}
              >
                <TabsList
                  variant="default"
                  className="gap-2 *:data-[slot=tab-indicator]:duration-0"
                >
                  {themeOptions.map((option) => (
                    <TabsTab key={option.value} value={option.value}>
                      <HugeiconsIcon
                        icon={option.icon}
                        size={20}
                        strokeWidth={1.5}
                      />
                      <span>{option.label}</span>
                    </TabsTab>
                  ))}
                </TabsList>
              </Tabs>
            </SettingsRow>
            <SettingsRow
              label="Text Size"
              description="Adjust chat and composer text"
            >
              <Tabs value={textSize} onValueChange={handleTextSizeChange}>
                <TabsList
                  variant="default"
                  className="gap-2 *:data-[slot=tab-indicator]:duration-0"
                >
                  {textSizeOptions.map((option) => (
                    <TabsTab key={option.value} value={option.value}>
                      <span className="tabular-nums">
                        {option.label} ({option.value})
                      </span>
                    </TabsTab>
                  ))}
                </TabsList>
              </Tabs>
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title="Chat">
            <SettingsRow label="Show tool messages">
              <Switch
                checked={settings.showToolMessages}
                onCheckedChange={(checked) =>
                  updateSettings({ showToolMessages: checked })
                }
              />
            </SettingsRow>
            <SettingsRow label="Show reasoning blocks">
              <Switch
                checked={settings.showReasoningBlocks}
                onCheckedChange={(checked) =>
                  updateSettings({ showReasoningBlocks: checked })
                }
              />
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title="Personas">
            {personasAvailable ? (
              <SettingsRow
                label="Persona Picker"
                description="Show persona picker in chat (20 personalities)"
              >
                <Switch
                  checked={personasEnabled}
                  onCheckedChange={handlePersonasToggle}
                />
              </SettingsRow>
            ) : (
              <SettingsRow
                label="Persona Picker"
                description="Install the Personas skill to unlock 20 AI personalities"
              >
                <Switch checked={false} disabled />
              </SettingsRow>
            )}
            {!personasAvailable && (
              <div className="pt-1">
                <a
                  href="https://www.clawhub.ai/robbyczgw-cla/personas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary-600 hover:text-primary-900 hover:underline"
                >
                  Get it on ClawHub →
                </a>
              </div>
            )}
          </SettingsSection>

          <SettingsSection title="Text-to-Speech">
            <SettingsRow
              label="Voice Playback"
              description="Add a 🔊 button to AI messages for text-to-speech"
            >
              <Switch
                checked={ttsEnabled}
                onCheckedChange={handleTtsToggle}
              />
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title="LLM Features">
            <div className="text-xs text-primary-500 mb-3">
              Enhance session titles and follow-up suggestions using OpenAI API.
              {llmStatus.hasEnvKey && (
                <span className="block mt-1 text-green-600">
                  ✓ Server has OPENAI_API_KEY configured
                </span>
              )}
            </div>

            <SettingsRow
              label="Smart session titles"
              description="Generate concise titles using AI"
            >
              <Switch
                checked={llmSettings.useLlmTitles}
                onCheckedChange={(checked) =>
                  updateLlmSettings({ useLlmTitles: checked })
                }
                disabled={!llmStatus.isAvailable}
              />
            </SettingsRow>

            <SettingsRow
              label="Smart follow-up suggestions"
              description="AI-generated contextual follow-ups"
            >
              <Switch
                checked={llmSettings.useLlmFollowUps}
                onCheckedChange={(checked) =>
                  updateLlmSettings({ useLlmFollowUps: checked })
                }
                disabled={!llmStatus.isAvailable}
              />
            </SettingsRow>

            <div className="mt-4 pt-3 border-t border-primary-100">
              <div className="text-sm text-primary-800 mb-2">OpenAI API Key</div>
              <div className="text-xs text-primary-500 mb-2">
                {llmStatus.hasEnvKey
                  ? 'Optional: Override server key with your own'
                  : 'Required for LLM features (stored locally)'}
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value)
                    setTestResult(null)
                  }}
                  placeholder="sk-..."
                  className="flex-1 px-3 py-1.5 text-sm rounded-md border border-primary-200 bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestApiKey}
                  disabled={!apiKeyInput.trim() || testingKey}
                  className="min-w-[60px]"
                >
                  {testingKey ? (
                    <HugeiconsIcon
                      icon={Loading02Icon}
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    'Test'
                  )}
                </Button>
              </div>

              {testResult && (
                <div
                  className={`mt-2 flex items-center gap-1.5 text-xs ${
                    testResult.valid ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  <HugeiconsIcon
                    icon={testResult.valid ? Tick01Icon : Cancel02Icon}
                    size={14}
                  />
                  {testResult.valid ? 'API key is valid' : testResult.error || 'Invalid API key'}
                </div>
              )}

              {llmSettings.openaiApiKey && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <HugeiconsIcon icon={Tick01Icon} size={14} />
                    Key saved
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClearApiKey}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Clear
                  </Button>
                </div>
              )}

              {apiKeyInput && apiKeyInput !== llmSettings.openaiApiKey && !testResult?.valid && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveApiKey}
                  className="mt-2 w-full"
                >
                  Save without testing
                </Button>
              )}
            </div>
          </SettingsSection>

          <SettingsSection title="About">
            <div className="text-sm text-primary-800">OpenCami</div>
            <div className="flex gap-4 pt-2">
              <a
                href="https://github.com/robbyczgw-cla/opencami"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:text-primary-900 hover:underline"
              >
                GitHub
              </a>
              <a
                href="https://docs.openclaw.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:text-primary-900 hover:underline"
              >
                OpenClaw docs
              </a>
            </div>
          </SettingsSection>

          <div className="mt-6 flex justify-end">
            <DialogClose onClick={onClose}>Close</DialogClose>
          </div>
        </div>
      </DialogContent>
    </DialogRoot>
  )
}
