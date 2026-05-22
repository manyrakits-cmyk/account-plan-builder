export interface Message {
  id: string
  role: 'ai' | 'user'
  content: string
  isTyping?: boolean
}

export interface OutputData {
  markdown: string
  json: string
}

export type AppStatus = 'auth' | 'interview' | 'generating' | 'done'
