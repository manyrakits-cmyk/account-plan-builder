import { useState } from 'react'
import { useInterviewStore } from '../store/useInterviewStore'

export function OnboardingScreen() {
  const [name, setName] = useState('')
  const { setCurrentUser, setStatus } = useInterviewStore()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCurrentUser(name.trim())
    setStatus('project_list')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-gray-900">Account Plan Interview</h1>
          <p className="text-sm text-gray-400 mt-1">Bootiq interní nástroj</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Jak se jmenuješ?</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tvoje jméno"
              autoFocus
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 bg-white transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-2.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-default transition-colors"
          >
            Začít
          </button>
        </form>
      </div>
    </div>
  )
}
