import { create } from 'zustand'
import type { AppStatus, Message, OutputData } from '../types'

interface InterviewStore {
  status: AppStatus
  currentQuestionIndex: number
  answers: Record<string, string>
  messages: Message[]
  outputData: OutputData | null

  setStatus: (status: AppStatus) => void
  addMessage: (message: Omit<Message, 'id'> & { id?: string }) => void
  updateMessage: (id: string, updates: Partial<Omit<Message, 'id'>>) => void
  setAnswer: (key: string, value: string) => void
  setCurrentQuestionIndex: (index: number) => void
  setOutputData: (data: OutputData) => void
  reset: () => void
}

const initialState = {
  status: 'auth' as AppStatus,
  currentQuestionIndex: 0,
  answers: {} as Record<string, string>,
  messages: [] as Message[],
  outputData: null,
}

export const useInterviewStore = create<InterviewStore>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: message.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      ],
    })),

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),

  setAnswer: (key, value) =>
    set((state) => ({ answers: { ...state.answers, [key]: value } })),

  setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),

  setOutputData: (data) => set({ outputData: data }),

  reset: () => set(initialState),
}))
