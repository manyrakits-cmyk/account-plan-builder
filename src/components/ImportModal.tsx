import { useState } from 'react'
import type { ConversationExport, SavedProject } from '../types'
import { saveProject } from '../utils/storage'

interface Props {
  currentUser: string
  onClose: () => void
  onImported: () => void
}

export function ImportModal({ currentUser, onClose, onImported }: Props) {
  const [jsonText, setJsonText] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleImport() {
    setStatus('loading')
    setErrorMsg('')

    let parsed: any
    try {
      const clean = jsonText.replace(/<\/?account_plan_json>/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      setStatus('error')
      setErrorMsg('Neplatný JSON – zkontroluj formát a zkus znovu.')
      return
    }

    if (parsed.type === 'account_plan_conversation') {
      await importConversation(parsed as ConversationExport)
    } else {
      await importAccountPlanJson(parsed)
    }
  }

  async function importConversation(exp: ConversationExport) {
    const clientName = exp.metadata?.clientName || exp.extractedData?.nazevKlienta
    if (!clientName) {
      setStatus('error')
      setErrorMsg('Export neobsahuje název klienta.')
      return
    }

    let outputData = exp.outputData ?? null

    if (exp.metadata.status === 'done' && !outputData && exp.extractedData) {
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extractedData: exp.extractedData }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const { markdown, json } = await res.json()
        outputData = { markdown, json }
      } catch (err: any) {
        setStatus('error')
        setErrorMsg(`Generování selhalo: ${err?.message ?? 'neznámá chyba'}`)
        return
      }
    }

    const project: SavedProject = {
      id: `proj_${Date.now()}`,
      clientName,
      currentUser: exp.metadata.accountOwner || currentUser,
      status: exp.metadata.status === 'done' ? 'done' : 'in_progress',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: exp.messages ?? [],
      chatHistory: exp.chatHistory ?? [],
      researchDraft: exp.researchDraft ?? null,
      extractedData: exp.extractedData ?? null,
      outputData,
    }

    saveProject(project)
    onImported()
    onClose()
  }

  async function importAccountPlanJson(parsed: any) {
    if (!parsed.nazevKlienta) {
      setStatus('error')
      setErrorMsg('JSON musí obsahovat pole "nazevKlienta".')
      return
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedData: parsed }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { markdown, json } = await res.json()

      const project: SavedProject = {
        id: `proj_${Date.now()}`,
        clientName: parsed.nazevKlienta,
        currentUser,
        status: 'done',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
        chatHistory: [],
        researchDraft: parsed,
        extractedData: parsed,
        outputData: { markdown, json },
      }

      saveProject(project)
      onImported()
      onClose()
    } catch (err: any) {
      setStatus('error')
      setErrorMsg(`Generování selhalo: ${err?.message ?? 'neznámá chyba'}`)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">Importovat z předchozí session</h2>
          <p className="text-xs text-gray-400 mt-1">
            Vlož exportovaný rozhovor nebo{' '}
            <code className="font-mono bg-gray-100 px-1 rounded">account_plan_json</code>{' '}
            z předchozí session – formát se detekuje automaticky.
          </p>
        </div>

        <div className="px-6 py-4">
          <textarea
            value={jsonText}
            onChange={(e) => { setJsonText(e.target.value); setStatus('idle') }}
            placeholder={'{\n  "type": "account_plan_conversation",\n  ...\n}\n\nnebo\n\n{\n  "nazevKlienta": "Firma s.r.o.",\n  ...\n}'}
            rows={10}
            autoFocus
            className="w-full text-xs font-mono border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-gray-500 resize-none bg-gray-50"
          />
          {status === 'error' && (
            <p className="text-xs text-red-500 mt-2">{errorMsg}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Zrušit
          </button>
          <button
            onClick={handleImport}
            disabled={!jsonText.trim() || status === 'loading'}
            className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-default transition-colors"
          >
            {status === 'loading' ? 'Importuji…' : 'Importovat'}
          </button>
        </div>
      </div>
    </div>
  )
}
