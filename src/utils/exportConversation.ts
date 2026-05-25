import type { ConversationExport, Message, ApiMessage, OutputData, AppStatus } from '../types'
import type { AccountPlan } from '../types/account-plan'

interface ExportParams {
  clientName: string
  accountOwner: string
  projectId: string
  status: AppStatus
  messages: Message[]
  chatHistory: ApiMessage[]
  extractedData: Partial<AccountPlan> | null
  researchDraft: Partial<AccountPlan> | null
  outputData: OutputData | null
}

export function downloadConversation(params: ExportParams): void {
  const data: ConversationExport = {
    version: 1,
    type: 'account_plan_conversation',
    metadata: {
      clientName: params.clientName,
      accountOwner: params.accountOwner,
      projectId: params.projectId,
      exportedAt: new Date().toISOString(),
      status: params.status,
    },
    messages: params.messages,
    chatHistory: params.chatHistory,
    extractedData: params.extractedData,
    researchDraft: params.researchDraft,
    outputData: params.outputData,
  }

  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeName = params.clientName.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const date = new Date().toISOString().slice(0, 10)
  a.download = `conversation-${safeName}-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadJson(data: Partial<AccountPlan>, clientName: string): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeName = clientName.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  a.download = `account-plan-draft-${safeName}.json`
  a.click()
  URL.revokeObjectURL(url)
}
