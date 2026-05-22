import { useState } from 'react'
import { useInterviewStore } from '../store/useInterviewStore'
import { deleteProject, formatProjectDate, listProjects, loadProject } from '../utils/storage'

export function ProjectListScreen() {
  const [projects, setProjects] = useState(listProjects)
  const { currentUser, loadProjectState, resetInterview, setStatus } = useInterviewStore()

  function handleNew() {
    resetInterview()
    setStatus('interview')
  }

  function handleLoad(id: string) {
    const project = loadProject(id)
    if (!project) return
    loadProjectState(project)
  }

  function handleDelete(id: string, clientName: string) {
    if (!window.confirm(`Smazat "${clientName}"?`)) return
    deleteProject(id)
    setProjects(listProjects())
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-base font-medium text-gray-900">Account Plany</h1>
            {currentUser && <p className="text-xs text-gray-400 mt-0.5">{currentUser}</p>}
          </div>
          <button
            onClick={handleNew}
            className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            + Nový Account Plan
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-gray-400">Žádné uložené projekty.</p>
            <button
              onClick={handleNew}
              className="mt-4 text-sm text-gray-600 underline hover:text-gray-900"
            >
              Začni první rozhovor
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {projects.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.clientName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatProjectDate(p.updatedAt)} · {p.currentUser}
                  </p>
                </div>

                <span
                  className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    p.status === 'done'
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {p.status === 'done' ? 'Hotovo' : 'Rozpracováno'}
                </span>

                <button
                  onClick={() => handleLoad(p.id)}
                  className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors shrink-0"
                >
                  {p.status === 'done' ? 'Zobrazit' : 'Pokračovat'}
                </button>

                <button
                  onClick={() => handleDelete(p.id, p.clientName)}
                  className="text-xs text-gray-300 hover:text-red-400 transition-colors shrink-0"
                  title="Smazat"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
