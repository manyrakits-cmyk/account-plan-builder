import { create } from 'zustand'
import type { AccountPlan } from '../types/account-plan'
import type { AppStatus, Message, OutputData } from '../types'

interface InterviewStore {
  status: AppStatus
  messages: Message[]
  extractedData: Partial<AccountPlan> | null
  outputData: OutputData | null

  setStatus: (status: AppStatus) => void
  addMessage: (message: Omit<Message, 'id'> & { id?: string }) => void
  updateMessage: (id: string, updates: Partial<Omit<Message, 'id'>>) => void
  setExtractedData: (data: Partial<AccountPlan>) => void
  setOutputData: (data: OutputData) => void
  reset: () => void
}

const initialState = {
  status: 'auth' as AppStatus,
  messages: [] as Message[],
  extractedData: null,
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

  setExtractedData: (data) => set({ extractedData: data }),

  setOutputData: (data) => set({ outputData: data }),

  reset: () => set(initialState),
}))
