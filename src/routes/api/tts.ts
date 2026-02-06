import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { gatewayRpc } from '../../server/gateway'

/**
 * API Route: /api/tts
 *
 * Converts text to speech using ElevenLabs via the Gateway's config.
 * Returns audio/mpeg binary data.
 */

type GatewayConfigResponse = {
  config?: {
    messages?: {
      tts?: {
        elevenlabs?: {
          apiKey?: string
        }
      }
    }
  }
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

          if (!text) {
            return json(
              { ok: false, error: 'No text provided' },
              { status: 400 },
            )
          }

          // Get ElevenLabs API key from Gateway config
          const configRes =
            await gatewayRpc<GatewayConfigResponse>('config.get', {})
          const apiKey =
            configRes?.config?.messages?.tts?.elevenlabs?.apiKey

          if (!apiKey) {
            return json(
              {
                ok: false,
                error: 'TTS not configured (no ElevenLabs API key)',
              },
              { status: 503 },
            )
          }

          const voiceId = voice || '21m00Tcm4TlvDq8ikWAM' // Rachel default

          const ttsRes = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
              method: 'POST',
              headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
                Accept: 'audio/mpeg',
              },
              body: JSON.stringify({
                text: text.substring(0, 5000), // ElevenLabs limit
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                  stability: 0.5,
                  similarity_boost: 0.75,
                },
              }),
            },
          )

          if (!ttsRes.ok) {
            const err = await ttsRes.text()
            return json(
              { ok: false, error: `TTS API error: ${err}` },
              { status: 502 },
            )
          }

          const audioBuffer = await ttsRes.arrayBuffer()

          return new Response(audioBuffer, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Cache-Control': 'public, max-age=3600',
            },
          })
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
