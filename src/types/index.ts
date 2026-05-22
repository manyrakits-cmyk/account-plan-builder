import type { AccountPlan } from './account-plan'

export interface Message {
  id: string
  role: 'ai' | 'user'
  content: string
  isTyping?: boolean
}

export interface ApiMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface OutputData {
  markdown: string
  json: string
}

export type AppStatus = 'auth' | 'onboarding' | 'project_list' | 'interview' | 'generating' | 'done'

export interface SavedProject {
  id: string
  clientName: string
  currentUser: string
  status: 'in_progress' | 'done'
  createdAt: string
  updatedAt: string
  messages: Message[]
  chatHistory: ApiMessage[]
  researchDraft: Partial<AccountPlan> | null
  extractedData: Partial<AccountPlan> | null
  outputData: OutputData | null
}
