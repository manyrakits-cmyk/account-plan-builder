import type { AccountPlan } from '../types/account-plan'
import { downloadJson } from '../utils/exportConversation'

interface Props {
  data: Partial<AccountPlan>
  clientName: string
  onDownloadConversation: () => void
}

export function LiveJsonPanel({ data, clientName, onDownloadConversation }: Props) {
  const json = JSON.stringify(data, null, 2)

  return (
    <div className="mt-6 pt-5 border-t border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-sm font-medium text-gray-700">Průběžná data</span>
          <span className="ml-2 text-xs text-gray-400">aktualizuje se live</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => downloadJson(data, clientName)}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
          >
            Stáhnout JSON
          </button>
          <button
            onClick={onDownloadConversation}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
          >
            Stáhnout rozhovor
          </button>
        </div>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-72 overflow-y-auto">
        <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
          {json}
        </pre>
      </div>
    </div>
  )
}
