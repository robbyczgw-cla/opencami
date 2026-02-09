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
 * API Route: /api/tts
 *
 * Converts text to speech using the best available provider:
 * 1. ElevenLabs (if API key configured)
 * 2. OpenAI (if API key configured)
 * 3. Edge TTS (free fallback, always available)
 *
 * Returns audio/mpeg binary data.
 */

type GatewayConfigResponse = {
  config?: {
    messages?: {
      tts?: {
        provider?: string
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

async function ttsElevenLabs(
  text: string,
  apiKey: string,
  voice?: string,
): Promise<Response> {
  const voiceId = voice || '21m00Tcm4TlvDq8ikWAM' // Rachel
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: text.substring(0, 5000),
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ElevenLabs error: ${err}`)
  }

  const audioBuffer = await res.arrayBuffer()
  return new Response(audioBuffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

async function ttsOpenAI(
  text: string,
  apiKey: string,
  voice?: string,
): Promise<Response> {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text.substring(0, 4096),
      voice: voice || 'nova',
      response_format: 'mp3',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI TTS error: ${err}`)
  }

  const audioBuffer = await res.arrayBuffer()
  return new Response(audioBuffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

async function ttsEdge(text: string, voice?: string): Promise<Response> {
  const { EdgeTTS } = await import('node-edge-tts')

  const tts = new EdgeTTS()
  await tts.synthesize(
    text.substring(0, 5000),
    voice || 'en-US-AriaNeural',
    {},
  )

  const audioBuffer = await tts.toBuffer()

  return new Response(audioBuffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

export const Route = createFileRoute('/api/tts')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as Record<
            string,
            unknown
          >

          const text =
            typeof body.text === 'string' ? body.text.trim() : ''
          const voice =
            typeof body.voice === 'string' ? body.voice.trim() : ''
          const provider =
            typeof body.provider === 'string'
              ? body.provider.trim()
              : ''

          if (!text) {
            return json(
              { ok: false, error: 'No text provided' },
              { status: 400 },
            )
          }

          // Get TTS config from Gateway
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

          // Determine provider priority
          const preferredProvider =
            provider || ttsConfig?.provider || 'auto'

          // Try providers in order
          const errors: string[] = []

          // 1. If specific provider requested, try that first
          if (
            preferredProvider === 'elevenlabs' &&
            elevenLabsKey
          ) {
            try {
              return await ttsElevenLabs(text, elevenLabsKey, voice)
            } catch (e) {
              errors.push(
                e instanceof Error ? e.message : String(e),
              )
            }
          }

          if (preferredProvider === 'openai' && openaiKey) {
            try {
              return await ttsOpenAI(text, openaiKey, voice)
            } catch (e) {
              errors.push(
                e instanceof Error ? e.message : String(e),
              )
            }
          }

          if (preferredProvider === 'edge') {
            try {
              return await ttsEdge(text, voice)
            } catch (e) {
              errors.push(
                e instanceof Error ? e.message : String(e),
              )
            }
          }

          // 2. Auto mode: try all in order (skip already-attempted provider)
          if (preferredProvider === 'auto' || errors.length > 0) {
            // Try ElevenLabs first (best quality)
            if (elevenLabsKey && preferredProvider !== 'elevenlabs') {
              try {
                return await ttsElevenLabs(
                  text,
                  elevenLabsKey,
                  voice,
                )
              } catch (e) {
                errors.push(
                  e instanceof Error ? e.message : String(e),
                )
              }
            }

            // Try OpenAI
            if (openaiKey && preferredProvider !== 'openai') {
              try {
                return await ttsOpenAI(text, openaiKey, voice)
              } catch (e) {
                errors.push(
                  e instanceof Error ? e.message : String(e),
                )
              }
            }

            // Fallback: Edge TTS (always available, free)
            try {
              return await ttsEdge(text, voice)
            } catch (e) {
              errors.push(
                e instanceof Error ? e.message : String(e),
              )
            }
          }

          // All providers failed
          return json(
            {
              ok: false,
              error: `All TTS providers failed: ${errors.join('; ')}`,
            },
            { status: 502 },
          )
        } catch (err) {
          return json(
            {
              ok: false,
              error:
                err instanceof Error ? err.message : String(err),
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
