import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { gatewayRpc } from '../../server/gateway'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

function readApiKeysFromConfig(): { elevenlabs?: string; openai?: string } {
  try {
    const cfgPath = join(homedir(), '.openclaw', 'openclaw.json')
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'))
    return {
      elevenlabs: cfg?.messages?.tts?.elevenlabs?.apiKey || undefined,
      openai: cfg?.env?.OPENAI_API_KEY || process.env.OPENAI_API_KEY || undefined,
    }
  } catch {
    return {}
  }
}

/**
 * API Route: /api/stt
 *
 * Converts speech to text using the best available provider:
 * 1. ElevenLabs Scribe v2 (if API key configured)
 * 2. OpenAI Whisper (if API key configured)
 * 3. Browser Web Speech API (client-side only, no server call needed)
 *
 * Accepts multipart form data with audio file.
 * Returns JSON: { ok: true, text: "...", provider: "elevenlabs"|"openai" }
 */

type GatewayConfigResponse = {
  config?: {
    messages?: {
      tts?: {
        elevenlabs?: {
          apiKey?: string
        }
        openai?: {
          apiKey?: string
        }
      }
    }
    env?: Record<string, string>
  }
}

async function sttElevenLabs(
  audioBlob: Blob,
  apiKey: string,
  language?: string,
): Promise<{ text: string }> {
  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.webm')
  formData.append('model_id', 'scribe_v2')
  if (language) {
    formData.append('language_code', language)
  }

  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
    },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ElevenLabs STT error: ${err}`)
  }

  const data = (await res.json()) as { text?: string }
  return { text: data.text || '' }
}

async function sttOpenAI(
  audioBlob: Blob,
  apiKey: string,
  language?: string,
): Promise<{ text: string }> {
  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.webm')
  formData.append('model', 'whisper-1')
  if (language) {
    formData.append('language', language)
  }

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI Whisper error: ${err}`)
  }

  const data = (await res.json()) as { text?: string }
  return { text: data.text || '' }
}

export const Route = createFileRoute('/api/stt')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const formData = await request.formData()

          const audioFile = formData.get('audio')
          const provider =
            (formData.get('provider') as string | null)?.trim() || 'auto'
          const language =
            (formData.get('language') as string | null)?.trim() || undefined

          if (!audioFile || !(audioFile instanceof Blob)) {
            return json(
              { ok: false, error: 'No audio file provided' },
              { status: 400 },
            )
          }

          // Get config from Gateway (same pattern as TTS)
          const configRes =
            await gatewayRpc<GatewayConfigResponse>('config.get', {})
          const ttsConfig = configRes?.config?.messages?.tts
          const env = configRes?.config?.env || {}

          // config.get redacts API keys — read directly from config file
          const directKeys = readApiKeysFromConfig()
          const elevenLabsKey =
            directKeys.elevenlabs ||
            ttsConfig?.elevenlabs?.apiKey ||
            env.ELEVENLABS_API_KEY ||
            env.XI_API_KEY
          const openaiKey =
            directKeys.openai ||
            ttsConfig?.openai?.apiKey ||
            env.OPENAI_API_KEY

          const errors: string[] = []

          // 1. If specific provider requested, try that first
          if (provider === 'elevenlabs' && elevenLabsKey) {
            try {
              const result = await sttElevenLabs(
                audioFile,
                elevenLabsKey,
                language,
              )
              return json({
                ok: true,
                text: result.text,
                provider: 'elevenlabs',
              })
            } catch (e) {
              errors.push(e instanceof Error ? e.message : String(e))
            }
          }

          if (provider === 'openai' && openaiKey) {
            try {
              const result = await sttOpenAI(audioFile, openaiKey, language)
              return json({
                ok: true,
                text: result.text,
                provider: 'openai',
              })
            } catch (e) {
              errors.push(e instanceof Error ? e.message : String(e))
            }
          }

          // 2. Auto mode OR fallback after specific provider failed
          const tried = new Set<string>()
          if (errors.length > 0) tried.add(provider)

          if (provider === 'auto' || errors.length > 0) {
            if (elevenLabsKey && !tried.has('elevenlabs')) {
              try {
                const result = await sttElevenLabs(
                  audioFile,
                  elevenLabsKey,
                  language,
                )
                return json({
                  ok: true,
                  text: result.text,
                  provider: 'elevenlabs',
                })
              } catch (e) {
                errors.push(e instanceof Error ? e.message : String(e))
              }
            }

            if (openaiKey && !tried.has('openai')) {
              try {
                const result = await sttOpenAI(audioFile, openaiKey, language)
                return json({
                  ok: true,
                  text: result.text,
                  provider: 'openai',
                })
              } catch (e) {
                errors.push(e instanceof Error ? e.message : String(e))
              }
            }
          }

          // No server-side provider available
          return json(
            {
              ok: false,
              error:
                errors.length > 0
                  ? `All STT providers failed: ${errors.join('; ')}`
                  : 'No STT provider configured. Use browser Web Speech API as fallback.',
            },
            { status: 502 },
          )
        } catch (err) {
          return json(
            {
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
