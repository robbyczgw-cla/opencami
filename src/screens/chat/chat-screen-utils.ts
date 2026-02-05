import type { GatewayMessage } from './types'

type OptimisticMessagePayload = {
  clientId: string
  optimisticId: string
  optimisticMessage: GatewayMessage
}

export function createOptimisticMessage(
  body: string,
): OptimisticMessagePayload {
  const clientId = crypto.randomUUID()
  const optimisticId = `opt-${clientId}`
  const timestamp = Date.now()
  const optimisticMessage: GatewayMessage = {
    role: 'user',
    content: [{ type: 'text', text: body }],
    __optimisticId: optimisticId,
    clientId,
    status: 'sending',
    timestamp,
  }

  return { clientId, optimisticId, optimisticMessage }
}
