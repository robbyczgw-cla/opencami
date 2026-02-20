import { useEffect, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  AiBrain01Icon,
  Cancel01Icon,
  Cancel02Icon,
  ComputerIcon,
  Delete02Icon,
  DropletIcon,
  InformationCircleIcon,
  Leaf01Icon,
  Link01Icon,
  Loading02Icon,
  MessageEdit01Icon,
  Moon01Icon,
  PaintBoardIcon,
  Settings02Icon,
  Sun01Icon,
  Tick01Icon,
  UserIcon,
  VoiceIcon,
} from '@hugeicons/core-free-icons'
import type { PathsPayload } from '../types'
import type {
  AccentColorMode,
  BubbleStyleMode,
  ChatWidthMode,
  DensityMode,
  FontFamilyMode,
  SidebarWidthMode,
  ThemeMode,
} from '@/hooks/use-chat-settings'
import { cn } from '@/lib/utils'
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
import { Button } from '@/components/ui/button'
import {
  getLlmProviderDefaults,
  useLlmSettings,
} from '@/hooks/use-llm-settings'

type SettingsSectionProps = {
  title: string
  tabId?: string
  activeTab?: string
  children: React.ReactNode
}

function SettingsSection({
  title,
  tabId,
  activeTab,
  children,
}: SettingsSectionProps) {
  // On desktop: hide if tabId doesn't match activeTab
  // On mobile: always show (no sidebar)
  const hiddenOnDesktop = tabId && activeTab && tabId !== activeTab
  return (
    <div
      className={cn(
        'border-b border-primary-200 py-2 last:border-0',
        hiddenOnDesktop && 'md:hidden',
      )}
    >
      <h3 className="mb-1.5 text-sm font-semibold text-primary-700">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

type SettingsRowProps = {
  label: string
  description?: string
  inline?: boolean
  children: React.ReactNode
}

function SettingsRow({
  label,
  description,
  inline,
  children,
}: SettingsRowProps) {
  if (inline) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex-1 select-none">
          <div className="text-[13px] font-medium text-primary-800">
            {label}
          </div>
          {description && (
            <div className="text-xs text-primary-500">{description}</div>
          )}
        </div>
        <div className="flex items-center gap-2">{children}</div>
      </div>
    )
  }
  return (
    <div className="space-y-1">
      <div className="select-none">
        <div className="text-[13px] font-medium text-primary-800">{label}</div>
        {description && (
          <div className="text-xs text-primary-500">{description}</div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
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
  { value: '14px', label: 'S' },
  { value: '16px', label: 'M' },
  { value: '18px', label: 'L' },
  { value: '20px', label: 'XL' },
] as const

type TextSizeValue = (typeof textSizeOptions)[number]['value']

const fontFamilyOptions = [
  {
    value: 'system',
    label: 'System',
    cssValue: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    previewClass: 'font-sans',
  },
  {
    value: 'inter',
    label: 'Inter',
    cssValue: '"Inter", sans-serif',
    previewClass: 'font-["Inter",sans-serif]',
  },
  {
    value: 'roboto',
    label: 'Roboto',
    cssValue: '"Roboto", sans-serif',
    previewClass: 'font-["Roboto",sans-serif]',
  },
] as const

const densityOptions = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'spacious', label: 'Spacious' },
] as const

const accentColorOptions = [
  {
    value: 'green',
    label: 'Green',
    accent: '#22c55e',
    hover: '#16a34a',
    light: 'rgba(34, 197, 94, 0.10)',
  },
  {
    value: 'blue',
    label: 'Blue',
    accent: '#3b82f6',
    hover: '#2563eb',
    light: 'rgba(59, 130, 246, 0.10)',
  },
  {
    value: 'purple',
    label: 'Purple',
    accent: '#8b5cf6',
    hover: '#7c3aed',
    light: 'rgba(139, 92, 246, 0.10)',
  },
  {
    value: 'orange',
    label: 'Orange',
    accent: '#f97316',
    hover: '#ea580c',
    light: 'rgba(249, 115, 22, 0.10)',
  },
  {
    value: 'pink',
    label: 'Pink',
    accent: '#ec4899',
    hover: '#db2777',
    light: 'rgba(236, 72, 153, 0.10)',
  },
  {
    value: 'red',
    label: 'Red',
    accent: '#ef4444',
    hover: '#dc2626',
    light: 'rgba(239, 68, 68, 0.10)',
  },
  {
    value: 'cyan',
    label: 'Cyan',
    accent: '#06b6d4',
    hover: '#0891b2',
    light: 'rgba(6, 182, 212, 0.10)',
  },
  {
    value: 'yellow',
    label: 'Yellow',
    accent: '#eab308',
    hover: '#ca8a04',
    light: 'rgba(234, 179, 8, 0.10)',
  },
] as const

const chatWidthOptions = [
  { value: 'narrow', label: 'Narrow', cssValue: '640px' },
  { value: 'medium', label: 'Medium', cssValue: '800px' },
  { value: 'wide', label: 'Wide', cssValue: '1000px' },
  { value: 'full', label: 'Full', cssValue: '100%' },
] as const

const sidebarWidthOptions = [
  { value: 'compact', label: 'Compact', cssValue: '200px' },
  { value: 'normal', label: 'Normal', cssValue: '260px' },
  { value: 'wide', label: 'Wide', cssValue: '320px' },
  { value: 'xl', label: 'XL', cssValue: '400px' },
] as const

const bubbleStyleOptions = [
  { value: 'default', label: 'Default' },
  { value: 'bubbles', label: 'Bubbles' },
  { value: 'minimal', label: 'Minimal' },
] as const

type FontFamilyValue = (typeof fontFamilyOptions)[number]['value']
type DensityValue = (typeof densityOptions)[number]['value']
type AccentColorValue = (typeof accentColorOptions)[number]['value']
type ChatWidthValue = (typeof chatWidthOptions)[number]['value']
type SidebarWidthValue = (typeof sidebarWidthOptions)[number]['value']
type BubbleStyleValue = (typeof bubbleStyleOptions)[number]['value']

function isTextSizeValue(value: string): value is TextSizeValue {
  return textSizeOptions.some((option) => option.value === value)
}

function isFontFamilyValue(value: string): value is FontFamilyValue {
  return fontFamilyOptions.some((option) => option.value === value)
}

function isDensityValue(value: string): value is DensityValue {
  return densityOptions.some((option) => option.value === value)
}

function isAccentColorValue(value: string): value is AccentColorValue {
  return accentColorOptions.some((option) => option.value === value)
}

function isChatWidthValue(value: string): value is ChatWidthValue {
  return chatWidthOptions.some((option) => option.value === value)
}

function isSidebarWidthValue(value: string): value is SidebarWidthValue {
  return sidebarWidthOptions.some((option) => option.value === value)
}

function isBubbleStyleValue(value: string): value is BubbleStyleValue {
  return bubbleStyleOptions.some((option) => option.value === value)
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

  const [activeTab, setActiveTab] = useState('appearance')
  const [apiKeyInput, setApiKeyInput] = useState(llmSettings.llmApiKey)
  const [testingKey, setTestingKey] = useState(false)
  const [testResult, setTestResult] = useState<{
    valid: boolean
    error?: string
  } | null>(null)

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

  // TTS provider state
  const [ttsProvider, setTtsProvider] = useState(() => {
    if (typeof window === 'undefined') return 'auto'
    try {
      return localStorage.getItem('opencami-tts-provider') || 'auto'
    } catch {
      return 'auto'
    }
  })
  const [ttsVoice, setTtsVoice] = useState(() => {
    if (typeof window === 'undefined') return 'nova'
    try {
      return localStorage.getItem('opencami-tts-voice') || 'nova'
    } catch {
      return 'nova'
    }
  })

  // STT provider state
  const [sttProvider, setSttProvider] = useState(() => {
    if (typeof window === 'undefined') return 'auto'
    try {
      return localStorage.getItem('opencami-stt-provider') || 'auto'
    } catch {
      return 'auto'
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const storedFontFamily = localStorage.getItem('opencami-font-family')
      if (storedFontFamily && isFontFamilyValue(storedFontFamily)) {
        applyFontFamily(storedFontFamily)
        if (settings.fontFamily !== storedFontFamily) {
          updateSettings({ fontFamily: storedFontFamily as FontFamilyMode })
        }
      } else {
        applyFontFamily(settings.fontFamily)
      }

      const storedDensity = localStorage.getItem('opencami-density')
      if (storedDensity && isDensityValue(storedDensity)) {
        applyDensity(storedDensity)
        if (settings.density !== storedDensity) {
          updateSettings({ density: storedDensity as DensityMode })
        }
      } else {
        applyDensity(settings.density)
      }

      const storedAccentColor = localStorage.getItem('opencami-accent-color')
      if (storedAccentColor && isAccentColorValue(storedAccentColor)) {
        applyAccentColor(storedAccentColor)
        if (settings.accentColor !== storedAccentColor) {
          updateSettings({ accentColor: storedAccentColor as AccentColorMode })
        }
      } else {
        applyAccentColor(settings.accentColor)
      }

      const storedChatWidth = localStorage.getItem('opencami-chat-width')
      if (storedChatWidth && isChatWidthValue(storedChatWidth)) {
        applyChatWidth(storedChatWidth)
        if (settings.chatWidth !== storedChatWidth) {
          updateSettings({ chatWidth: storedChatWidth as ChatWidthMode })
        }
      } else {
        applyChatWidth(settings.chatWidth)
      }

      const storedSidebarWidth = localStorage.getItem('opencami-sidebar-width')
      if (storedSidebarWidth && isSidebarWidthValue(storedSidebarWidth)) {
        applySidebarWidth(storedSidebarWidth)
        if (settings.sidebarWidth !== storedSidebarWidth) {
          updateSettings({
            sidebarWidth: storedSidebarWidth as SidebarWidthMode,
          })
        }
      } else {
        applySidebarWidth(settings.sidebarWidth)
      }

      const storedBubbleStyle = localStorage.getItem('opencami-bubble-style')
      if (storedBubbleStyle && isBubbleStyleValue(storedBubbleStyle)) {
        applyBubbleStyle(storedBubbleStyle)
        if (settings.bubbleStyle !== storedBubbleStyle) {
          updateSettings({ bubbleStyle: storedBubbleStyle as BubbleStyleMode })
        }
      } else {
        applyBubbleStyle(settings.bubbleStyle)
      }
    } catch {
      applyFontFamily(settings.fontFamily)
      applyDensity(settings.density)
      applyAccentColor(settings.accentColor)
      applyChatWidth(settings.chatWidth)
      applySidebarWidth(settings.sidebarWidth)
      applyBubbleStyle(settings.bubbleStyle)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    applyFontFamily(settings.fontFamily)
  }, [settings.fontFamily])

  useEffect(() => {
    applyDensity(settings.density)
  }, [settings.density])

  useEffect(() => {
    applyAccentColor(settings.accentColor)
  }, [settings.accentColor])

  useEffect(() => {
    applyChatWidth(settings.chatWidth)
  }, [settings.chatWidth])

  useEffect(() => {
    applySidebarWidth(settings.sidebarWidth)
  }, [settings.sidebarWidth])

  useEffect(() => {
    applyBubbleStyle(settings.bubbleStyle)
  }, [settings.bubbleStyle])

  const handleTtsProviderChange = (value: string) => {
    setTtsProvider(value)
    try {
      localStorage.setItem('opencami-tts-provider', value)
    } catch {
      /* ignore */
    }
  }

  const handleTtsVoiceChange = (value: string) => {
    setTtsVoice(value)
    try {
      localStorage.setItem('opencami-tts-voice', value)
    } catch {
      /* ignore */
    }
  }

  const handleSttProviderChange = (value: string) => {
    setSttProvider(value)
    try {
      localStorage.setItem('opencami-stt-provider', value)
    } catch {
      /* ignore */
    }
  }

  function applyTextSize(value: TextSizeValue) {
    if (typeof document === 'undefined') return
    document.documentElement.style.setProperty('--opencami-text-size', value)
  }

  function applyFontFamily(value: FontFamilyValue) {
    if (typeof document === 'undefined') return
    const selected = fontFamilyOptions.find((option) => option.value === value)
    const cssValue = selected?.cssValue ?? fontFamilyOptions[0].cssValue
    document.documentElement.style.setProperty(
      '--opencami-font-family',
      cssValue,
    )
  }

  function applyDensity(value: DensityValue) {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.style.setProperty('--opencami-density', value)

    if (value === 'compact') {
      root.style.setProperty('--opencami-msg-padding-y', '0.25rem')
      root.style.setProperty('--opencami-msg-gap', '0.25rem')
      root.style.setProperty('--opencami-user-bubble-py', '0.4rem')
      return
    }

    if (value === 'spacious') {
      root.style.setProperty('--opencami-msg-padding-y', '1.25rem')
      root.style.setProperty('--opencami-msg-gap', '1rem')
      root.style.setProperty('--opencami-user-bubble-py', '1rem')
      return
    }

    root.style.setProperty('--opencami-msg-padding-y', '0.75rem')
    root.style.setProperty('--opencami-msg-gap', '0.5rem')
    root.style.setProperty('--opencami-user-bubble-py', '0.625rem')
  }

  function applyAccentColor(value: AccentColorValue) {
    if (typeof document === 'undefined') return
    const selected =
      accentColorOptions.find((option) => option.value === value) ??
      accentColorOptions[0]
    const root = document.documentElement
    root.style.setProperty('--opencami-accent', selected.accent)
    root.style.setProperty('--opencami-accent-hover', selected.hover)
    root.style.setProperty('--opencami-accent-light', selected.light)
  }

  function applyChatWidth(value: ChatWidthValue) {
    if (typeof document === 'undefined') return
    const selected =
      chatWidthOptions.find((option) => option.value === value) ??
      chatWidthOptions[2]
    document.documentElement.style.setProperty(
      '--opencami-chat-width',
      selected.cssValue,
    )
  }

  function applySidebarWidth(value: SidebarWidthValue) {
    if (typeof document === 'undefined') return
    const selected =
      sidebarWidthOptions.find((option) => option.value === value) ??
      sidebarWidthOptions[1]
    document.documentElement.style.setProperty(
      '--opencami-sidebar-width',
      selected.cssValue,
    )
  }

  function applyBubbleStyle(value: BubbleStyleValue) {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-opencami-bubble-style', value)
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

  const handleFontFamilyChange = (value: string) => {
    if (!isFontFamilyValue(value)) return
    applyFontFamily(value)
    updateSettings({ fontFamily: value as FontFamilyMode })
    try {
      localStorage.setItem('opencami-font-family', value)
    } catch {
      // ignore storage errors
    }
  }

  const handleDensityChange = (value: string) => {
    if (!isDensityValue(value)) return
    applyDensity(value)
    updateSettings({ density: value as DensityMode })
    try {
      localStorage.setItem('opencami-density', value)
    } catch {
      // ignore storage errors
    }
  }

  const handleAccentColorChange = (value: string) => {
    if (!isAccentColorValue(value)) return
    applyAccentColor(value)
    updateSettings({ accentColor: value as AccentColorMode })
    try {
      localStorage.setItem('opencami-accent-color', value)
    } catch {
      // ignore storage errors
    }
  }

  const handleChatWidthChange = (value: string) => {
    if (!isChatWidthValue(value)) return
    applyChatWidth(value)
    updateSettings({ chatWidth: value as ChatWidthMode })
    try {
      localStorage.setItem('opencami-chat-width', value)
    } catch {
      // ignore storage errors
    }
  }

  const handleSidebarWidthChange = (value: string) => {
    if (!isSidebarWidthValue(value)) return
    applySidebarWidth(value)
    updateSettings({ sidebarWidth: value as SidebarWidthMode })
    try {
      localStorage.setItem('opencami-sidebar-width', value)
    } catch {
      // ignore storage errors
    }
  }

  const handleBubbleStyleChange = (value: string) => {
    if (!isBubbleStyleValue(value)) return
    applyBubbleStyle(value)
    updateSettings({ bubbleStyle: value as BubbleStyleMode })
    try {
      localStorage.setItem('opencami-bubble-style', value)
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
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'opencami-tts-enabled',
        newValue: String(checked),
      }),
    )
  }

  // Personas state
  const [personasAvailable, setPersonasAvailable] = useState(false)
  const personasAbortControllerRef = useRef<AbortController | null>(null)
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
      personasAbortControllerRef.current?.abort()
      const controller = new AbortController()
      personasAbortControllerRef.current = controller

      try {
        const res = await fetch('/api/personas', { signal: controller.signal })
        if (!res.ok) return
        const data = (await res.json()) as { ok: boolean; available: boolean }
        if (mounted && data.ok) {
          setPersonasAvailable(data.available)
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        // ignore
      }
    }
    checkPersonas()
    return () => {
      mounted = false
      personasAbortControllerRef.current?.abort()
    }
  }, [])

  const handlePersonasToggle = (checked: boolean) => {
    setPersonasEnabled(checked)
    try {
      localStorage.setItem('opencami-personas-enabled', String(checked))
    } catch {
      // ignore storage errors
    }
    // Dispatch storage event so PersonaPicker can react in real-time
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'opencami-personas-enabled',
        newValue: String(checked),
      }),
    )
  }

  const handleTestApiKey = async () => {
    if (!apiKeyInput.trim()) return
    setTestingKey(true)
    setTestResult(null)
    try {
      const result = await testApiKey(apiKeyInput.trim())
      setTestResult(result)
      if (result.valid) {
        updateLlmSettings({ llmApiKey: apiKeyInput.trim() })
      }
    } finally {
      setTestingKey(false)
    }
  }

  const handleSaveApiKey = () => {
    updateLlmSettings({ llmApiKey: apiKeyInput.trim() })
    setTestResult(null)
  }

  const handleClearApiKey = () => {
    setApiKeyInput('')
    updateLlmSettings({ llmApiKey: '' })
    setTestResult(null)
  }

  const themeOptions = [
    { value: 'system', label: 'Auto', icon: ComputerIcon },
    { value: 'light', label: 'Light', icon: Sun01Icon },
    { value: 'dark', label: 'Dark', icon: Moon01Icon },
    { value: 'chameleon', label: 'Cham', icon: Leaf01Icon },
    { value: 'frost-light', label: 'Ice', icon: DropletIcon },
  ] as const
  function applyTheme(theme: ThemeMode) {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    root.classList.remove(
      'light',
      'dark',
      'system',
      'chameleon',
      'frost',
      'frost-light',
      'frost-dark',
    )
    root.style.colorScheme = ''
    root.classList.add(theme)

    const isFrostLight = theme === 'frost-light'
    const isFrostDark = theme === 'frost-dark'

    if (isFrostLight || isFrostDark) {
      root.classList.add('frost')
    }
    if (isFrostDark) {
      root.classList.add('dark')
    }
    if (theme === 'system' && media.matches) {
      root.classList.add('dark')
    }
    if (isFrostLight) {
      root.classList.remove('dark')
      root.style.colorScheme = 'light'
    }
  }

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(680px,92vw)] max-h-[85vh] overflow-y-auto">
        <div className="p-3">
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

          {/* Desktop: sidebar + content | Mobile: vertical scroll */}
          <div className="mt-2 flex md:flex-row flex-col md:gap-3 gap-0 md:min-h-[400px]">
            {/* Sidebar - desktop only */}
            <nav className="hidden md:flex flex-col gap-0.5 min-w-[160px] border-r border-primary-200 pr-3">
              {(
                [
                  { id: 'connection', label: 'Connection', icon: Link01Icon },
                  {
                    id: 'appearance',
                    label: 'Appearance',
                    icon: PaintBoardIcon,
                  },
                  { id: 'chat', label: 'Chat', icon: MessageEdit01Icon },
                  { id: 'workspace', label: 'Workspace', icon: Settings02Icon },
                  { id: 'personas', label: 'Personas', icon: UserIcon },
                  { id: 'voice', label: 'Voice', icon: VoiceIcon },
                  { id: 'llm', label: 'LLM Features', icon: AiBrain01Icon },
                  { id: 'about', label: 'About', icon: InformationCircleIcon },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-left transition-colors',
                    activeTab === tab.id
                      ? 'text-primary-900 font-medium'
                      : 'text-primary-600 hover:text-primary-900 hover:bg-primary-50',
                  )}
                  style={
                    activeTab === tab.id
                      ? { backgroundColor: 'var(--opencami-accent-light)' }
                      : undefined
                  }
                >
                  <HugeiconsIcon icon={tab.icon} size={16} strokeWidth={1.5} />
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto md:max-h-[calc(85vh-90px)] max-h-none">
              <SettingsSection
                title="Connection"
                tabId="connection"
                activeTab={activeTab}
              >
                <SettingsRow inline label="Status">
                  <span className="flex items-center gap-1.5 text-sm text-green-600">
                    <span className="size-2 rounded-full bg-green-500" />
                    Connected
                  </span>
                </SettingsRow>
              </SettingsSection>

              <SettingsSection
                title="Appearance"
                tabId="appearance"
                activeTab={activeTab}
              >
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
                      className="gap-1.5 flex-wrap *:data-[slot=tab-indicator]:duration-0"
                    >
                      {themeOptions.map((option) => (
                        <TabsTab
                          key={option.value}
                          value={option.value}
                          className="text-[11px] px-1 py-0.5 gap-0.5"
                        >
                          {option.icon && (
                            <HugeiconsIcon
                              icon={option.icon}
                              size={13}
                              strokeWidth={1.5}
                            />
                          )}
                          <span>{option.label}</span>
                        </TabsTab>
                      ))}
                    </TabsList>
                  </Tabs>
                </SettingsRow>
                <SettingsRow label="Accent Color">
                  <div className="flex gap-0.5 flex-wrap">
                    {accentColorOptions.map((option) => {
                      const selected = settings.accentColor === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleAccentColorChange(option.value)}
                          className={cn(
                            'flex items-center justify-center rounded-md p-1 transition-all duration-150',
                            selected
                              ? 'scale-110'
                              : 'hover:bg-primary-50 hover:scale-105',
                          )}
                        >
                          <span
                            className={cn(
                              'size-6 rounded-full transition-shadow duration-150',
                              selected
                                ? 'ring-2 ring-offset-2'
                                : 'border-2 border-primary-200',
                            )}
                            style={{
                              backgroundColor: option.accent,
                              ...(selected
                                ? ({
                                    '--tw-ring-color': option.accent,
                                  } as React.CSSProperties)
                                : {}),
                            }}
                          />
                        </button>
                      )
                    })}
                  </div>
                </SettingsRow>
                <SettingsRow label="Text Size">
                  <Tabs value={textSize} onValueChange={handleTextSizeChange}>
                    <TabsList
                      variant="default"
                      className="gap-2 *:data-[slot=tab-indicator]:duration-0"
                    >
                      {textSizeOptions.map((option) => (
                        <TabsTab key={option.value} value={option.value}>
                          <span className="tabular-nums text-xs">
                            {option.label}
                          </span>
                        </TabsTab>
                      ))}
                    </TabsList>
                  </Tabs>
                </SettingsRow>
                <SettingsRow inline label="Font">
                  <Tabs
                    value={settings.fontFamily}
                    onValueChange={handleFontFamilyChange}
                  >
                    <TabsList
                      variant="default"
                      className="gap-1 *:data-[slot=tab-indicator]:duration-0"
                    >
                      {fontFamilyOptions.map((option) => (
                        <TabsTab key={option.value} value={option.value}>
                          <span
                            className="text-xs"
                            style={{ fontFamily: option.cssValue }}
                          >
                            {option.label}
                          </span>
                        </TabsTab>
                      ))}
                    </TabsList>
                  </Tabs>
                </SettingsRow>
                <SettingsRow inline label="Density">
                  <Tabs
                    value={settings.density}
                    onValueChange={handleDensityChange}
                  >
                    <TabsList
                      variant="default"
                      className="gap-1 *:data-[slot=tab-indicator]:duration-0"
                    >
                      {densityOptions.map((option) => (
                        <TabsTab key={option.value} value={option.value}>
                          <span className="text-xs">{option.label}</span>
                        </TabsTab>
                      ))}
                    </TabsList>
                  </Tabs>
                </SettingsRow>
                <SettingsRow inline label="Bubbles">
                  <Tabs
                    value={settings.bubbleStyle}
                    onValueChange={handleBubbleStyleChange}
                  >
                    <TabsList
                      variant="default"
                      className="gap-1 *:data-[slot=tab-indicator]:duration-0"
                    >
                      {bubbleStyleOptions.map((option) => (
                        <TabsTab key={option.value} value={option.value}>
                          <span className="text-xs">{option.label}</span>
                        </TabsTab>
                      ))}
                    </TabsList>
                  </Tabs>
                </SettingsRow>
                <SettingsRow inline label="Chat Width">
                  <Tabs
                    value={settings.chatWidth}
                    onValueChange={handleChatWidthChange}
                  >
                    <TabsList
                      variant="default"
                      className="gap-1 *:data-[slot=tab-indicator]:duration-0"
                    >
                      {chatWidthOptions.map((option) => (
                        <TabsTab key={option.value} value={option.value}>
                          <span className="text-xs">{option.label}</span>
                        </TabsTab>
                      ))}
                    </TabsList>
                  </Tabs>
                </SettingsRow>
                <SettingsRow inline label="Sidebar">
                  <Tabs
                    value={settings.sidebarWidth}
                    onValueChange={handleSidebarWidthChange}
                  >
                    <TabsList
                      variant="default"
                      className="gap-1 *:data-[slot=tab-indicator]:duration-0"
                    >
                      {sidebarWidthOptions.map((option) => (
                        <TabsTab key={option.value} value={option.value}>
                          <span className="text-xs">{option.label}</span>
                        </TabsTab>
                      ))}
                    </TabsList>
                  </Tabs>
                </SettingsRow>
              </SettingsSection>

              <SettingsSection title="Chat" tabId="chat" activeTab={activeTab}>
                <SettingsRow inline label="Show tool messages">
                  <Switch
                    checked={settings.showToolMessages}
                    onCheckedChange={(checked) =>
                      updateSettings({ showToolMessages: checked })
                    }
                  />
                </SettingsRow>
                <SettingsRow inline label="Show reasoning blocks">
                  <Switch
                    checked={settings.showReasoningBlocks}
                    onCheckedChange={(checked) =>
                      updateSettings({ showReasoningBlocks: checked })
                    }
                  />
                </SettingsRow>
                <SettingsRow inline label="Show search sources">
                  <Switch
                    checked={settings.showSearchSources}
                    onCheckedChange={(checked) =>
                      updateSettings({ showSearchSources: checked })
                    }
                  />
                </SettingsRow>
                <SettingsRow
                  inline
                  label="Inline File Preview"
                  description="Make file paths in messages clickable to preview file contents"
                >
                  <Switch
                    checked={settings.inlineFilePreview}
                    onCheckedChange={(checked) =>
                      updateSettings({ inlineFilePreview: checked })
                    }
                  />
                </SettingsRow>
              </SettingsSection>

              <SettingsSection
                title="Workspace"
                tabId="workspace"
                activeTab={activeTab}
              >
                <SettingsRow
                  inline
                  label="File Explorer"
                  description="Browse and edit workspace files from the sidebar"
                >
                  <Switch
                    checked={(() => {
                      try {
                        const v = localStorage.getItem('opencami-file-explorer')
                        return v === null ? true : v === 'true'
                      } catch {
                        return true
                      }
                    })()}
                    onCheckedChange={(checked) => {
                      localStorage.setItem(
                        'opencami-file-explorer',
                        String(checked),
                      )
                      window.location.reload()
                    }}
                  />
                </SettingsRow>
                <SettingsRow
                  inline
                  label="Memory Viewer"
                  description="Browse and edit MEMORY.md and daily memory files"
                >
                  <Switch
                    checked={(() => {
                      try {
                        const v = localStorage.getItem('opencami-memory-viewer')
                        return v === null ? true : v === 'true'
                      } catch {
                        return true
                      }
                    })()}
                    onCheckedChange={(checked) => {
                      localStorage.setItem(
                        'opencami-memory-viewer',
                        String(checked),
                      )
                      window.location.reload()
                    }}
                  />
                </SettingsRow>
                <SettingsRow
                  inline
                  label="Agent Manager (Beta)"
                  description="Show Agent Manager in sidebar for creating and managing agents"
                >
                  <Switch
                    checked={(() => {
                      try {
                        return (
                          localStorage.getItem('opencami-agent-manager') ===
                          'true'
                        )
                      } catch {
                        return false
                      }
                    })()}
                    onCheckedChange={(checked) => {
                      localStorage.setItem(
                        'opencami-agent-manager',
                        String(checked),
                      )
                      window.location.reload()
                    }}
                  />
                </SettingsRow>
                <SettingsRow
                  inline
                  label="Skills Browser (Beta)"
                  description="Browse and install skills from ClawHub"
                >
                  <Switch
                    checked={(() => {
                      try {
                        return (
                          localStorage.getItem('opencami-skills-browser') ===
                          'true'
                        )
                      } catch {
                        return false
                      }
                    })()}
                    onCheckedChange={(checked) => {
                      localStorage.setItem(
                        'opencami-skills-browser',
                        String(checked),
                      )
                      window.location.reload()
                    }}
                  />
                </SettingsRow>
                <SettingsRow
                  inline
                  label="Cron Jobs Panel (Beta)"
                  description="Show Cron Jobs in sidebar for managing OpenClaw cron schedules"
                >
                  <Switch
                    checked={(() => {
                      try {
                        return (
                          localStorage.getItem('opencami-cron-manager') ===
                          'true'
                        )
                      } catch {
                        return false
                      }
                    })()}
                    onCheckedChange={(checked) => {
                      localStorage.setItem(
                        'opencami-cron-manager',
                        String(checked),
                      )
                      window.location.reload()
                    }}
                  />
                </SettingsRow>
                <SettingsRow
                  inline
                  label="Dashboard (Beta)"
                  description="Show Dashboard in sidebar with system and gateway widgets"
                >
                  <Switch
                    checked={(() => {
                      try {
                        return (
                          localStorage.getItem('feature_dashboard') === 'true'
                        )
                      } catch {
                        return false
                      }
                    })()}
                    onCheckedChange={(checked) => {
                      localStorage.setItem('feature_dashboard', String(checked))
                      window.location.reload()
                    }}
                  />
                </SettingsRow>
              </SettingsSection>

              <SettingsSection
                title="Personas"
                tabId="personas"
                activeTab={activeTab}
              >
                {personasAvailable ? (
                  <SettingsRow
                    inline
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
                    inline
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

              <SettingsSection
                title="Text-to-Speech"
                tabId="voice"
                activeTab={activeTab}
              >
                <SettingsRow
                  inline
                  label="Voice Playback"
                  description="Add a 🔊 button to AI messages for text-to-speech"
                >
                  <Switch
                    checked={ttsEnabled}
                    onCheckedChange={handleTtsToggle}
                  />
                </SettingsRow>
                <SettingsRow
                  inline
                  label="TTS Provider"
                  description="Choose which service generates speech"
                >
                  <select
                    value={ttsProvider}
                    onChange={(e) => handleTtsProviderChange(e.target.value)}
                    className="rounded-md border border-primary-200 bg-surface px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="auto">Auto</option>
                    <option value="elevenlabs">ElevenLabs</option>
                    <option value="openai">OpenAI</option>
                    <option value="edge">Edge TTS (free)</option>
                  </select>
                </SettingsRow>
                {ttsProvider === 'openai' && (
                  <SettingsRow
                    inline
                    label="Voice"
                    description="OpenAI voice selection"
                  >
                    <select
                      value={ttsVoice}
                      onChange={(e) => handleTtsVoiceChange(e.target.value)}
                      className="rounded-md border border-primary-200 bg-surface px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {[
                        'alloy',
                        'echo',
                        'fable',
                        'onyx',
                        'nova',
                        'shimmer',
                      ].map((v) => (
                        <option key={v} value={v}>
                          {v.charAt(0).toUpperCase() + v.slice(1)}
                        </option>
                      ))}
                    </select>
                  </SettingsRow>
                )}
              </SettingsSection>

              <SettingsSection
                title="Speech-to-Text"
                tabId="voice"
                activeTab={activeTab}
              >
                <SettingsRow
                  inline
                  label="STT Provider"
                  description="Choose which service transcribes your voice"
                >
                  <select
                    value={sttProvider}
                    onChange={(e) => handleSttProviderChange(e.target.value)}
                    className="rounded-md border border-primary-200 bg-surface px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="auto">Auto</option>
                    <option value="elevenlabs">ElevenLabs</option>
                    <option value="openai">OpenAI</option>
                    <option value="browser">Browser (free)</option>
                  </select>
                </SettingsRow>
              </SettingsSection>

              <SettingsSection
                title="LLM Features"
                tabId="llm"
                activeTab={activeTab}
              >
                <div className="text-xs text-primary-500 mb-3">
                  Enhance session titles and follow-up suggestions using an LLM
                  provider.
                  {llmStatus.hasEnvKey &&
                    llmSettings.llmProvider === 'openai' && (
                      <span className="block mt-1 text-green-600">
                        ✓ Server has OPENAI_API_KEY configured
                      </span>
                    )}
                  {llmStatus.hasOpenRouterKey &&
                    llmSettings.llmProvider === 'openrouter' && (
                      <span className="block mt-1 text-green-600">
                        ✓ Server has OPENROUTER_API_KEY configured
                      </span>
                    )}
                  {llmStatus.hasKilocodeKey &&
                    llmSettings.llmProvider === 'kilocode' && (
                      <span className="block mt-1 text-green-600">
                        ✓ Server has KILOCODE_API_KEY configured
                      </span>
                    )}
                </div>

                <SettingsRow
                  inline
                  label="Provider"
                  description="Choose LLM provider for titles & follow-ups"
                >
                  <select
                    value={llmSettings.llmProvider}
                    onChange={(e) => {
                      const provider = e.target.value as
                        | 'openai'
                        | 'openrouter'
                        | 'kilocode'
                        | 'ollama'
                        | 'custom'
                      updateLlmSettings({
                        llmProvider: provider,
                        llmBaseUrl: '',
                        llmModel: '',
                      })
                    }}
                    className="px-2 py-1 text-sm rounded-md border border-primary-200 bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="kilocode">Kilo Gateway</option>
                    <option value="ollama">Ollama (local)</option>
                    <option value="custom">Custom</option>
                  </select>
                </SettingsRow>

                <SettingsRow
                  inline
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
                  inline
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

                <div className="mt-2 space-y-2">
                  <div>
                    <div className="text-xs text-primary-500 mb-1">Model</div>
                    <input
                      type="text"
                      value={llmSettings.llmModel}
                      onChange={(e) =>
                        updateLlmSettings({ llmModel: e.target.value })
                      }
                      placeholder={
                        getLlmProviderDefaults(llmSettings.llmProvider).model ||
                        'model-name'
                      }
                      className="w-full px-3 py-1.5 text-sm rounded-md border border-primary-200 bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  {(llmSettings.llmProvider === 'custom' ||
                    llmSettings.llmProvider === 'ollama') && (
                    <div>
                      <div className="text-xs text-primary-500 mb-1">
                        Base URL
                      </div>
                      <input
                        type="text"
                        value={llmSettings.llmBaseUrl}
                        onChange={(e) =>
                          updateLlmSettings({ llmBaseUrl: e.target.value })
                        }
                        placeholder={
                          getLlmProviderDefaults(llmSettings.llmProvider)
                            .baseUrl || 'https://...'
                        }
                        className="w-full px-3 py-1.5 text-sm rounded-md border border-primary-200 bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-primary-100">
                  <div className="text-sm text-primary-800 mb-2">
                    {llmSettings.llmProvider === 'ollama'
                      ? 'API Key (optional)'
                      : 'API Key'}
                  </div>
                  <div className="text-xs text-primary-500 mb-2">
                    {llmSettings.llmProvider === 'ollama'
                      ? 'Not required for local Ollama'
                      : llmStatus.hasEnvKey &&
                          llmSettings.llmProvider === 'openai'
                        ? 'Optional: Override server key with your own'
                        : `Required for ${llmSettings.llmProvider === 'openrouter' ? 'OpenRouter' : llmSettings.llmProvider === 'kilocode' ? 'Kilo Gateway' : 'LLM features'} (stored locally)`}
                  </div>
                  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 mb-2">
                    ⚠️ <strong>Security Note:</strong> API keys are stored in
                    your browser's localStorage. This is convenient but not
                    secure for shared computers. For production use, configure
                    keys server-side via environment variables (OPENAI_API_KEY,
                    OPENROUTER_API_KEY, KILOCODE_API_KEY).
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
                      {testResult.valid
                        ? 'API key is valid'
                        : testResult.error || 'Invalid API key'}
                    </div>
                  )}

                  {llmSettings.llmApiKey && (
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

                  {apiKeyInput &&
                    apiKeyInput !== llmSettings.llmApiKey &&
                    !testResult?.valid && (
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

              <SettingsSection
                title="About"
                tabId="about"
                activeTab={activeTab}
              >
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
            </div>
            {/* end content area */}
          </div>
          {/* end flex sidebar+content */}

          <div className="mt-2 flex justify-end">
            <DialogClose onClick={onClose}>Close</DialogClose>
          </div>
        </div>
      </DialogContent>
    </DialogRoot>
  )
}
