import { useState } from 'react'
import type { SearchState } from '../types'

interface Props {
  state: SearchState
}

export function SearchSuggestionCard({ state }: Props) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  if (state.status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 ml-2 mt-1 mb-1">
        <div className="w-3 h-3 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin shrink-0" />
        Dohledávám na webu…
      </div>
    )
  }

  if (state.status === 'done' && (state.results?.length || state.answer)) {
    return (
      <div className="ml-2 mt-1 mb-1 border border-gray-200 bg-gray-50 rounded-xl p-3 max-w-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">Dohledané informace</span>
          <button
            onClick={() => setDismissed(true)}
            className="text-xs text-gray-300 hover:text-gray-500 transition-colors ml-3 leading-none"
          >
            ✕
          </button>
        </div>

        {state.answer && (
          <p className="text-xs text-gray-700 leading-relaxed mb-2">{state.answer}</p>
        )}

        {state.results?.slice(0, 3).map((r, i) => (
          <div key={i} className={i > 0 ? 'border-t border-gray-200 pt-2 mt-2' : ''}>
            <p className="text-xs font-medium text-gray-700 truncate">{r.title}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{r.content}</p>
          </div>
        ))}
      </div>
    )
  }

  return null
}
