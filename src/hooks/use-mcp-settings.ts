import { useCallback, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * MCP Settings Hook
 * 
 * Manages Model Context Protocol (MCP) server configurations.
 * MCP enables AI applications to connect to external tools and data sources
 * via a standardized JSON-RPC 2.0 protocol.
 * 
 * Reference: https://modelcontextprotocol.io/specification/2025-11-25
 */

export type McpTransport = 'stdio' | 'sse' | 'http'

export type McpServerConfig = {
  /** Unique identifier for this server */
  id: string
  /** Display name */
  name: string
  /** Server endpoint URL or command */
  endpoint: string
  /** Transport type: stdio (local command), sse (Server-Sent Events), http (Streamable HTTP) */
  transport: McpTransport
  /** Whether this server is enabled */
  enabled: boolean
  /** Optional description */
  description?: string
  /** Optional API key for authenticated servers */
  apiKey?: string
  /** Environment variables for stdio transport */
  env?: Record<string, string>
  /** Command arguments for stdio transport */
  args?: string[]
  /** Custom headers for HTTP/SSE transport */
  headers?: Record<string, string>
  /** Timeout in milliseconds */
  timeout?: number
  /** Date added */
  createdAt: number
  /** Last updated */
  updatedAt: number
}

export type McpSettings = {
  /** Whether MCP integration is enabled globally */
  mcpEnabled: boolean
  /** Show MCP tools in chat messages */
  showMcpTools: boolean
  /** List of configured MCP servers */
  servers: McpServerConfig[]
}

type McpSettingsState = {
  settings: McpSettings
  updateSettings: (updates: Partial<McpSettings>) => void
  addServer: (server: Omit<McpServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => McpServerConfig
  updateServer: (id: string, updates: Partial<Omit<McpServerConfig, 'id' | 'createdAt'>>) => void
  removeServer: (id: string) => void
  toggleServer: (id: string) => void
  reorderServers: (fromIndex: number, toIndex: number) => void
}

const DEFAULT_MCP_SETTINGS: McpSettings = {
  mcpEnabled: true,
  showMcpTools: true,
  servers: [],
}

function generateId(): string {
  return `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export const useMcpSettingsStore = create<McpSettingsState>()(
  persist(
    (set) => ({
      settings: { ...DEFAULT_MCP_SETTINGS },
      
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      addServer: (serverData) => {
        const now = Date.now()
        const newServer: McpServerConfig = {
          ...serverData,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          settings: {
            ...state.settings,
            servers: [...state.settings.servers, newServer],
          },
        }))
        return newServer
      },

      updateServer: (id, updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            servers: state.settings.servers.map((server) =>
              server.id === id
                ? { ...server, ...updates, updatedAt: Date.now() }
                : server
            ),
          },
        })),

      removeServer: (id) =>
        set((state) => ({
          settings: {
            ...state.settings,
            servers: state.settings.servers.filter((s) => s.id !== id),
          },
        })),

      toggleServer: (id) =>
        set((state) => ({
          settings: {
            ...state.settings,
            servers: state.settings.servers.map((server) =>
              server.id === id
                ? { ...server, enabled: !server.enabled, updatedAt: Date.now() }
                : server
            ),
          },
        })),

      reorderServers: (fromIndex, toIndex) =>
        set((state) => {
          const servers = [...state.settings.servers]
          const [removed] = servers.splice(fromIndex, 1)
          servers.splice(toIndex, 0, removed)
          return {
            settings: {
              ...state.settings,
              servers,
            },
          }
        }),
    }),
    {
      name: 'mcp-settings',
      version: 1,
    }
  )
)

export type McpServerStatus = {
  id: string
  status: 'unknown' | 'connecting' | 'connected' | 'error'
  error?: string
  tools?: string[]
  lastChecked?: number
}

/**
 * Hook for accessing and managing MCP settings
 */
export function useMcpSettings() {
  const settings = useMcpSettingsStore((state) => state.settings)
  const updateSettings = useMcpSettingsStore((state) => state.updateSettings)
  const addServer = useMcpSettingsStore((state) => state.addServer)
  const updateServer = useMcpSettingsStore((state) => state.updateServer)
  const removeServer = useMcpSettingsStore((state) => state.removeServer)
  const toggleServer = useMcpSettingsStore((state) => state.toggleServer)
  const reorderServers = useMcpSettingsStore((state) => state.reorderServers)

  const [serverStatuses, setServerStatuses] = useState<Map<string, McpServerStatus>>(new Map())
  const [isChecking, setIsChecking] = useState(false)

  // Get enabled servers
  const enabledServers = settings.servers.filter((s) => s.enabled)

  // Check server status (placeholder - actual implementation would connect to server)
  const checkServerStatus = useCallback(async (serverId: string): Promise<McpServerStatus> => {
    const server = settings.servers.find((s) => s.id === serverId)
    if (!server) {
      return { id: serverId, status: 'error', error: 'Server not found' }
    }

    // For now, return unknown status - actual implementation would:
    // 1. For stdio: spawn process and send initialize request
    // 2. For sse/http: make HTTP request to endpoint
    return {
      id: serverId,
      status: 'unknown',
      lastChecked: Date.now(),
    }
  }, [settings.servers])

  // Check all server statuses
  const checkAllServers = useCallback(async () => {
    setIsChecking(true)
    const newStatuses = new Map<string, McpServerStatus>()
    
    for (const server of settings.servers) {
      const status = await checkServerStatus(server.id)
      newStatuses.set(server.id, status)
    }
    
    setServerStatuses(newStatuses)
    setIsChecking(false)
  }, [settings.servers, checkServerStatus])

  return {
    settings,
    updateSettings,
    addServer,
    updateServer,
    removeServer,
    toggleServer,
    reorderServers,
    enabledServers,
    serverStatuses,
    isChecking,
    checkServerStatus,
    checkAllServers,
  }
}

/**
 * Get MCP settings for use outside React components
 */
export function getMcpSettings(): McpSettings {
  return useMcpSettingsStore.getState().settings
}

/**
 * Check if MCP is globally enabled
 */
export function useMcpEnabled(): boolean {
  return useMcpSettingsStore((state) => state.settings.mcpEnabled)
}

/**
 * Get all enabled MCP servers
 */
export function useEnabledMcpServers(): McpServerConfig[] {
  return useMcpSettingsStore((state) => 
    state.settings.servers.filter((s) => s.enabled)
  )
}
