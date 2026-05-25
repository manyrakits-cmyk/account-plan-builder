import type { AccountPlan } from './account-plan'

export interface ConversationExport {
  version: 1
  type: 'account_plan_conversation'
  metadata: {
    clientName: string
    accountOwner: string
    projectId: string
    exportedAt: string
    status: AppStatus
  }
  messages: Message[]
  chatHistory: ApiMessage[]
  extractedData: Partial<AccountPlan> | null
  researchDraft: Partial<AccountPlan> | null
  outputData: OutputData | null
}

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

export interface UploadedFile {
  name: string
  mimeType: string
  data: string // base64 bez data URI prefixu
}

export interface SearchResult {
  title: string
  content: string
  url?: string
}

export interface SearchState {
  status: 'loading' | 'done'
  results?: SearchResult[]
  answer?: string
}

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
