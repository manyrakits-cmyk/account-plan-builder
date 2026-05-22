import Anthropic from '@anthropic-ai/sdk'

export const config = { maxDuration: 30 }

const SYSTEM_PROMPT = `Jsi research asistent. Dohledej maximum informací o zadané firmě z veřejných zdrojů. Sestav draft Account Planu.

Vyplň co víš s jistotou. Pole která nevíš nech prázdná nebo označ jako "k ověření".

Vrať POUZE čistý JSON (bez markdown bloků) v tomto schématu:
{
  "nazevKlienta": "...",
  "obor": "...",
  "velikostFirmy": "...",
  "stavVztahu": null,
  "stakeholderi": null,
  "governance": null,
  "oblastiSpoluprace": null,
  "rocniObjem": null,
  "rozlozeniBudgetu": null,
  "strategickaRizika": [],
  "oportunity": [],
  "strategickeCile": [],
  "klicoveAktivity": [],
  "hypotezy": [
    "...",
    "..."
  ]
}

Pole "hypotezy" obsahuje 3-5 konkrétních tvrzení k ověření s uživatelem.
Příklady hypotéz:
- "Orea Hotels jsou hotelový řetězec s 20+ hotely v ČR, ~600 zaměstnanců – sedí?"
- "Primární oblast spolupráce je IT pro hotelový provoz – nebo něco jiného?"
- "Roční objem spolupráce kolem 4 mil. CZK – nebo jiné číslo?"`

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end()

  const { companyName } = req.body ?? {}
  if (!companyName?.trim()) {
    return res.status(400).json({ error: 'Missing companyName' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    // Try with web_search tool (beta)
    const messages: any[] = [
      { role: 'user', content: `Dohledej informace o firmě: "${companyName.trim()}" a sestav draft Account Planu s hypotézami k ověření.` },
    ]

    let finalText = ''

    for (let i = 0; i < 5; i++) {
      const response: any = await (client.messages.create as any)(
        {
          model: 'claude-sonnet-4-5',
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages,
        },
        { headers: { 'anthropic-beta': 'web-search-2025-03-05' } },
      )

      const textBlocks = response.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text as string)

      if (response.stop_reason === 'end_turn') {
        finalText = textBlocks.join('')
        break
      }

      if (response.stop_reason === 'tool_use') {
        messages.push({ role: 'assistant', content: response.content })
        const toolResults = response.content
          .filter((b: any) => b.type === 'tool_use')
          .map((b: any) => ({ type: 'tool_result', tool_use_id: b.id, content: '' }))
        if (toolResults.length > 0) {
          messages.push({ role: 'user', content: toolResults })
        }
      } else {
        // Unexpected stop reason – take whatever text we have
        finalText = textBlocks.join('')
        break
      }
    }

    if (!finalText) throw new Error('No output from research')

    const jsonStr = finalText.replace(/^```json\s*|^```\s*|```\s*$/gm, '').trim()
    const parsed = JSON.parse(jsonStr)
    const { hypotezy, ...draft } = parsed

    return res.status(200).json({ draft, hypotezy: hypotezy ?? [] })
  } catch (err) {
    console.error('[research] web_search failed, falling back:', err)

    // Fallback: training knowledge only
    try {
      const fallback = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: `Sestav draft Account Planu pro firmu: "${companyName.trim()}". Použij jen co znáš ze svých tréninkových dat.` },
        ],
      })
      const text = fallback.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as any).text as string)
        .join('')
      const jsonStr = text.replace(/^```json\s*|^```\s*|```\s*$/gm, '').trim()
      const parsed = JSON.parse(jsonStr)
      const { hypotezy, ...draft } = parsed
      return res.status(200).json({ draft, hypotezy: hypotezy ?? [] })
    } catch {
      return res.status(200).json({ draft: { nazevKlienta: companyName }, hypotezy: [] })
    }
  }
}
