'use client'

import { useEffect, useState, type ReactNode } from 'react'

/**
 * Wrapper component that only renders children on the client.
 * Use this to prevent hydration mismatches for components that generate
 * dynamic IDs or access browser-only APIs during render.
 */
export function ClientOnly({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return <>{children}</>
}
