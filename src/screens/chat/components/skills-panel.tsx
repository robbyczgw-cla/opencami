import { useState, useMemo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Download04Icon,
  Tick01Icon,
  Loading02Icon,
  Search01Icon,
  RefreshIcon,
  Shield01Icon,
  ArrowLeft01Icon,
  ArrowUpRight01Icon,
  Calendar01Icon,
} from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTab } from '@/components/ui/tabs'
import {
  useInstalledSkills,
  useExploreSkills,
  useSearchSkills,
  useInstallSkill,
  useUpdateSkill,
} from '@/hooks/use-skills'
import type { ExploreSkill } from '@/hooks/use-skills'

// Known trusted publishers
const TRUSTED_PUBLISHERS = new Set([
  'openclaw',
  'clawhub',
  'anthropic',
  'robbyczgw-cla',
])

const VERIFIED_DOWNLOAD_THRESHOLD = 100

type BadgeType = 'verified' | 'community' | 'installed'

function getBadgeInfo(
  skill: ExploreSkill,
  isInstalled: boolean
): { type: BadgeType; label: string } {
  if (isInstalled) {
    return { type: 'installed', label: 'Installed' }
  }
  const publisher = skill.publisher || skill.author || ''
  const downloads = skill.stats?.downloads || 0
  if (TRUSTED_PUBLISHERS.has(publisher.toLowerCase()) || downloads >= VERIFIED_DOWNLOAD_THRESHOLD) {
    return { type: 'verified', label: 'Verified' }
  }
  return { type: 'community', label: 'Community' }
}

function TrustBadge({ type, label }: { type: BadgeType; label: string }) {
  const styles = {
    verified: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    community: 'bg-primary-50 text-primary-500 border-primary-100',
    installed: 'bg-sky-50 text-sky-600 border-sky-100',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full border ${styles[type]}`}
      title={`${label} Skill`}
    >
      <HugeiconsIcon
        icon={type === 'installed' ? Tick01Icon : Shield01Icon}
        size={10}
        strokeWidth={2}
      />
      {label}
    </span>
  )
}

function SkillCard({
  skill,
  installed,
  installing,
  onInstall,
  onUpdate,
  updating,
  showUpdate,
  onClick,
}: {
  skill: ExploreSkill
  installed: boolean
  installing: boolean
  onInstall: () => void
  onUpdate?: () => void
  updating?: boolean
  showUpdate?: boolean
  onClick?: () => void
}) {
  const slug = skill.slug || ''
  const name = skill.displayName || slug
  const summary = skill.summary
  const version = skill.version || skill.latestVersion?.version || ''
  const downloads = skill.stats?.downloads
  const badge = getBadgeInfo(skill, installed)

  return (
    <div
      className={`
        group rounded-lg border border-primary-100 bg-surface p-4
        transition-all duration-150 ease-out
        ${onClick ? 'cursor-pointer hover:border-primary-200 hover:shadow-sm' : ''}
      `}
      onClick={onClick}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="text-[13px] font-semibold text-primary-900 leading-tight truncate">
          {name}
        </h4>
        {version && (
          <span className="shrink-0 text-[10px] font-mono text-primary-400">
            {version}
          </span>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <p className="text-xs text-primary-500 leading-relaxed line-clamp-2 mb-3">
          {summary}
        </p>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between pt-2 border-t border-primary-50">
        <div className="flex items-center gap-2">
          <TrustBadge {...badge} />
          {downloads !== undefined && downloads > 0 && (
            <span className="text-[11px] text-primary-400 flex items-center gap-1">
              <HugeiconsIcon icon={Download04Icon} size={11} strokeWidth={1.5} />
              {downloads.toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {showUpdate && onUpdate && (
            <button
              onClick={onUpdate}
              disabled={!!updating}
              className="text-[11px] font-medium text-primary-500 hover:text-primary-700 transition-colors duration-150 disabled:opacity-50"
            >
              {updating ? (
                <HugeiconsIcon icon={Loading02Icon} size={12} className="animate-spin" />
              ) : (
                'Update'
              )}
            </button>
          )}
          {!installed && (
            <button
              onClick={onInstall}
              disabled={installing}
              className="text-[11px] font-medium text-primary-600 hover:text-primary-800 transition-colors duration-150 disabled:opacity-50"
            >
              {installing ? (
                <HugeiconsIcon icon={Loading02Icon} size={12} className="animate-spin" />
              ) : (
                'Install'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

function SkillDetailView({
  skill,
  installed,
  installing,
  onInstall,
  onBack,
}: {
  skill: ExploreSkill
  installed: boolean
  installing: boolean
  onInstall: () => void
  onBack: () => void
}) {
  const slug = skill.slug || ''
  const name = skill.displayName || slug
  const version = skill.version || skill.latestVersion?.version || ''
  const badge = getBadgeInfo(skill, installed)
  const downloads = skill.stats?.downloads || 0

  const tags = skill.tags
    ? Array.isArray(skill.tags)
      ? skill.tags
      : Object.keys(skill.tags).filter((k) => k !== 'latest')
    : []

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-500 hover:text-primary-700 transition-colors duration-150"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2} />
        Back to browse
      </button>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-primary-900 leading-tight">
              {name}
            </h3>
            {version && (
              <span className="text-xs font-mono text-primary-400">
                v{version}
              </span>
            )}
          </div>
          <TrustBadge {...badge} />
        </div>

        {skill.summary && (
          <p className="text-sm text-primary-600 leading-relaxed">
            {skill.summary}
          </p>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-6 py-4 border-y border-primary-100">
        <div>
          <div className="text-lg font-semibold text-primary-900">
            {formatNumber(downloads)}
          </div>
          <div className="text-[11px] text-primary-400 uppercase tracking-wide">
            Downloads
          </div>
        </div>
        {skill.stats?.versions !== undefined && (
          <div>
            <div className="text-lg font-semibold text-primary-900">
              {skill.stats.versions}
            </div>
            <div className="text-[11px] text-primary-400 uppercase tracking-wide">
              Versions
            </div>
          </div>
        )}
        {skill.stats?.stars !== undefined && skill.stats.stars > 0 && (
          <div>
            <div className="text-lg font-semibold text-primary-900">
              {skill.stats.stars}
            </div>
            <div className="text-[11px] text-primary-400 uppercase tracking-wide">
              Stars
            </div>
          </div>
        )}
      </div>

      {/* Version info */}
      {skill.latestVersion?.changelog && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-primary-700 uppercase tracking-wide">
              Latest Release
            </h4>
            {skill.latestVersion.createdAt && (
              <span className="text-[11px] text-primary-400 flex items-center gap-1">
                <HugeiconsIcon icon={Calendar01Icon} size={11} strokeWidth={1.5} />
                {formatDate(skill.latestVersion.createdAt)}
              </span>
            )}
          </div>
          <p className="text-sm text-primary-600 leading-relaxed">
            {skill.latestVersion.changelog}
          </p>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-medium text-primary-500 bg-primary-50 px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Metadata */}
      {(skill.createdAt || skill.updatedAt) && (
        <div className="text-[11px] text-primary-400 space-y-0.5">
          {skill.createdAt && <div>Published {formatDate(skill.createdAt)}</div>}
          {skill.updatedAt && <div>Last updated {formatDate(skill.updatedAt)}</div>}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {installed ? (
          <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-50 text-emerald-600 text-sm font-medium border border-emerald-100">
            <HugeiconsIcon icon={Tick01Icon} size={15} strokeWidth={2} />
            Installed
          </div>
        ) : (
          <Button
            onClick={onInstall}
            disabled={installing}
            className="flex-1"
            size="sm"
          >
            {installing ? (
              <>
                <HugeiconsIcon icon={Loading02Icon} size={14} className="animate-spin mr-1.5" />
                Installing…
              </>
            ) : (
              'Install Skill'
            )}
          </Button>
        )}
        <a
          href={`https://www.clawhub.ai/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-800 transition-colors duration-150"
        >
          View on ClawHub
          <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} strokeWidth={1.5} />
        </a>
      </div>
    </div>
  )
}

function InstalledTab() {
  const { skills, loading, error, refresh } = useInstalledSkills()
  const { update, updating } = useUpdateSkill()

  const handleUpdate = async (name: string) => {
    try {
      await update(name)
      void refresh()
    } catch {
      // handled in hook
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <HugeiconsIcon icon={Loading02Icon} size={18} className="animate-spin text-primary-300" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 py-8 text-center">{error}</div>
    )
  }

  if (skills.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-primary-400">No skills installed</p>
        <p className="text-xs text-primary-300 mt-1">Browse the catalog to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {skills.map((skill) => (
        <SkillCard
          key={skill.name}
          skill={{ slug: skill.name, displayName: skill.name, version: skill.version }}
          installed
          installing={false}
          onInstall={() => {}}
          onUpdate={() => handleUpdate(skill.name)}
          updating={updating === skill.name}
          showUpdate
        />
      ))}
    </div>
  )
}

function BrowseTab() {
  const [sort, setSort] = useState('trending')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSkill, setSelectedSkill] = useState<ExploreSkill | null>(null)
  const { skills: exploreSkills, loading: exploreLoading, error: exploreError } = useExploreSkills(sort, 25)
  const { skills: searchResults, loading: searchLoading } = useSearchSkills(searchQuery)
  const { skills: installedSkills } = useInstalledSkills()
  const { install, installing } = useInstallSkill()

  const installedSet = useMemo(
    () => new Set(installedSkills.map((s) => s.name)),
    [installedSkills],
  )

  const refreshInstalled = useInstalledSkills().refresh

  const handleInstall = async (slug: string) => {
    try {
      await install(slug)
      void refreshInstalled()
    } catch {
      // handled in hook
    }
  }

  const isSearching = searchQuery.trim().length > 0
  const skills = isSearching ? searchResults : exploreSkills
  const loading = isSearching ? searchLoading : exploreLoading

  if (selectedSkill) {
    const slug = selectedSkill.slug || ''
    const name = selectedSkill.displayName || slug
    const isInstalled = installedSet.has(slug) || installedSet.has(name)

    return (
      <SkillDetailView
        skill={selectedSkill}
        installed={isInstalled}
        installing={installing === slug}
        onInstall={() => handleInstall(slug)}
        onBack={() => setSelectedSkill(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <HugeiconsIcon
          icon={Search01Icon}
          size={15}
          strokeWidth={1.5}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-300"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search skills…"
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-primary-100 bg-surface placeholder:text-primary-300 focus:outline-none focus:border-primary-300 transition-colors duration-150"
        />
      </div>

      {/* Sort dropdown */}
      {!isSearching && (
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="text-xs text-primary-600 rounded-md border border-primary-100 bg-surface px-2 py-1.5 focus:outline-none focus:border-primary-300 transition-colors duration-150"
        >
          <option value="trending">Trending</option>
          <option value="newest">Newest</option>
          <option value="downloads">Most Downloads</option>
        </select>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <HugeiconsIcon icon={Loading02Icon} size={18} className="animate-spin text-primary-300" />
        </div>
      ) : exploreError && !isSearching ? (
        <div className="text-sm text-red-500 py-8 text-center">{exploreError}</div>
      ) : skills.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-primary-400">
            {isSearching ? 'No skills found' : 'No skills available'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {skills.map((skill: ExploreSkill) => {
            const slug = skill.slug || (skill as { name?: string }).name || ''
            const name = skill.displayName || slug
            return (
              <SkillCard
                key={slug}
                skill={skill}
                installed={installedSet.has(slug) || installedSet.has(name)}
                installing={installing === slug}
                onInstall={() => handleInstall(slug)}
                onClick={() => setSelectedSkill(skill)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export function SkillsPanel() {
  const [tab, setTab] = useState('installed')

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3">
        <h2 className="text-base font-semibold text-primary-900 mb-4">Skills</h2>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList variant="default" className="gap-2 *:data-[slot=tab-indicator]:duration-0">
            <TabsTab value="installed">
              <span className="text-xs">Installed</span>
            </TabsTab>
            <TabsTab value="browse">
              <span className="text-xs">Browse</span>
            </TabsTab>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {tab === 'installed' ? <InstalledTab /> : <BrowseTab />}
      </div>
    </div>
  )
}
