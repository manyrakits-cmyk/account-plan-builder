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

export type AppStatus = 'auth' | 'onboarding' | 'interview' | 'generating' | 'done'
