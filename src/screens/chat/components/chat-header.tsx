import { memo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Menu01Icon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { ContextMeter } from './context-meter'

type ChatHeaderProps = {
  activeTitle: string
  wrapperRef?: React.Ref<HTMLDivElement>
  showSidebarButton?: boolean
  onOpenSidebar?: () => void
  totalTokens?: number
  contextTokens?: number
}

function ChatHeaderComponent({
  activeTitle,
  wrapperRef,
  showSidebarButton = false,
  onOpenSidebar,
  totalTokens,
  contextTokens,
}: ChatHeaderProps) {
  return (
    <div
      ref={wrapperRef}
      data-tauri-drag-region
      className="border-b border-primary-200 px-4 h-12 flex min-w-0 items-center overflow-x-hidden bg-surface"
    >
      {showSidebarButton ? (
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onOpenSidebar}
          className="mr-2 text-primary-800 hover:bg-primary-100"
          style={{ WebkitAppRegion: 'no-drag' }}
          aria-label="Open sidebar"
        >
          <HugeiconsIcon icon={Menu01Icon} size={18} strokeWidth={1.6} />
        </Button>
      ) : null}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="truncate text-sm font-medium">{activeTitle}</div>
      </div>
      <ContextMeter
        totalTokens={totalTokens}
        contextTokens={contextTokens}
        className="ml-3 hidden sm:flex"
      />
    </div>
  )
}

const MemoizedChatHeader = memo(ChatHeaderComponent)

export { MemoizedChatHeader as ChatHeader }
