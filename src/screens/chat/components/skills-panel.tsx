import { useState, useMemo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Download04Icon,
  Tick01Icon,
  Loading02Icon,
  Search01Icon,
  ArrowDown01Icon,
  RefreshIcon,
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

function SkillCard({
  name,
  summary,
  version,
  downloads,
  installed,
  installing,
  onInstall,
  onUpdate,
  updating,
  showUpdate,
}: {
  name: string
  summary?: string
  version?: string
  downloads?: number
  installed: boolean
  installing: boolean
  onInstall: () => void
  onUpdate?: () => void
  updating?: boolean
  showUpdate?: boolean
}) {
  return (
    <div className="rounded-lg border border-primary-200 bg-surface p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-primary-800 truncate">{name}</div>
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
        <div className="flex gap-1.5">
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
          name={skill.name}
          version={skill.version}
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
                name={name}
                summary={skill.summary}
                version={skill.version || (skill.versions && Array.isArray(skill.versions) ? String((skill.versions[0] as { version?: string })?.version || '') : '')}
                downloads={skill.stats?.downloads}
                installed={installedSet.has(slug) || installedSet.has(name)}
                installing={installing === slug}
                onInstall={() => handleInstall(slug)}
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
