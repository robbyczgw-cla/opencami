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
  StarCircleIcon,
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

// Known trusted publishers (add more as needed)
const TRUSTED_PUBLISHERS = new Set([
  'openclaw',
  'clawhub',
  'anthropic',
  'robbyczgw-cla',
])

// Minimum downloads to be considered "verified" by popularity
const VERIFIED_DOWNLOAD_THRESHOLD = 100

type SecurityBadgeType = 'verified' | 'community' | 'installed'

function getSecurityBadge(
  skill: ExploreSkill,
  isInstalled: boolean
): { type: SecurityBadgeType; label: string; color: string } {
  if (isInstalled) {
    return { type: 'installed', label: 'Installed', color: 'text-blue-500' }
  }

  const publisher = skill.publisher || skill.author || ''
  const downloads = skill.stats?.downloads || 0

  if (TRUSTED_PUBLISHERS.has(publisher.toLowerCase()) || downloads >= VERIFIED_DOWNLOAD_THRESHOLD) {
    return { type: 'verified', label: 'Verified', color: 'text-green-500' }
  }

  return { type: 'community', label: 'Community', color: 'text-primary-400' }
}

function SecurityBadge({ type, label, color }: { type: SecurityBadgeType; label: string; color: string }) {
  return (
    <div className={`flex items-center gap-1 ${color}`} title={`${label} Skill`}>
      <HugeiconsIcon
        icon={type === 'installed' ? Tick01Icon : Shield01Icon}
        size={12}
        strokeWidth={1.5}
      />
      <span className="text-[10px] font-medium">{label}</span>
    </div>
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

  const badge = getSecurityBadge(skill, installed)

  return (
    <div
      className={`rounded-lg border border-primary-200 bg-surface p-3 flex flex-col gap-2 ${onClick ? 'cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-primary-800 truncate">{name}</div>
            <SecurityBadge {...badge} />
          </div>
          {summary && (
            <div className="text-xs text-primary-500 mt-0.5 line-clamp-2">{summary}</div>
          )}
        </div>
        {version && (
          <span className="shrink-0 text-[10px] font-mono bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded">
            v{version}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        {downloads !== undefined ? (
          <span className="text-[11px] text-primary-400 flex items-center gap-1">
            <HugeiconsIcon icon={Download04Icon} size={12} strokeWidth={1.5} />
            {downloads.toLocaleString()}
          </span>
        ) : (
          <span />
        )}
        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          {showUpdate && onUpdate && (
            <Button
              size="sm"
              variant="outline"
              onClick={onUpdate}
              disabled={!!updating}
              className="text-xs h-7 px-2"
            >
              {updating ? (
                <HugeiconsIcon icon={Loading02Icon} size={14} className="animate-spin" />
              ) : (
                <>
                  <HugeiconsIcon icon={RefreshIcon} size={14} strokeWidth={1.5} />
                  Update
                </>
              )}
            </Button>
          )}
          {installed ? (
            <span className="text-xs text-green-600 flex items-center gap-1 px-2 h-7">
              <HugeiconsIcon icon={Tick01Icon} size={14} />
              Installed
            </span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={onInstall}
              disabled={installing}
              className="text-xs h-7 px-2"
            >
              {installing ? (
                <HugeiconsIcon icon={Loading02Icon} size={14} className="animate-spin" />
              ) : (
                'Install'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return 'Unknown'
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
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
  const badge = getSecurityBadge(skill, installed)

  const tags = skill.tags
    ? Array.isArray(skill.tags)
      ? skill.tags
      : Object.keys(skill.tags).filter((k) => k !== 'latest')
    : []

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-1 rounded hover:bg-primary-100 transition-colors text-primary-600"
          aria-label="Back to browse"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={1.5} />
        </button>
        <h3 className="text-lg font-semibold text-primary-800 flex-1 truncate">{name}</h3>
        <SecurityBadge {...badge} />
      </div>

      {/* Version badge */}
      {version && (
        <span className="inline-block text-xs font-mono bg-primary-100 text-primary-600 px-2 py-1 rounded">
          v{version}
        </span>
      )}

      {/* Summary/Description */}
      {skill.summary && (
        <div className="text-sm text-primary-600 leading-relaxed">
          {skill.summary}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-primary-50 p-3">
          <div className="flex items-center gap-1.5 text-primary-400 mb-1">
            <HugeiconsIcon icon={Download04Icon} size={14} strokeWidth={1.5} />
            <span className="text-xs">Downloads</span>
          </div>
          <div className="text-lg font-semibold text-primary-800">
            {(skill.stats?.downloads || 0).toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg bg-primary-50 p-3">
          <div className="flex items-center gap-1.5 text-primary-400 mb-1">
            <HugeiconsIcon icon={StarCircleIcon} size={14} strokeWidth={1.5} />
            <span className="text-xs">Stars</span>
          </div>
          <div className="text-lg font-semibold text-primary-800">
            {(skill.stats?.stars || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Version info */}
      {skill.latestVersion && (
        <div className="rounded-lg border border-primary-200 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-primary-600">Latest Version</span>
            <span className="text-xs font-mono text-primary-500">v{skill.latestVersion.version}</span>
          </div>
          {skill.latestVersion.createdAt && (
            <div className="flex items-center gap-1.5 text-xs text-primary-400">
              <HugeiconsIcon icon={Calendar01Icon} size={12} strokeWidth={1.5} />
              Released {formatDate(skill.latestVersion.createdAt)}
            </div>
          )}
          {skill.latestVersion.changelog && (
            <div className="text-xs text-primary-500 border-t border-primary-100 pt-2 mt-2">
              <span className="font-medium text-primary-600">Changelog:</span>
              <p className="mt-1 whitespace-pre-wrap">{skill.latestVersion.changelog}</p>
            </div>
          )}
        </div>
      )}

      {/* Additional stats */}
      <div className="text-xs text-primary-400 space-y-1">
        {skill.stats?.versions !== undefined && (
          <div>Total versions: {skill.stats.versions}</div>
        )}
        {skill.createdAt && (
          <div>Created: {formatDate(skill.createdAt)}</div>
        )}
        {skill.updatedAt && (
          <div>Updated: {formatDate(skill.updatedAt)}</div>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        {installed ? (
          <div className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-green-50 text-green-600 text-sm font-medium">
            <HugeiconsIcon icon={Tick01Icon} size={16} />
            Installed
          </div>
        ) : (
          <Button
            onClick={onInstall}
            disabled={installing}
            className="flex-1"
          >
            {installing ? (
              <>
                <HugeiconsIcon icon={Loading02Icon} size={16} className="animate-spin mr-2" />
                Installing...
              </>
            ) : (
              <>
                <HugeiconsIcon icon={Download04Icon} size={16} strokeWidth={1.5} className="mr-2" />
                Install
              </>
            )}
          </Button>
        )}
        <a
          href={`https://www.clawhub.ai/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium rounded-md border border-primary-200 bg-surface text-primary-700 hover:bg-primary-50 transition-colors"
        >
          <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} strokeWidth={1.5} />
          ClawHub
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
      // error is in hook
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-primary-400">
        <HugeiconsIcon icon={Loading02Icon} size={20} className="animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 p-4 text-center">{error}</div>
    )
  }

  if (skills.length === 0) {
    return (
      <div className="text-sm text-primary-400 p-4 text-center">No skills installed</div>
    )
  }

  return (
    <div className="space-y-2">
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
      // error in hook
    }
  }

  const isSearching = searchQuery.trim().length > 0
  const skills = isSearching ? searchResults : exploreSkills
  const loading = isSearching ? searchLoading : exploreLoading

  // Show detail view if a skill is selected
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
    <div className="space-y-3">
      <div className="relative">
        <HugeiconsIcon
          icon={Search01Icon}
          size={16}
          strokeWidth={1.5}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary-400"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search ClawHub..."
          className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-primary-200 bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {!isSearching && (
        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="text-xs rounded-md border border-primary-200 bg-surface px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="trending">Trending</option>
            <option value="newest">Newest</option>
            <option value="downloads">Most Downloads</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8 text-primary-400">
          <HugeiconsIcon icon={Loading02Icon} size={20} className="animate-spin" />
        </div>
      ) : exploreError && !isSearching ? (
        <div className="text-sm text-red-500 p-4 text-center">{exploreError}</div>
      ) : skills.length === 0 ? (
        <div className="text-sm text-primary-400 p-4 text-center">
          {isSearching ? 'No skills found' : 'No skills available'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
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
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-lg font-semibold text-primary-800 mb-3">Skills</h2>
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
