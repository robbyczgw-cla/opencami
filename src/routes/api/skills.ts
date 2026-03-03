import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { execFile } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

const MY_SKILLS_CONFIG = resolve(process.cwd(), '.clawhub-my-skills.json')

const RECOMMENDED_SKILLS = [
  'web-search-plus',
  'elevenlabs-voices',
  'sports-ticker',
  'personas',
  'agent-chronicle',
  'summarize',
  'weather',
  'muninn',
  'clawd-docs-v2',
  'therapy-mode',
]

const execFileAsync = promisify(execFile)
const ALLOWED_SORTS = new Set(['trending', 'downloads', 'installs', 'newest'])
const SLUG_PATTERN = /^[a-zA-Z0-9/_-]+$/

function parsePositiveInt(input: string | null, fallback: number, max: number): number {
  if (!input) return fallback
  const parsed = Number.parseInt(input, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, max)
}

function parseSort(input: string | null): string {
  if (!input) return 'trending'
  const normalized = input.trim().toLowerCase()
  return ALLOWED_SORTS.has(normalized) ? normalized : 'trending'
}

function parseSlug(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const slug = input.trim()
  if (!slug || !SLUG_PATTERN.test(slug)) return null
  return slug
}

async function runCmd(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync('clawhub', args, {
      encoding: 'utf-8',
      timeout: 30000,
      maxBuffer: 1024 * 1024 * 8,
    })
    return stdout.trim()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Command failed: ${msg}`)
  }
}

function loadMySkillsSlugs(): string[] {
  try {
    if (!existsSync(MY_SKILLS_CONFIG)) return []
    const data = JSON.parse(readFileSync(MY_SKILLS_CONFIG, 'utf-8'))
    return Array.isArray(data.slugs) ? data.slugs : []
  } catch {
    return []
  }
}

function parseInstalledSkills(output: string) {
  if (!output) return []
  return output
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const match = line.match(/^(.+?)\s+v?([\d.]+.*)$/)
      if (match) return { name: match[1].trim(), version: match[2].trim() }
      return { name: line.trim(), version: '' }
    })
}

function parseSearchResults(output: string) {
  if (!output) return []
  return output
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const match = line.match(/^(.+?)\s+v([\d.]+)\s+(.+?)(?:\s+\(([\d.]+)\))?$/)
      if (match) {
        return {
          slug: match[1].trim(),
          displayName: match[1].trim(),
          version: match[2].trim(),
          summary: match[3].trim(),
          score: match[4] ? parseFloat(match[4]) : undefined,
        }
      }
      return { slug: line.trim(), displayName: line.trim(), version: '', summary: '' }
    })
}

export const Route = createFileRoute('/api/skills')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const action = url.searchParams.get('action') || 'installed'

          if (action === 'installed') {
            const output = await runCmd(['list'])
            return json({ ok: true, skills: parseInstalledSkills(output) })
          }

          if (action === 'explore') {
            const sort = parseSort(url.searchParams.get('sort'))
            const limit = parsePositiveInt(url.searchParams.get('limit'), 25, 200)
            const raw = await runCmd(['explore', '--json', '--limit', String(limit), '--sort', sort])
            const output = raw.substring(raw.indexOf('{'))
            try {
              const data = JSON.parse(output)
              return json({ ok: true, skills: Array.isArray(data) ? data : data.items || data.skills || data.results || [] })
            } catch {
              return json({ ok: true, skills: [] })
            }
          }

          if (action === 'search') {
            const q = url.searchParams.get('q') || ''
            const limit = parsePositiveInt(url.searchParams.get('limit'), 10, 200)
            if (!q.trim()) return json({ ok: true, skills: [] })
            const raw = await runCmd(['search', q, '--limit', String(limit)])
            const output = raw.replace(/^- Searching\n?/, '')
            return json({ ok: true, skills: parseSearchResults(output) })
          }

          if (action === 'my-skills' || action === 'recommended') {
            const targetSlugs = action === 'my-skills' ? loadMySkillsSlugs() : RECOMMENDED_SKILLS
            if (targetSlugs.length === 0) {
              return json({ ok: true, skills: [] })
            }
            const slugSet = new Set(targetSlugs)
            const found = new Map<string, unknown>()
            // Fetch multiple sort orders to maximize coverage
            for (const sort of ['downloads', 'installs', 'newest', 'trending']) {
              if (found.size >= slugSet.size) break
              try {
                const raw = await runCmd(['explore', '--json', '--limit', '200', '--sort', sort])
                const output = raw.substring(raw.indexOf('{'))
                const data = JSON.parse(output)
                const items = Array.isArray(data) ? data : data.items || []
                for (const item of items) {
                  if (item.slug && slugSet.has(item.slug) && !found.has(item.slug)) {
                    found.set(item.slug, item)
                  }
                }
              } catch { /* skip this sort */ }
            }
            const skills = Array.from(found.values())
            skills.sort((a: any, b: any) => (b.stats?.downloads || 0) - (a.stats?.downloads || 0))
            return json({ ok: true, skills })
          }

          return json({ ok: false, error: 'Unknown action' }, { status: 400 })
        } catch (err) {
          return json(
            { ok: false, error: err instanceof Error ? err.message : String(err) },
            { status: 500 },
          )
        }
      },
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
          const action = typeof body.action === 'string' ? body.action : ''
          const slug = parseSlug(body.slug)

          if (!slug) return json({ ok: false, error: 'Valid slug is required' }, { status: 400 })

          if (action === 'install') {
            const output = await runCmd(['install', slug, '--no-input'])
            return json({ ok: true, output })
          }

          if (action === 'update') {
            const output = await runCmd(['update', slug, '--no-input'])
            return json({ ok: true, output })
          }

          return json({ ok: false, error: 'Unknown action' }, { status: 400 })
        } catch (err) {
          return json(
            { ok: false, error: err instanceof Error ? err.message : String(err) },
            { status: 500 },
          )
        }
      },
    },
  },
})
