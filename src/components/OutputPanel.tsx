import { useState } from 'react'
import type { OutputData } from '../types'

interface Props {
  data: OutputData
}

export function OutputPanel({ data }: Props) {
  const [activeTab, setActiveTab] = useState<'markdown' | 'json'>('markdown')
  const [copied, setCopied] = useState(false)

  const content = activeTab === 'markdown' ? data.markdown : data.json

  function handleCopy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleDownload() {
    const ext = activeTab === 'markdown' ? 'md' : 'json'
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `account-plan.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <h3 className="text-base font-medium text-gray-900 mb-4">Vygenerovaný Account Plan</h3>

      <div className="flex gap-2 mb-3">
        {(['markdown', 'json'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'px-4 py-1.5 text-xs rounded-lg border transition-colors',
              activeTab === tab
                ? 'bg-gray-100 border-gray-400 text-gray-900'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50',
            ].join(' ')}
          >
            {tab === 'markdown' ? 'Confluence text' : 'JSON'}
          </button>
        ))}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
        <pre className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-mono">
          {content}
        </pre>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={handleCopy}
          className="px-4 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
        >
          {copied ? '✓ Zkopírováno' : 'Kopírovat'}
        </button>
        <button
          onClick={handleDownload}
          className="px-4 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
        >
          Stáhnout .{activeTab === 'markdown' ? 'md' : 'json'}
        </button>
      </div>
    </div>
  )
}
