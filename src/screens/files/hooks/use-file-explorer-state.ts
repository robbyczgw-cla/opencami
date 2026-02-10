import { create } from 'zustand'
import type { ViewMode, SortBy } from '../types'

interface FileExplorerState {
  currentPath: string
  viewMode: ViewMode
  sortBy: SortBy
  sortAsc: boolean
  selectedFiles: Set<string>
  editingFile: string | null
  
  // Actions
  navigateTo: (path: string) => void
  openInEditor: (filePath: string) => void
  closeEditor: () => void
  setViewMode: (mode: ViewMode) => void
  setSortBy: (sortBy: SortBy) => void
  toggleSort: () => void
  selectFile: (path: string) => void
  deselectFile: (path: string) => void
  clearSelection: () => void
  toggleFileSelection: (path: string) => void
}

export const useFileExplorerState = create<FileExplorerState>((set, get) => ({
  currentPath: '/',
  viewMode: 'list',
  sortBy: 'name',
  sortAsc: true,
  selectedFiles: new Set(),
  editingFile: null,

  navigateTo: (path: string) => {
    set({
      currentPath: path,
      selectedFiles: new Set(), // Clear selection when navigating
    })
  },

  setViewMode: (mode: ViewMode) => {
    set({ viewMode: mode })
  },

  setSortBy: (sortBy: SortBy) => {
    const currentSortBy = get().sortBy
    set({
      sortBy,
      // If switching to the same sort, toggle direction
      sortAsc: currentSortBy === sortBy ? !get().sortAsc : true,
    })
  },

  toggleSort: () => {
    set((state) => ({ sortAsc: !state.sortAsc }))
  },

  selectFile: (path: string) => {
    set((state) => {
      const newSelection = new Set(state.selectedFiles)
      newSelection.add(path)
      return { selectedFiles: newSelection }
    })
  },

  deselectFile: (path: string) => {
    set((state) => {
      const newSelection = new Set(state.selectedFiles)
      newSelection.delete(path)
      return { selectedFiles: newSelection }
    })
  },

  clearSelection: () => {
    set({ selectedFiles: new Set() })
  },

  openInEditor: (filePath: string) => {
    // Navigate to the file's directory and open editor
    const dir = filePath.includes('/') ? filePath.slice(0, filePath.lastIndexOf('/')) || '/' : '/'
    set({
      currentPath: dir,
      editingFile: filePath,
      selectedFiles: new Set(),
    })
  },

  closeEditor: () => {
    set({ editingFile: null })
  },

  toggleFileSelection: (path: string) => {
    const { selectedFiles, selectFile, deselectFile } = get()
    if (selectedFiles.has(path)) {
      deselectFile(path)
    } else {
      selectFile(path)
    }
  },
}))