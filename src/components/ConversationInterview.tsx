import { useEffect, useRef, useState } from 'react'
import { QUESTIONS } from '../data/questions'
import { useInterviewStore } from '../store/useInterviewStore'
import { ChatBubble } from './ChatBubble'
import { HintBox } from './HintBox'
import { OutputPanel } from './OutputPanel'
import { ProgressBar } from './ProgressBar'

const WELCOME =
  'Ahoj! Jsem tady, abych ti pomohl vyplnit Account Plan. Budu se tě ptát postupně – odpovídej stručně, jak ti to přijde přirozené. Enter odešle, Shift+Enter udělá nový řádek. Začínáme.'

export function ConversationInterview() {
  const {
    status,
    currentQuestionIndex,
    messages,
    outputData,
    addMessage,
    updateMessage,
    setAnswer,
    setCurrentQuestionIndex,
    setStatus,
    setOutputData,
  } = useInterviewStore()

  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const initialized = useRef(false)

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Warn before closing with unsaved progress
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

  // Initialize interview on first mount
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    addMessage({ role: 'ai', content: WELCOME })
    setTimeout(() => {
      addMessage({ role: 'ai', content: QUESTIONS[0].q })
      inputRef.current?.focus()
    }, 700)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const currentQuestion = QUESTIONS[currentQuestionIndex]
  const isDone = status === 'done'
  const isGenerating = status === 'generating'
  const inputDisabled = isProcessing || isDone || isGenerating

  async function handleSend() {
    if (!inputValue.trim() || inputDisabled) return
    const value = inputValue.trim()
    setInputValue('')
    await processAnswer(value)
  }

  async function handleSkip() {
    if (inputDisabled) return
    addMessage({ role: 'user', content: '(přeskočeno)' })
    setAnswer(currentQuestion.key, '')
    await advance(currentQuestionIndex + 1)
  }

  async function processAnswer(value: string) {
    setIsProcessing(true)
    addMessage({ role: 'user', content: value })
    setAnswer(currentQuestion.key, value)

    // After client name: trigger background research
    if (currentQuestion.key === 'client_name') {
      await triggerResearch(value)
    }

    await advance(currentQuestionIndex + 1)
    setIsProcessing(false)
  }

  async function triggerResearch(companyName: string) {
    const msgId = `research-${Date.now()}`
    addMessage({
      id: msgId,
      role: 'ai',
      content: `Dohledávám informace o firmě ${companyName}...`,
      isTyping: true,
    })

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: companyName }),
      })
      const data = await res.json()
      updateMessage(msgId, {
        content: data.result
          ? `Co vím o firmě ${companyName}:\n\n${data.result}\n\nMůžeš to v dalších odpovědích potvrdit nebo doplnit.`
          : `O firmě ${companyName} nemám v databázi záznamy – odpověz podle vlastní znalosti.`,
        isTyping: false,
      })
    } catch {
      updateMessage(msgId, {
        content: 'Dohledání neprobehlo – pokračuj podle vlastní znalosti.',
        isTyping: false,
      })
    }
  }

  async function advance(nextIndex: number) {
    if (nextIndex >= QUESTIONS.length) {
      await generateOutput()
      return
    }
    setCurrentQuestionIndex(nextIndex)
    setTimeout(() => {
      addMessage({ role: 'ai', content: QUESTIONS[nextIndex].q })
      inputRef.current?.focus()
    }, 400)
  }

  async function generateOutput() {
    setStatus('generating')
    addMessage({ role: 'ai', content: 'Výborně, to je vše! Generuji Account Plan…', isTyping: true })

    const answers = useInterviewStore.getState().answers

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      // Replace typing bubble with done message
      const typingMsg = useInterviewStore
        .getState()
        .messages.find((m) => m.isTyping)
      if (typingMsg) {
        updateMessage(typingMsg.id, {
          content: 'Hotovo! Account Plan je připravený níže.',
          isTyping: false,
        })
      }

      setOutputData({ markdown: data.markdown, json: data.json })
      setStatus('done')
    } catch {
      const typingMsg = useInterviewStore
        .getState()
        .messages.find((m) => m.isTyping)
      if (typingMsg) {
        updateMessage(typingMsg.id, {
          content: 'Generování se nezdařilo. Zkus to znovu.',
          isTyping: false,
        })
      }
      setStatus('interview')
      setIsProcessing(false)
    }
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
                : currentQuestion
                  ? `Sekce ${currentQuestion.sectionIndex}/7 · ${currentQuestion.section}`
                  : ''}
          </p>
        </div>

        {/* Progress */}
        {!isDone && currentQuestion && (
          <ProgressBar
            currentSection={currentQuestion.section}
            answeredCount={currentQuestionIndex}
            total={QUESTIONS.length}
          />
        )}

        {/* Chat */}
        <div className="flex flex-col gap-3 mb-4 min-h-48">
          {messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              isTyping={msg.isTyping}
            />
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        {!isDone && !isGenerating && (
          <div>
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

            <div className="flex items-center justify-between mt-2 min-h-5">
              {currentQuestion?.hint ? (
                <HintBox hint={currentQuestion.hint} />
              ) : (
                <div />
              )}
              <button
                onClick={handleSkip}
                disabled={inputDisabled}
                className="text-xs text-gray-400 underline hover:text-gray-600 disabled:opacity-40 transition-colors"
              >
                přeskočit
              </button>
            </div>
          </div>
        )}

        {/* Output */}
        {isDone && outputData && <OutputPanel data={outputData} />}
      </div>
    </div>
  )
}
