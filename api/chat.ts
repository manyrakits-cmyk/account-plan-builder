import Anthropic from '@anthropic-ai/sdk'
import { AGENT_SYSTEM_PROMPT } from '../src/prompts/agent'

export const config = { maxDuration: 30 }

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end()

  const { messages } = req.body ?? {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing messages' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: AGENT_SYSTEM_PROMPT,
      messages,
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    const tagMatch = text.match(/<account_plan_json>([\s\S]*?)<\/account_plan_json>/)
    if (tagMatch) {
      const jsonRaw = tagMatch[1].trim().replace(/^```json|^```|```$/gm, '').trim()
      const extractedData = JSON.parse(jsonRaw)
      const reply = text.replace(/<account_plan_json>[\s\S]*?<\/account_plan_json>/, '').trim()
      return res.status(200).json({ reply, isComplete: true, extractedData })
    }

    return res.status(200).json({ reply: text, isComplete: false, extractedData: null })
  } catch (err) {
    console.error('[chat]', err)
    return res.status(500).json({ error: 'Chat failed' })
  }
}
