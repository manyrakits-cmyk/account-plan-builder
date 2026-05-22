import type { SavedProject } from '../types'

const INDEX_KEY = 'ap_index'
const PROJECT_PREFIX = 'ap_proj_'

type ProjectMeta = Pick<SavedProject, 'id' | 'clientName' | 'currentUser' | 'status' | 'createdAt' | 'updatedAt'>

export function listProjects(): ProjectMeta[] {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveProject(project: SavedProject): void {
  try {
    localStorage.setItem(`${PROJECT_PREFIX}${project.id}`, JSON.stringify(project))
    const projects = listProjects()
    const idx = projects.findIndex((p) => p.id === project.id)
    const meta: ProjectMeta = {
      id: project.id,
      clientName: project.clientName,
      currentUser: project.currentUser,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }
    if (idx >= 0) projects[idx] = meta
    else projects.unshift(meta)
    localStorage.setItem(INDEX_KEY, JSON.stringify(projects))
  } catch {
    // localStorage unavailable or full
  }
}

export function loadProject(id: string): SavedProject | null {
  try {
    const raw = localStorage.getItem(`${PROJECT_PREFIX}${id}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function deleteProject(id: string): void {
  try {
    localStorage.removeItem(`${PROJECT_PREFIX}${id}`)
    const projects = listProjects().filter((p) => p.id !== id)
    localStorage.setItem(INDEX_KEY, JSON.stringify(projects))
  } catch {
    // ignore
  }
}

export function formatProjectDate(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'dnes'
  if (diffDays === 1) return 'včera'
  if (diffDays < 7) return `před ${diffDays} dny`
  return date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })
}
