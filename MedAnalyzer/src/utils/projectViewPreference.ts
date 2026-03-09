import { ref } from 'vue'

export type ProjectViewMode = 'split' | 'combined'

const STORAGE_KEY = 'medanalyzer.project-view-mode'
const DEFAULT_MODE: ProjectViewMode = 'split'

function normalizeMode(value: unknown): ProjectViewMode {
  return value === 'combined' ? 'combined' : DEFAULT_MODE
}

function readStoredMode(): ProjectViewMode {
  if (typeof window === 'undefined') return DEFAULT_MODE
  return normalizeMode(window.localStorage.getItem(STORAGE_KEY))
}

export const projectViewMode = ref<ProjectViewMode>(readStoredMode())

export function setProjectViewMode(mode: ProjectViewMode) {
  const normalized = normalizeMode(mode)
  projectViewMode.value = normalized
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, normalized)
  }
}