import { create } from 'zustand'
import type { AccountPlan } from '../types/account-plan'
import type { ApiMessage, AppStatus, Message, OutputData } from '../types'

interface InterviewStore {
  status: AppStatus
  currentUser: string
  messages: Message[]
  chatHistory: ApiMessage[]
  researchDraft: Partial<AccountPlan> | null
  extractedData: Partial<AccountPlan> | null
  outputData: OutputData | null

  setStatus: (status: AppStatus) => void
  setCurrentUser: (name: string) => void
  addMessage: (message: Omit<Message, 'id'> & { id?: string }) => void
  updateMessage: (id: string, updates: Partial<Omit<Message, 'id'>>) => void
  initChatHistory: (msgs: ApiMessage[]) => void
  appendChatHistory: (msg: ApiMessage) => void
  setResearchDraft: (draft: Partial<AccountPlan>) => void
  setExtractedData: (data: Partial<AccountPlan>) => void
  setOutputData: (data: OutputData) => void
  reset: () => void
}

const initialState = {
  status: 'auth' as AppStatus,
  currentUser: '',
  messages: [] as Message[],
  chatHistory: [] as ApiMessage[],
  researchDraft: null,
  extractedData: null,
  outputData: null,
}

export const useInterviewStore = create<InterviewStore>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),
  setCurrentUser: (name) => set({ currentUser: name }),

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

  initChatHistory: (msgs) => set({ chatHistory: msgs }),
  appendChatHistory: (msg) =>
    set((state) => ({ chatHistory: [...state.chatHistory, msg] })),

  setResearchDraft: (draft) => set({ researchDraft: draft }),
  setExtractedData: (data) => set({ extractedData: data }),
  setOutputData: (data) => set({ outputData: data }),

  reset: () => set(initialState),
}))
