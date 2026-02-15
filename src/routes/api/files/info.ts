import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { validatePath } from '../../../server/path-utils'
import type { FileSystemError } from '../../../server/filesystem'

type InfoResponse = {
  size: number
}

type ErrorResponse = {
  error: string
  code: string
}

export const Route = createFileRoute('/api/files/info')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const rawPath = url.searchParams.get('path')

          if (!rawPath) {
            return json<ErrorResponse>(
              { 
                error: 'path parameter is required',
                code: 'MISSING_PATH',
              }, 
              { status: 400 }
            )
          }

          // Validate and sanitize the path
          const path = validatePath(rawPath, 'Path parameter')

          const root = process.env.FILES_ROOT?.trim()
            ? resolve(process.env.FILES_ROOT)
            : (process.env.HOME || '/home')
          const absolutePath = resolve(root, path.replace(/^\/+/, ''))

          const stats = await stat(absolutePath)

          return json<InfoResponse>({ size: stats.size })
        } catch (err) {
          const error = err as Error & FileSystemError
          
          if (error.message.includes('invalid characters') || 
              error.message.includes('traversal attempts')) {
            return json<ErrorResponse>(
              {
                error: error.message,
                code: 'INVALID_PATH',
              },
              { status: 400 },
            )
          }

          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return json<ErrorResponse>(
              {
                error: 'File not found',
                code: 'NOT_FOUND',
              },
              { status: 404 },
            )
          }

          if ((error as NodeJS.ErrnoException).code === 'EACCES') {
            return json<ErrorResponse>(
              {
                error: 'Permission denied',
                code: 'PERMISSION_DENIED',
              },
              { status: 403 },
            )
          }

          const status = error.status || 500
          const code = error.code || 'INTERNAL_ERROR'

          return json<ErrorResponse>(
            {
              error: error.message || 'An unexpected error occurred',
              code,
            },
            { status },
          )
        }
      },
    },
  },
})