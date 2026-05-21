import { useState } from 'react'

interface Props {
  hint: string
}

export function HintBox({ hint }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-gray-400 underline hover:text-gray-600 transition-colors"
      >
        {open ? 'skrýt příklady' : 'zobrazit příklady'}
      </button>
      {open && (
        <div className="mt-2 text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 whitespace-pre-line leading-relaxed">
          {hint}
        </div>
      )}
    </div>
  )
}
