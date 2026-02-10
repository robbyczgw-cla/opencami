import { useState, useRef, useEffect } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Copy01Icon,
  Tick02Icon,
  VolumeHighIcon,
  StopIcon,
  Loading02Icon,
} from '@hugeicons/core-free-icons'
import { MessageTimestamp } from './message-timestamp'
import {
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type MessageActionsBarProps = {
  text: string
  align: 'start' | 'end'
  timestamp: number
  forceVisible?: boolean
}

export function MessageActionsBar({
  text,
  align,
  timestamp,
  forceVisible = false,
}: MessageActionsBarProps) {
  const [copied, setCopied] = useState(false)
  const [audioState, setAudioState] = useState<
    'idle' | 'loading' | 'playing'
  >('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const ttsAbortControllerRef = useRef<AbortController | null>(null)

  // Check TTS enabled from localStorage
  const [ttsEnabled, setTtsEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      const stored = localStorage.getItem('opencami-tts-enabled')
      return stored === null ? true : stored === 'true'
    } catch {
      return true
    }
  })

  // Listen for storage changes (from settings dialog)
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === 'opencami-tts-enabled') {
        setTtsEnabled(e.newValue === null ? true : e.newValue === 'true')
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      ttsAbortControllerRef.current?.abort()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  const handleTTS = async () => {
    if (audioState === 'playing') {
      ttsAbortControllerRef.current?.abort()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      setAudioState('idle')
      return
    }

    ttsAbortControllerRef.current?.abort()
    const controller = new AbortController()
    ttsAbortControllerRef.current = controller

    setAudioState('loading')
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      })

      if (!res.ok) throw new Error('TTS failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio

      audio.onended = () => {
        setAudioState('idle')
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current)
          objectUrlRef.current = null
        }
        audioRef.current = null
      }

      audio.onerror = () => {
        setAudioState('idle')
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current)
          objectUrlRef.current = null
        }
        audioRef.current = null
      }

      await audio.play()
      setAudioState('playing')
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setAudioState('idle')
        return
      }
      setAudioState('idle')
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      audioRef.current = null
    }
  }

  const positionClass = align === 'end' ? 'justify-end' : 'justify-start'
  const showTTS = align === 'start' && ttsEnabled && text.trim().length > 0

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs text-primary-600 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 duration-100 ease-out',
        forceVisible ? 'opacity-100' : 'opacity-0',
        positionClass,
      )}
    >
      <TooltipProvider>
        <TooltipRoot>
          <TooltipTrigger
            type="button"
            onClick={() => {
              handleCopy().catch(() => {})
            }}
            className="inline-flex items-center justify-center rounded border border-transparent bg-transparent p-1 text-primary-700 hover:text-primary-900 hover:bg-primary-100"
          >
            <HugeiconsIcon
              icon={copied ? Tick02Icon : Copy01Icon}
              size={16}
              strokeWidth={1.6}
            />
          </TooltipTrigger>
          <TooltipContent side="top">Copy</TooltipContent>
        </TooltipRoot>
      </TooltipProvider>

      {showTTS && (
        <TooltipProvider>
          <TooltipRoot>
            <TooltipTrigger
              type="button"
              onClick={() => {
                handleTTS().catch(() => {})
              }}
              disabled={audioState === 'loading'}
              className={cn(
                'inline-flex items-center justify-center rounded border border-transparent bg-transparent p-1 text-primary-700 hover:text-primary-900 hover:bg-primary-100',
                audioState === 'loading' && 'opacity-60 cursor-wait',
              )}
            >
              <HugeiconsIcon
                icon={
                  audioState === 'loading'
                    ? Loading02Icon
                    : audioState === 'playing'
                      ? StopIcon
                      : VolumeHighIcon
                }
                size={16}
                strokeWidth={1.6}
                className={cn(
                  audioState === 'loading' && 'animate-spin',
                )}
              />
            </TooltipTrigger>
            <TooltipContent side="top">
              {audioState === 'loading'
                ? 'Generating speech…'
                : audioState === 'playing'
                  ? 'Stop'
                  : 'Listen'}
            </TooltipContent>
          </TooltipRoot>
        </TooltipProvider>
      )}

      <MessageTimestamp timestamp={timestamp} />
    </div>
  )
}
