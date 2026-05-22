import { useEffect, useRef, useState } from 'react'
import type { AccountPlan } from '../types/account-plan'
import type { Message } from '../types'
import { useInterviewStore } from '../store/useInterviewStore'
import { ChatBubble } from './ChatBubble'
import { OutputPanel } from './OutputPanel'
import { ProgressBar } from './ProgressBar'

const WELCOME =
  'Ahoj! Pomohu ti vyplnit Account Plan formou přirozeného rozhovoru. Klidně odpovídej jak ti to přijde – sám se zeptám na co ještě chybí. Enter odešle, Shift+Enter nový řádek.'

export function ConversationInterview() {
  const {
    status,
    messages,
    extractedData,
    outputData,
    addMessage,
    updateMessage,
    setExtractedData,
    setStatus,
    setOutputData,
  } = useInterviewStore()

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
    addMessage({ role: 'ai', content: WELCOME })
    setTimeout(() => inputRef.current?.focus(), 300)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isDone = status === 'done'
  const isGenerating = status === 'generating'
  const inputDisabled = isProcessing || isDone || isGenerating

  async function handleSend() {
    if (!inputValue.trim() || inputDisabled) return
    const value = inputValue.trim()
    setInputValue('')
    setIsProcessing(true)

    addMessage({ role: 'user', content: value })

    const apiMessages = buildApiMessages(messages, value)
    const typingId = `typing-${Date.now()}`
    addMessage({ id: typingId, role: 'ai', content: '…', isTyping: true })

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      updateMessage(typingId, { content: data.reply, isTyping: false })

      if (data.isComplete && data.extractedData) {
        setExtractedData(data.extractedData)
        await generateOutput(data.extractedData)
        return
      }
    } catch {
      updateMessage(typingId, {
        content: 'Něco se pokazilo – zkus to znovu.',
        isTyping: false,
      })
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
            {isDone ? 'Dokončeno ✓' : isGenerating ? 'Generuji Account Plan…' : 'Konverzace probíhá'}
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
              placeholder="Napiš odpověď…"
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

function buildApiMessages(storeMessages: Message[], newValue: string) {
  const firstUserIdx = storeMessages.findIndex((m) => m.role === 'user')
  const slice = firstUserIdx >= 0 ? storeMessages.slice(firstUserIdx) : []
  const history = slice
    .filter((m) => !m.isTyping)
    .map((m) => ({
      role: m.role === 'ai' ? ('assistant' as const) : ('user' as const),
      content: m.content,
    }))
  return [...history, { role: 'user' as const, content: newValue }]
}
