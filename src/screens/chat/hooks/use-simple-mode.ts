/**
 * Simple mode hook — reads URL parameters to enable a simplified UI.
 *
 * Usage:
 *   ?mode=simple          → hides settings, search, folders, context meter, etc.
 *   ?agent=NAME           → filters sessions to `agent:NAME:*`
 *   ?mode=simple&agent=X  → both at once
 */
export function useSimpleMode() {
  const params = new URLSearchParams(window.location.search)
  return {
    isSimple: params.get('mode') === 'simple',
    agentFilter: params.get('agent') || null,
  }
}
