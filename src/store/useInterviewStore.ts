import { create } from 'zustand'
import type { AccountPlan } from '../types/account-plan'
import type { ApiMessage, AppStatus, Message, OutputData, SavedProject } from '../types'

interface InterviewStore {
  status: AppStatus
  currentUser: string
  activeProjectId: string | null
  projectCreatedAt: string | null
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
  ensureProjectId: () => { id: string; createdAt: string }
  loadProjectState: (project: SavedProject) => void
  resetInterview: () => void
  reset: () => void
}

const initialState = {
  status: 'auth' as AppStatus,
  currentUser: '',
  activeProjectId: null,
  projectCreatedAt: null,
  messages: [] as Message[],
  chatHistory: [] as ApiMessage[],
  researchDraft: null,
  extractedData: null,
  outputData: null,
}

export const useInterviewStore = create<InterviewStore>((set, get) => ({
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

  ensureProjectId: () => {
    let { activeProjectId, projectCreatedAt } = get()
    if (!activeProjectId) {
      activeProjectId = `proj_${Date.now()}`
      projectCreatedAt = new Date().toISOString()
      set({ activeProjectId, projectCreatedAt })
    }
    return { id: activeProjectId, createdAt: projectCreatedAt! }
  },

  loadProjectState: (project) =>
    set({
      activeProjectId: project.id,
      projectCreatedAt: project.createdAt,
      messages: project.messages,
      chatHistory: project.chatHistory,
      researchDraft: project.researchDraft,
      extractedData: project.extractedData,
      outputData: project.outputData,
      status: project.status === 'done' ? 'done' : 'interview',
    }),

  resetInterview: () =>
    set({
      messages: [],
      chatHistory: [],
      researchDraft: null,
      extractedData: null,
      outputData: null,
      activeProjectId: null,
      projectCreatedAt: null,
      status: 'interview',
    }),

  reset: () => set(initialState),
}))
