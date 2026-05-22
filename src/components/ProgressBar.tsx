import type { AccountPlan } from '../types/account-plan'

interface SectionDef {
  label: string
  filled: (d: Partial<AccountPlan>) => boolean
}

const SECTIONS: SectionDef[] = [
  { label: 'Základní info', filled: (d) => !!d.nazevKlienta },
  {
    label: 'Stakeholdeři',
    filled: (d) => (d.stakeholderi?.rozhodovaciUroven?.length ?? 0) > 0,
  },
  { label: 'Governance', filled: (d) => !!d.governance?.steering },
  { label: 'Budget', filled: (d) => !!d.rocniObjem },
  { label: 'Rizika', filled: (d) => (d.strategickaRizika?.length ?? 0) > 0 },
  { label: 'Oportunity', filled: (d) => (d.oportunity?.length ?? 0) > 0 },
  { label: 'Cíle', filled: (d) => (d.strategickeCile?.length ?? 0) > 0 },
]

interface Props {
  data: Partial<AccountPlan> | null
}

export function ProgressBar({ data }: Props) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {SECTIONS.map((s) => {
          const ok = data ? s.filled(data) : false
          return (
            <span
              key={s.label}
              className={`text-xs flex items-center gap-1 ${ok ? 'text-gray-700' : 'text-gray-400'}`}
            >
              <span className="font-mono">{ok ? '✓' : '○'}</span>
              {s.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}
