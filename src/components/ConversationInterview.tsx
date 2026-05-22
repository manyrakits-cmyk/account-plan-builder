import { useEffect, useRef, useState } from 'react'
import type { AccountPlan } from '../types/account-plan'
import { useInterviewStore } from '../store/useInterviewStore'
import { ChatBubble } from './ChatBubble'
import { OutputPanel } from './OutputPanel'
import { ProgressBar } from './ProgressBar'

type Phase = 'waiting_for_client' | 'researching' | 'chatting'

export function ConversationInterview() {
  const {
    status,
    currentUser,
    messages,
    chatHistory,
    researchDraft,
    extractedData,
    outputData,
    addMessage,
    updateMessage,
    initChatHistory,
    appendChatHistory,
    setResearchDraft,
    setExtractedData,
    setStatus,
    setOutputData,
  } = useInterviewStore()

  const [phase, setPhase] = useState<Phase>('waiting_for_client')
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
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
    const greeting = currentUser ? `Ahoj ${currentUser}!` : 'Ahoj!'
    addMessage({
      role: 'ai',
      content: `${greeting} Pro koho děláme Account Plan? Zadej název klienta.`,
    })
    setTimeout(() => inputRef.current?.focus(), 300)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isDone = status === 'done'
  const isGenerating = status === 'generating'
  const inputDisabled = isProcessing || isDone || isGenerating || phase === 'researching'

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

  async function runResearch(companyName: string) {
    setPhase('researching')
    setIsProcessing(true)

    const researchMsgId = `research-${Date.now()}`
    addMessage({
      id: researchMsgId,
      role: 'ai',
      content: `Dohledávám informace o ${companyName}…`,
      isTyping: true,
    })

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
      // silently continue with minimal draft
    }

    updateMessage(researchMsgId, {
      content: `Dohledáno. Připravuji otázky k ${companyName}…`,
      isTyping: true,
    })

    // Bootstrap chat with synthetic first user message
    const bootstrap = [{ role: 'user' as const, content: `Klient: ${companyName}` }]
    initChatHistory(bootstrap)

    const typingId = `typing-${Date.now()}`
    addMessage({ id: typingId, role: 'ai', content: '…', isTyping: true })

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: bootstrap,
          currentUser,
          initialData: draft,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      // Replace research loading bubble with research summary, then show agent reply
      updateMessage(researchMsgId, {
        content: `Mám pár věcí dohledaných o ${companyName}.`,
        isTyping: false,
      })
      updateMessage(typingId, { content: data.reply, isTyping: false })
      appendChatHistory({ role: 'assistant', content: data.reply })

      if (data.isComplete && data.extractedData) {
        setExtractedData(data.extractedData)
        await generateOutput(data.extractedData)
        return
      }

      setPhase('chatting')
    } catch {
      updateMessage(researchMsgId, { content: `Dohledávání selhalo, pokračujeme dál.`, isTyping: false })
      updateMessage(typingId, { content: 'Něco se pokazilo. Zkus to znovu.', isTyping: false })
      setPhase('chatting')
    }

    setIsProcessing(false)
  }

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
        body: JSON.stringify({
          messages: newHistory,
          currentUser,
          initialData: researchDraft,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      updateMessage(typingId, { content: data.reply, isTyping: false })
      appendChatHistory({ role: 'assistant', content: data.reply })

      if (data.isComplete && data.extractedData) {
        setExtractedData(data.extractedData)
        await generateOutput(data.extractedData)
        return
      }
    } catch {
      updateMessage(typingId, { content: 'Něco se pokazilo – zkus to znovu.', isTyping: false })
    }

    setIsProcessing(false)
  }

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
    } catch {
      updateMessage(genId, { content: 'Generování se nezdařilo. Zkus to znovu.', isTyping: false })
      setStatus('interview')
    }

    setIsProcessing(false)
  }

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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-4">
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

        {/* Section progress */}
        {!isDone && <ProgressBar data={extractedData} />}

        {/* Chat */}
        <div className="flex flex-col gap-3 mb-4 min-h-48">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} role={msg.role} content={msg.content} isTyping={msg.isTyping} />
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        {!isDone && !isGenerating && (
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
        )}

        {/* Output */}
        {isDone && outputData && <OutputPanel data={outputData} />}
      </div>
    </div>
  )
}
