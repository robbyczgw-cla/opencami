import { HugeiconsIcon } from '@hugeicons/react'
import {
  Folder01Icon,
  PencilEdit02Icon,
  Settings01Icon,
  SidebarLeft01Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons'
import { AnimatePresence, motion } from 'motion/react'
import { lazy, memo, Suspense, useState } from 'react'
import type { SessionMeta } from '../types'
import { useQueryClient } from '@tanstack/react-query'
import { chatQueryKeys } from '../chat-queries'
import type { HistoryResponse } from '../types'
import { exportConversation, type ExportFormat } from '../utils/export-conversation'

const SettingsDialog = lazy(() =>
  import('./settings-dialog').then((m) => ({ default: m.SettingsDialog })),
)
const SessionExportDialog = lazy(() =>
  import('./sidebar/session-export-dialog').then((m) => ({
    default: m.SessionExportDialog,
  })),
)
import {
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SessionRenameDialog } from './sidebar/session-rename-dialog'
import { SessionDeleteDialog } from './sidebar/session-delete-dialog'
import { SidebarSessions } from './sidebar/sidebar-sessions'
import { cn } from '@/lib/utils'
import { useSimpleMode } from '../hooks/use-simple-mode'
import { useChatSettings } from '../hooks/use-chat-settings'
import { useDeleteSession } from '../hooks/use-delete-session'
import { useRenameSession } from '../hooks/use-rename-session'
import { Button, buttonVariants } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'
import { OpenCamiLogo, OpenCamiText } from '@/components/icons/opencami-logo'

type ChatSidebarProps = {
  sessions: Array<SessionMeta>
  activeFriendlyId: string
  activeSessionKey?: string
  creatingSession: boolean
  onCreateSession: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  onSelectSession?: () => void
  onActiveSessionDelete?: () => void
  onOpenSearch?: () => void
}

function ChatSidebarComponent({
  sessions,
  activeFriendlyId,
  activeSessionKey,
  creatingSession,
  onCreateSession,
  isCollapsed,
  onToggleCollapse,
  onSelectSession,
  onActiveSessionDelete,
  onOpenSearch,
}: ChatSidebarProps) {
  const { isSimple } = useSimpleMode()
  const {
    settingsOpen,
    setSettingsOpen,
    pathsLoading,
    pathsError,
    paths,
    handleOpenSettings,
    closeSettings,
    copySessionsDir,
    copyStorePath,
  } = useChatSettings()
  const { deleteSession } = useDeleteSession()
  const { renameSession } = useRenameSession()
  const transition = {
    duration: 0.15,
    ease: isCollapsed ? 'easeIn' : 'easeOut',
  } as const

  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renameSessionKey, setRenameSessionKey] = useState<string | null>(null)
  const [renameSessionTitle, setRenameSessionTitle] = useState('')

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteSessionKey, setDeleteSessionKey] = useState<string | null>(null)
  const [deleteFriendlyId, setDeleteFriendlyId] = useState<string | null>(null)
  const [deleteSessionTitle, setDeleteSessionTitle] = useState('')

  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportSessionKey, setExportSessionKey] = useState<string | null>(null)
  const [exportFriendlyId, setExportFriendlyId] = useState<string | null>(null)
  const [exportSessionTitle, setExportSessionTitle] = useState('')

  const queryClient = useQueryClient()

  function handleOpenRename(session: SessionMeta) {
    setRenameSessionKey(session.key)
    setRenameSessionTitle(
      session.label || session.title || session.derivedTitle || '',
    )
    setRenameDialogOpen(true)
  }

  function handleSaveRename(newTitle: string) {
    if (renameSessionKey) {
      void renameSession(renameSessionKey, newTitle)
    }
    setRenameDialogOpen(false)
    setRenameSessionKey(null)
  }

  function handleOpenDelete(session: SessionMeta) {
    setDeleteSessionKey(session.key)
    setDeleteFriendlyId(session.friendlyId)
    setDeleteSessionTitle(
      session.label ||
        session.title ||
        session.derivedTitle ||
        session.friendlyId,
    )
    setDeleteDialogOpen(true)
  }

  function handleConfirmDelete() {
    if (deleteSessionKey && deleteFriendlyId) {
      const isActive = deleteFriendlyId === activeFriendlyId
      if (isActive && onActiveSessionDelete) {
        onActiveSessionDelete()
      }
      void deleteSession(deleteSessionKey, deleteFriendlyId, isActive)
    }
    setDeleteDialogOpen(false)
    setDeleteSessionKey(null)
    setDeleteFriendlyId(null)
  }

  function handleOpenExport(session: SessionMeta) {
    setExportSessionKey(session.key)
    setExportFriendlyId(session.friendlyId)
    setExportSessionTitle(
      session.label ||
        session.title ||
        session.derivedTitle ||
        session.friendlyId,
    )
    setExportDialogOpen(true)
  }

  function handleExport(format: ExportFormat) {
    if (exportSessionKey && exportFriendlyId) {
      // Get messages from the query cache
      const historyKey = chatQueryKeys.history(
        exportFriendlyId,
        exportSessionKey,
      )
      const historyData = queryClient.getQueryData(historyKey) as
        | HistoryResponse
        | undefined

      if (historyData?.messages) {
        exportConversation(exportSessionTitle, historyData.messages, format)
      }
    }
    setExportDialogOpen(false)
    setExportSessionKey(null)
    setExportFriendlyId(null)
  }

  const asideProps = {
    className:
      'border-r border-primary-200 h-full overflow-hidden bg-primary-100 flex flex-col',
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 48 : 300 }}
      transition={transition}
      className={asideProps.className}
    >
      <motion.div
        layout
        transition={{ layout: transition }}
        className={cn('flex items-center h-12 px-2 justify-between')}
      >
        <AnimatePresence initial={false}>
          {!isCollapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
            >
              <Link
                to="/new"
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  'w-full pl-1.5 justify-start',
                )}
              >
                <OpenCamiLogo className="size-5" />
                <OpenCamiText />
              </Link>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <TooltipProvider>
          <TooltipRoot>
            <TooltipTrigger
              onClick={onToggleCollapse}
              render={
                <Button size="icon-sm" variant="ghost">
                  <HugeiconsIcon
                    icon={SidebarLeft01Icon}
                    size={20}
                    strokeWidth={1.5}
                  />
                </Button>
              }
            />
            <TooltipContent side="right">
              {isCollapsed ? 'Open Sidebar' : 'Close Sidebar'}
            </TooltipContent>
          </TooltipRoot>
        </TooltipProvider>
      </motion.div>

      <div className="px-2 mb-4 flex flex-col gap-1">
        <motion.div
          layout
          transition={{ layout: transition }}
          className="w-full space-y-2"
        >
          <Button
            disabled={creatingSession}
            variant="ghost"
            size="sm"
            onClick={onCreateSession}
            onMouseUp={onSelectSession}
            className="w-full pl-1.5 justify-start"
          >
            <HugeiconsIcon
              icon={PencilEdit02Icon}
              size={20}
              strokeWidth={1.5}
              className="min-w-5"
            />
            <AnimatePresence initial={false} mode="wait">
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={transition}
                  className="overflow-hidden whitespace-nowrap"
                >
                  New Session
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
          
          {!isSimple && (
            <TooltipProvider>
              <TooltipRoot>
                <TooltipTrigger asChild>
                  <Link
                    to="/files"
                    className={cn(
                      buttonVariants({ variant: 'ghost', size: 'sm' }),
                      'w-full pl-1.5 justify-start',
                    )}
                    onClick={onSelectSession}
                  >
                    <HugeiconsIcon
                      icon={Folder01Icon}
                      size={20}
                      strokeWidth={1.5}
                      className="min-w-5"
                    />
                    <AnimatePresence initial={false} mode="wait">
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={transition}
                          className="overflow-hidden whitespace-nowrap"
                        >
                          Files
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    Files
                  </TooltipContent>
                )}
              </TooltipRoot>
            </TooltipProvider>
          )}
        </motion.div>
        {!isSimple && (
          <motion.div
            layout
            transition={{ layout: transition }}
            className="w-full"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenSearch}
              className="w-full pl-1.5 justify-start"
            >
              <HugeiconsIcon
                icon={Search01Icon}
                size={20}
                strokeWidth={1.5}
                className="min-w-5"
              />
              <AnimatePresence initial={false} mode="wait">
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={transition}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    Search
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
              className="pt-0 flex flex-col w-full min-h-0 h-full"
            >
              <div className="flex-1 min-h-0">
                <SidebarSessions
                  sessions={sessions}
                  activeFriendlyId={activeFriendlyId}
                  activeSessionKey={activeSessionKey}
                  onSelect={onSelectSession}
                  onRename={handleOpenRename}
                  onDelete={handleOpenDelete}
                  onExport={handleOpenExport}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!isSimple && (
        <div className="px-2 py-3 border-t border-primary-200 bg-primary-100">
          <motion.div
            layout
            transition={{ layout: transition }}
            className="w-full"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenSettings}
              title={isCollapsed ? 'Settings' : undefined}
              className="w-full justify-start pl-1.5"
            >
              <HugeiconsIcon
                icon={Settings01Icon}
                size={20}
                strokeWidth={1.5}
                className="min-w-5"
              />
              <AnimatePresence initial={false} mode="wait">
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={transition}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    Settings
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </div>
      )}

      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsDialog
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            pathsLoading={pathsLoading}
            pathsError={pathsError}
            paths={paths}
            onClose={closeSettings}
            onCopySessionsDir={copySessionsDir}
            onCopyStorePath={copyStorePath}
          />
        </Suspense>
      )}

      <SessionRenameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        sessionTitle={renameSessionTitle}
        onSave={handleSaveRename}
        onCancel={() => setRenameDialogOpen(false)}
      />

      <SessionDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        sessionTitle={deleteSessionTitle}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />

      {exportDialogOpen && (
        <Suspense fallback={null}>
          <SessionExportDialog
            open={exportDialogOpen}
            onOpenChange={setExportDialogOpen}
            sessionTitle={exportSessionTitle}
            onExport={handleExport}
            onCancel={() => setExportDialogOpen(false)}
          />
        </Suspense>
      )}
    </motion.aside>
  )
}

function areSessionsEqual(
  prevSessions: Array<SessionMeta>,
  nextSessions: Array<SessionMeta>,
): boolean {
  if (prevSessions === nextSessions) return true
  if (prevSessions.length !== nextSessions.length) return false
  for (let i = 0; i < prevSessions.length; i += 1) {
    const prev = prevSessions[i]
    const next = nextSessions[i]
    if (prev.key !== next.key) return false
    if (prev.friendlyId !== next.friendlyId) return false
    if (prev.label !== next.label) return false
    if (prev.title !== next.title) return false
    if (prev.derivedTitle !== next.derivedTitle) return false
    if (prev.updatedAt !== next.updatedAt) return false
  }
  return true
}

function areSidebarPropsEqual(
  prevProps: ChatSidebarProps,
  nextProps: ChatSidebarProps,
): boolean {
  if (prevProps.activeFriendlyId !== nextProps.activeFriendlyId) return false
  if (prevProps.activeSessionKey !== nextProps.activeSessionKey) return false
  if (prevProps.creatingSession !== nextProps.creatingSession) return false
  if (prevProps.isCollapsed !== nextProps.isCollapsed) return false
  if (!areSessionsEqual(prevProps.sessions, nextProps.sessions)) return false
  return true
}

const MemoizedChatSidebar = memo(ChatSidebarComponent, areSidebarPropsEqual)

export { MemoizedChatSidebar as ChatSidebar }
