interface Props {
  currentSection: string
  answeredCount: number
  total: number
}

export function ProgressBar({ currentSection, answeredCount, total }: Props) {
  const pct = Math.round((answeredCount / total) * 100)

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-gray-500">Sekce: {currentSection}</span>
        <span className="text-xs text-gray-400">
          {answeredCount}/{total} · {pct}%
        </span>
      </div>
      <div className="h-0.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gray-600 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
