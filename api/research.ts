import Anthropic from '@anthropic-ai/sdk'

export const config = { maxDuration: 30 }

const SYSTEM_PROMPT = `Jsi research asistent. Na základě poskytnutých informací o firmě sestav draft Account Planu.

Vyplň co víš s jistotou. Pole která nevíš nech prázdná.

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
  "hypotezy": ["...", "..."]
}

Pole "hypotezy" obsahuje 3-5 konkrétních tvrzení k ověření s uživatelem ve formátu otázky.
Příklady: "Orea Hotels jsou hotelový řetězec s 20+ hotely v ČR – sedí to?" nebo "Primární oblast spolupráce je IT provoz – nebo něco jiného?"`

async function searchViaTavily(companyName: string): Promise<string> {
  const key = process.env.TAVILY_API_KEY
  if (!key) return ''

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        query: `${companyName} firma profil obor velikost počet zaměstnanců`,
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
      }),
    })
    if (!res.ok) return ''
    const data = await res.json()
    const snippets = (data.results ?? []).map((r: any) => `${r.title}: ${r.content}`).join('\n')
    return data.answer ? `${data.answer}\n\n${snippets}` : snippets
  } catch {
    return ''
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end()

  const { companyName } = req.body ?? {}
  if (!companyName?.trim()) {
    return res.status(400).json({ error: 'Missing companyName' })
  }

  const name = companyName.trim()
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Gather search context (Tavily if available, empty string otherwise)
  const searchContext = await searchViaTavily(name)

  const userMessage = searchContext
    ? `Firma: "${name}"\n\nInformace z vyhledávání:\n${searchContext}\n\nSestav draft Account Planu s hypotézami k ověření.`
    : `Firma: "${name}"\n\nSestav draft Account Planu z tréninkových dat. Pokud firmu neznáš, vyplň jen název a navrhni hypotézy k ověření.`

  const MODELS = ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022']

  for (let i = 0; i < MODELS.length; i++) {
    try {
      const response = await client.messages.create({
        model: MODELS[i],
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      })

      const text = response.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text as string)
        .join('')

      const jsonStr = text.replace(/^```json\s*|^```\s*|```\s*$/gm, '').trim()
      const parsed = JSON.parse(jsonStr)
      const { hypotezy, ...draft } = parsed

      return res.status(200).json({ draft, hypotezy: hypotezy ?? [] })
    } catch (err) {
      if (i === MODELS.length - 1) {
        console.error('[research] all models failed:', err)
        return res.status(200).json({ draft: { nazevKlienta: name }, hypotezy: [] })
      }
      console.warn(`[research] model ${MODELS[i]} failed, trying next`)
    }
  }
}
