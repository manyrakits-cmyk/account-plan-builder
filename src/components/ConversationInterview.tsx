import { useEffect, useRef, useState } from 'react'
import type { AccountPlan } from '../types/account-plan'
import type { SavedProject } from '../types'
import { useInterviewStore } from '../store/useInterviewStore'
import { saveProject } from '../utils/storage'
import { downloadConversation } from '../utils/exportConversation'
import { ChatBubble } from './ChatBubble'
import { LiveJsonPanel } from './LiveJsonPanel'
import { OutputPanel } from './OutputPanel'
import { ProgressBar } from './ProgressBar'
import { SearchSuggestionCard } from './SearchSuggestionCard'
import type { SearchState } from '../types'

type Phase = 'waiting_for_client' | 'researching' | 'chatting' | 'error'

export function ConversationInterview() {
  const store = useInterviewStore()
  const {
    status, currentUser, messages, chatHistory,
    researchDraft, extractedData, outputData,
    addMessage, updateMessage, initChatHistory, appendChatHistory,
    setResearchDraft, setExtractedData, setStatus, setOutputData,
    ensureProjectId, resetInterview,
  } = store

  const [phase, setPhase] = useState<Phase>('waiting_for_client')
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchStates, setSearchStates] = useState<Map<string, SearchState>>(new Map())
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const initialized = useRef(false)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (status !== 'done' && messages.length > 1) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [status, messages.length])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // Restoring a saved project that has chat history
    if (messages.length > 0) {
      if (chatHistory.length > 0) setPhase('chatting')
      setTimeout(() => inputRef.current?.focus(), 100)
      return
    }

    // Fresh interview
    const greeting = currentUser ? `Ahoj ${currentUser}!` : 'Ahoj!'
    addMessage({ role: 'ai', content: `${greeting} Pro koho děláme Account Plan? Zadej název klienta.` })
    setTimeout(() => inputRef.current?.focus(), 300)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isDone = status === 'done'
  const isGenerating = status === 'generating'
  const inputDisabled = isProcessing || isDone || isGenerating || phase === 'researching' || phase === 'error'

  // ─── Autosave ───────────────────────────────────────────────────────────────

  function autosave(currentPhase: Phase) {
    const s = useInterviewStore.getState()
    const { id, createdAt } = s.ensureProjectId()
    const clientName =
      s.researchDraft?.nazevKlienta ??
      s.messages.find((m) => m.role === 'user')?.content ??
      'Nový projekt'

    const project: SavedProject = {
      id,
      clientName,
      currentUser: s.currentUser,
      status: s.status === 'done' ? 'done' : 'in_progress',
      createdAt,
      updatedAt: new Date().toISOString(),
      messages: s.messages,
      chatHistory: s.chatHistory,
      researchDraft: s.researchDraft,
      extractedData: s.extractedData,
      outputData: s.outputData,
    }
    saveProject(project)
    void currentPhase // used only for naming clarity
  }

  // ─── Export conversation ─────────────────────────────────────────────────────

  function handleDownloadConversation() {
    const s = useInterviewStore.getState()
    const clientName =
      s.researchDraft?.nazevKlienta ??
      s.messages.find((m) => m.role === 'user')?.content ??
      'projekt'
    downloadConversation({
      clientName,
      accountOwner: s.currentUser,
      projectId: s.activeProjectId ?? `proj_${Date.now()}`,
      status: s.status,
      messages: s.messages,
      chatHistory: s.chatHistory,
      extractedData: s.extractedData,
      researchDraft: s.researchDraft,
      outputData: s.outputData,
    })
  }

  // ─── Mid-interview search ────────────────────────────────────────────────────

  async function runSearch(messageId: string, query: string) {
    setSearchStates((prev) => new Map(prev).set(messageId, { status: 'loading' }))
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.results?.length || data.answer) {
        setSearchStates((prev) => new Map(prev).set(messageId, { status: 'done', results: data.results, answer: data.answer }))
      } else {
        setSearchStates((prev) => { const next = new Map(prev); next.delete(messageId); return next })
      }
    } catch {
      setSearchStates((prev) => { const next = new Map(prev); next.delete(messageId); return next })
    }
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────

  function handleBack() {
    autosave(phase)
    resetInterview()
    setStatus('project_list')
  }

  // ─── Restart (after error) ───────────────────────────────────────────────────

  function handleRestart() {
    const welcomeMsg = useInterviewStore.getState().messages[0]
    resetInterview()
    setStatus('interview')
    useInterviewStore.getState().setCurrentUser(currentUser)
    if (welcomeMsg) useInterviewStore.getState().addMessage(welcomeMsg)
    setPhase('waiting_for_client')
    setInputValue('')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // ─── Send ────────────────────────────────────────────────────────────────────

  async function handleSend() {
    if (!inputValue.trim() || inputDisabled) return
    const value = inputValue.trim()
    setInputValue('')

    if (phase === 'waiting_for_client') {
      addMessage({ role: 'user', content: value })
      await runResearch(value)
    } else {
      await sendChatMessage(value)
    }
  }

  // ─── Research ───────────────────────────────────────────────────────────────

  async function runResearch(companyName: string) {
    setPhase('researching')
    setIsProcessing(true)
    ensureProjectId() // create project ID early so autosave has an ID

    const researchMsgId = `research-${Date.now()}`
    addMessage({ id: researchMsgId, role: 'ai', content: `Dohledávám informace o ${companyName}…`, isTyping: true })

    let draft: Partial<AccountPlan> = { nazevKlienta: companyName }
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName }),
      })
      if (res.ok) {
        const data = await res.json()
        draft = { ...data.draft, nazevKlienta: companyName }
        setResearchDraft(draft)
      }
    } catch {
      // silently continue
    }

    updateMessage(researchMsgId, { content: `Dohledáno. Připravuji otázky k ${companyName}…`, isTyping: true })

    const bootstrap = [{ role: 'user' as const, content: `Klient: ${companyName}` }]
    initChatHistory(bootstrap)

    const typingId = `typing-${Date.now()}`
    addMessage({ id: typingId, role: 'ai', content: '…', isTyping: true })

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: bootstrap, currentUser, initialData: draft }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.detail ?? `HTTP ${res.status}`)
      }
      const data = await res.json()

      updateMessage(researchMsgId, { content: `Mám pár věcí dohledaných o ${companyName}.`, isTyping: false })
      updateMessage(typingId, { content: data.reply, isTyping: false })
      appendChatHistory({ role: 'assistant', content: data.reply })

      if (data.isComplete && data.extractedData) {
        setExtractedData(data.extractedData)
        await generateOutput(data.extractedData)
        return
      }

      setPhase('chatting')
      autosave('chatting')
      setTimeout(() => inputRef.current?.focus(), 100)
    } catch (err: any) {
      updateMessage(researchMsgId, { content: `Dohledávání selhalo.`, isTyping: false })
      updateMessage(typingId, { content: `Chyba: ${err?.message ?? 'neznámá'}`, isTyping: false })
      setPhase('error')
    }

    setIsProcessing(false)
  }

  // ─── Chat ────────────────────────────────────────────────────────────────────

  async function sendChatMessage(value: string) {
    setIsProcessing(true)
    addMessage({ role: 'user', content: value })

    const newHistory = [...chatHistory, { role: 'user' as const, content: value }]
    appendChatHistory({ role: 'user', content: value })

    const typingId = `typing-${Date.now()}`
    addMessage({ id: typingId, role: 'ai', content: '…', isTyping: true })

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory, currentUser, initialData: researchDraft }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.detail ?? `HTTP ${res.status}`)
      }
      const data = await res.json()

      updateMessage(typingId, { content: data.reply, isTyping: false })
      appendChatHistory({ role: 'assistant', content: data.reply })

      if (data.searchQuery) {
        void runSearch(typingId, data.searchQuery)
      }

      if (data.isComplete && data.extractedData) {
        setExtractedData(data.extractedData)
        await generateOutput(data.extractedData)
        return
      }

      autosave('chatting')
      setTimeout(() => inputRef.current?.focus(), 100)
    } catch (err: any) {
      updateMessage(typingId, { content: `Chyba: ${err?.message ?? 'neznámá'}`, isTyping: false })
      setPhase('error')
    }

    setIsProcessing(false)
  }

  // ─── Generate output ─────────────────────────────────────────────────────────

  async function generateOutput(extracted: Partial<AccountPlan>) {
    setStatus('generating')
    const genId = `gen-${Date.now()}`
    addMessage({ id: genId, role: 'ai', content: 'Výborně! Generuji Account Plan…', isTyping: true })

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedData: extracted }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      updateMessage(genId, { content: 'Hotovo! Account Plan je připravený níže.', isTyping: false })
      setOutputData({ markdown: data.markdown, json: data.json })
      setStatus('done')
      autosave('chatting')
    } catch {
      updateMessage(genId, { content: 'Generování se nezdařilo. Zkus to znovu.', isTyping: false })
      setStatus('interview')
    }

    setIsProcessing(false)
  }

  // ─── Input handlers ──────────────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInputValue(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-base font-medium text-gray-900">Account Plan Interview</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {isDone
                ? 'Dokončeno ✓'
                : isGenerating
                  ? 'Generuji Account Plan…'
                  : phase === 'researching'
                    ? 'Dohledávám data…'
                    : 'Konverzace probíhá'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {messages.length > 1 && (
              <button
                onClick={handleDownloadConversation}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                title="Stáhnout celý rozhovor jako JSON"
              >
                Stáhnout rozhovor ↓
              </button>
            )}
            <button
              onClick={handleBack}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
            >
              ← Projekty
            </button>
          </div>
        </div>

        {/* Section progress */}
        {!isDone && <ProgressBar data={extractedData} />}

        {/* Chat */}
        <div className="flex flex-col gap-3 mb-4 min-h-48">
          {messages.map((msg) => (
            <div key={msg.id}>
              <ChatBubble role={msg.role} content={msg.content} isTyping={msg.isTyping} />
              {msg.role === 'ai' && searchStates.has(msg.id) && (
                <SearchSuggestionCard state={searchStates.get(msg.id)!} />
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Error recovery */}
        {phase === 'error' && !isDone && (
          <div className="flex items-center gap-3 mt-2 mb-4">
            <p className="text-xs text-gray-400">Chat API není dostupné.</p>
            <button
              onClick={handleRestart}
              className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
            >
              Začít znovu
            </button>
          </div>
        )}

        {/* Input */}
        {!isDone && !isGenerating && phase !== 'error' && (
          <div>
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={phase === 'waiting_for_client' ? 'Název klienta…' : 'Napiš odpověď…'}
                rows={2}
                disabled={inputDisabled}
                className="flex-1 resize-none min-h-12 max-h-40 px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-gray-500 bg-white disabled:opacity-50 leading-relaxed transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || inputDisabled}
                className="h-12 px-5 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-700 disabled:opacity-40 disabled:cursor-default transition-colors whitespace-nowrap"
              >
                Odeslat
              </button>
            </div>

            {phase === 'chatting' && !inputDisabled && (
              <button
                onClick={() => sendChatMessage('přeskočit')}
                className="mt-2 text-xs text-gray-400 underline hover:text-gray-600 transition-colors"
              >
                přeskočit téma
              </button>
            )}
          </div>
        )}

        {/* Back to projects after completion */}
        {isDone && (
          <button
            onClick={handleBack}
            className="mt-4 text-xs text-gray-500 underline hover:text-gray-700"
          >
            ← Zpět na seznam projektů
          </button>
        )}

        {/* Live JSON preview during interview */}
        {!isDone && !isGenerating && extractedData && (
          <LiveJsonPanel
            data={extractedData}
            clientName={
              researchDraft?.nazevKlienta ??
              messages.find((m) => m.role === 'user')?.content ??
              'projekt'
            }
            onDownloadConversation={handleDownloadConversation}
          />
        )}

        {/* Output */}
        {isDone && outputData && <OutputPanel data={outputData} />}
      </div>
    </div>
  )
}
