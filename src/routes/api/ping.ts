import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { gatewayConnectCheck, getDeviceStatus } from '../../server/gateway'

export const Route = createFileRoute('/api/ping')({
  server: {
    handlers: {
      GET: async () => {
        try {
          await gatewayConnectCheck()
          const status = getDeviceStatus()
          if (status.isPending) {
            return json(
              {
                ok: false,
                error: 'device pending approval',
                deviceId: status.deviceId,
                approveCommand: `openclaw devices approve ${status.deviceId}`,
              },
              { status: 503 },
            )
          }
          return json({ ok: true, deviceId: status.deviceId, isPending: false })
        } catch (err) {
          const status = getDeviceStatus()
          if (status.isPending) {
            return json(
              {
                ok: false,
                error: 'device pending approval',
                deviceId: status.deviceId,
                approveCommand: `openclaw devices approve ${status.deviceId}`,
              },
              { status: 503 },
            )
          }
          return json(
            {
              ok: false,
              error: err instanceof Error ? err.message : String(err),
              deviceId: status.deviceId,
              isPending: status.isPending,
            },
            { status: 503 },
          )
        }
      },
    },
  },
})
