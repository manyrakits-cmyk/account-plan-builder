import { useState } from 'react'
import { useInterviewStore } from '../store/useInterviewStore'

export function AccessGate() {
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)
  const setStatus = useInterviewStore((s) => s.setStatus)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const expected = import.meta.env.VITE_ACCESS_CODE
    if (code === expected) {
      setStatus('interview')
    } else {
      setError(true)
      setCode('')
    }
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
            <label className="block text-sm text-gray-700 mb-1.5">Přístupový kód</label>
            <input
              type="password"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setError(false)
              }}
              placeholder="Zadej přístupový kód"
              autoFocus
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 bg-white transition-colors"
            />
            {error && (
              <p className="text-xs text-red-500 mt-1.5">Nesprávný kód. Zkus to znovu.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!code}
            className="w-full py-2.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-default transition-colors"
          >
            Vstoupit
          </button>
        </form>
      </div>
    </div>
  )
}
