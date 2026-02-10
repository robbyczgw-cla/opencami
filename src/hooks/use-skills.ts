import { useState, useEffect, useCallback, useRef } from 'react'

export type InstalledSkill = {
  name: string
  version: string
}

export type ExploreSkill = {
  slug: string
  displayName?: string
  summary?: string
  version?: string
  stats?: {
    downloads?: number
    stars?: number
    comments?: number
    installsAllTime?: number
    installsCurrent?: number
    versions?: number
  }
  tags?: Record<string, string> | string[]
  versions?: unknown[]
  createdAt?: number
  updatedAt?: number
  latestVersion?: {
    version: string
    createdAt?: number
    changelog?: string
  }
  publisher?: string
  author?: string
}

export type SearchSkill = {
  slug: string
  displayName: string
  version: string
  summary: string
  score?: number
}

type ApiResponse<T> = { ok: boolean; skills: T[]; error?: string }

async function fetchApi<T>(url: string): Promise<T[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as ApiResponse<T>
  if (!data.ok) throw new Error(data.error || 'Unknown error')
  return data.skills
}

export function useInstalledSkills() {
  const [skills, setSkills] = useState<InstalledSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchApi<InstalledSkill>('/api/skills?action=installed')
      setSkills(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  return { skills, loading, error, refresh }
}

export function useExploreSkills(sort: string, limit: number) {
  const [skills, setSkills] = useState<ExploreSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchApi<ExploreSkill>(`/api/skills?action=explore&sort=${sort}&limit=${limit}`)
      .then((data) => { if (!cancelled) setSkills(data) })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : String(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [sort, limit])

  return { skills, loading, error }
}

export function useSearchSkills(query: string) {
  const [skills, setSkills] = useState<SearchSkill[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!query.trim()) {
      setSkills([])
      setLoading(false)
      return
    }
    setLoading(true)
    timerRef.current = setTimeout(() => {
      fetchApi<SearchSkill>(`/api/skills?action=search&q=${encodeURIComponent(query)}&limit=10`)
        .then(setSkills)
        .catch((err) => setError(err instanceof Error ? err.message : String(err)))
        .finally(() => setLoading(false))
    }, 400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query])

  return { skills, loading, error }
}

export function useMySkills() {
  const [skills, setSkills] = useState<ExploreSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchApi<ExploreSkill>('/api/skills?action=my-skills')
      setSkills(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  return { skills, loading, error, refresh }
}

export function useRecommendedSkills() {
  const [skills, setSkills] = useState<ExploreSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchApi<ExploreSkill>('/api/skills?action=recommended')
      setSkills(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  return { skills, loading, error, refresh }
}

export function useInstallSkill() {
  const [installing, setInstalling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const install = useCallback(async (slug: string) => {
    setInstalling(slug)
    setError(null)
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install', slug }),
      })
      const data = (await res.json()) as { ok: boolean; error?: string }
      if (!data.ok) throw new Error(data.error || 'Install failed')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      throw err
    } finally {
      setInstalling(null)
    }
  }, [])

  return { install, installing, error }
}

export function useUpdateSkill() {
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const update = useCallback(async (slug: string) => {
    setUpdating(slug)
    setError(null)
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', slug }),
      })
      const data = (await res.json()) as { ok: boolean; error?: string }
      if (!data.ok) throw new Error(data.error || 'Update failed')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      throw err
    } finally {
      setUpdating(null)
    }
  }, [])

  return { update, updating, error }
}
