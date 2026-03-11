import { z } from 'zod/v4'

// ─── Gateway WebSocket Frame Schemas ────────────────────────────────────
// These validate the raw JSON frames received over the persistent WS
// connection to the OpenClaw gateway. Using runtime validation (instead
// of `as GatewayFrame`) catches malformed events early with clear errors
// rather than letting undefined values propagate through the codebase.

const GatewayResFrame = z.object({
  type: z.literal('res'),
  id: z.string(),
  ok: z.boolean(),
  payload: z.unknown().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    })
    .optional(),
})

const GatewayEventFrame = z.object({
  type: z.literal('event'),
  event: z.string(),
  payload: z.unknown().optional(),
  seq: z.number().optional(),
  stateVersion: z.number().optional(),
})

const GatewayReqFrame = z.object({
  type: z.literal('req'),
  id: z.string(),
  method: z.string(),
  params: z.unknown().optional(),
})

export const GatewayFrameSchema = z.union([
  GatewayResFrame,
  GatewayEventFrame,
  GatewayReqFrame,
])

export type GatewayFrame = z.infer<typeof GatewayFrameSchema>

// ─── SSE Event Schema (client-side) ─────────────────────────────────────
// Validates the JSON payload inside each SSE `data:` line sent by
// /api/stream.ts to the browser's EventSource.

export const SseEventSchema = z.object({
  event: z.string().optional(),
  payload: z.unknown().optional(),
  seq: z.number().optional(),
  stateVersion: z.number().optional(),
})

export type SseEvent = z.infer<typeof SseEventSchema>
