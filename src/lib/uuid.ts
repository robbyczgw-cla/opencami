/**
 * Cross-platform UUID generator
 * Works in both Node.js and browser environments (including non-secure contexts)
 */

// Simple UUID v4 generator using Math.random (for non-secure contexts)
function generateUUIDFallback(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Generate a UUID v4
 * Uses crypto.randomUUID() when available (Node.js and secure browser contexts),
 * falls back to Math.random() implementation for non-secure contexts (HTTP)
 */
export function generateUUID(): string {
  // Try to use native crypto.randomUUID if available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID()
    } catch {
      // Fall through to fallback if crypto.randomUUID fails
    }
  }

  // Fallback for non-secure contexts
  return generateUUIDFallback()
}
