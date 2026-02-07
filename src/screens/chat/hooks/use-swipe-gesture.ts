import { useCallback, useRef } from 'react'

export type SwipeDirection = 'left' | 'right'

type SwipeGestureOptions = {
  /** Minimum horizontal distance (px) to qualify as a swipe */
  threshold?: number
  /** Only trigger if swipe starts within this many px of the left edge */
  edgeWidth?: number
  /** Called with raw deltaX during swipe movement */
  onMove?: (deltaX: number) => void
  /** Called when swipe completes past threshold */
  onSwipe: (direction: SwipeDirection) => void
  /** Called when swipe is cancelled (didn't meet threshold) */
  onCancel?: () => void
  /** Required swipe direction (limits activation) */
  direction?: SwipeDirection
  /** Whether the gesture is enabled */
  enabled?: boolean
}

type TouchState = {
  startX: number
  startY: number
  tracking: boolean
  /** True once we've determined this is a horizontal swipe (not scroll) */
  directionLocked: boolean
}

/**
 * Returns touch handlers for swipe gesture detection.
 * Avoids interfering with vertical scrolling by requiring horizontal movement
 * to exceed vertical movement before locking gesture direction.
 */
export function useSwipeGesture(options: SwipeGestureOptions) {
  const {
    threshold = 50,
    edgeWidth,
    onMove,
    onSwipe,
    onCancel,
    direction,
    enabled = true,
  } = options

  const touchState = useRef<TouchState>({
    startX: 0,
    startY: 0,
    tracking: false,
    directionLocked: false,
  })

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return
      const touch = e.touches[0]
      if (!touch) return

      if (edgeWidth !== undefined && touch.clientX > edgeWidth) return

      touchState.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        tracking: true,
        directionLocked: false,
      }
    },
    [enabled, edgeWidth],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const state = touchState.current
      if (!state.tracking) return

      const touch = e.touches[0]
      if (!touch) return

      const deltaX = touch.clientX - state.startX
      const deltaY = touch.clientY - state.startY
      const absDeltaX = Math.abs(deltaX)
      const absDeltaY = Math.abs(deltaY)

      if (!state.directionLocked) {
        if (absDeltaX < 5 && absDeltaY < 5) return

        if (absDeltaY > absDeltaX) {
          state.tracking = false
          onCancel?.()
          return
        }

        state.directionLocked = true
      }

      if (direction === 'left' && deltaX > 0) return
      if (direction === 'right' && deltaX < 0) return

      // Prevent scroll while actively swiping horizontally
      e.preventDefault()
      onMove?.(deltaX)
    },
    [direction, onMove, onCancel],
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const state = touchState.current
      if (!state.tracking) return
      state.tracking = false

      const touch = e.changedTouches[0]
      if (!touch) {
        onCancel?.()
        return
      }

      const deltaX = touch.clientX - state.startX
      const absDeltaX = Math.abs(deltaX)

      if (!state.directionLocked || absDeltaX < threshold) {
        onCancel?.()
        return
      }

      const swipeDir: SwipeDirection = deltaX > 0 ? 'right' : 'left'
      if (direction && swipeDir !== direction) {
        onCancel?.()
        return
      }

      onSwipe(swipeDir)
    },
    [direction, onCancel, onSwipe, threshold],
  )

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  }
}
