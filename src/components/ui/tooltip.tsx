import * as React from 'react'
import { cn } from '@/lib/utils'

// Simple CSS-only tooltip to avoid Base UI hydration issues

type TooltipProviderProps = {
  children: React.ReactNode
}

function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>
}

type TooltipRootProps = {
  children: React.ReactNode
}

function TooltipRoot({ children }: TooltipRootProps) {
  return <div className="group relative inline-flex">{children}</div>
}

type TooltipTriggerProps = {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  render?: React.ReactElement
} & React.HTMLAttributes<HTMLElement>

function TooltipTrigger({ children, className, onClick, render, ...props }: TooltipTriggerProps) {
  if (render) {
    return React.cloneElement(render, {
      className: cn(render.props.className, className),
      onClick: onClick || render.props.onClick,
      ...props,
    })
  }
  return (
    <span className={cn('inline-flex', className)} onClick={onClick} {...props}>
      {children}
    </span>
  )
}

type TooltipContentProps = {
  children: React.ReactNode
  className?: string
  side?: 'top' | 'bottom' | 'left' | 'right'
}

function TooltipContent({ children, className, side = 'top' }: TooltipContentProps) {
  const sideClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div
      className={cn(
        'absolute z-50 hidden group-hover:block',
        'rounded-md border border-primary-900 bg-primary-950 px-2 py-1 text-xs text-primary-50 shadow-sm',
        'pointer-events-none whitespace-nowrap',
        sideClasses[side],
        className,
      )}
    >
      {children}
    </div>
  )
}

export { TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent }
