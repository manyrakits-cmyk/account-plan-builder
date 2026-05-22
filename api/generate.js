import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `Jsi zkušený konzultant v IT agentuře Bootiq. Na základě odpovědí z interview vygeneruj strukturovaný Account Plan.
Piš stručně a heslovitě – jako to dělají projekťáci v praxi. Nepřidávej zbytečné věty ani obecné fráze.
Pokud je odpověď prázdná nebo přeskočená, danou sekci vynech nebo napiš "—".
Vygeneruj výstup ve dvou formátech oddělených přesně řetězcem ---JSON_SEPARATOR---

FORMÁT 1: Confluence-ready markdown v češtině se strukturou:
## Manažerské shrnutí
## Administrativní údaje
## Struktura stakeholderů
## Governance
## Budget
## Strategická rizika
## Oportunity
## Strategické cíle
## Klíčové aktivity

FORMÁT 2: JSON objekt se stejnými daty (camelCase klíče, česky hodnoty). Bez komentářů, čistý JSON.`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { extractedData } = req.body ?? {}
  if (!extractedData) {
    return res.status(400).json({ error: 'Missing extractedData' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const userPrompt = `Vygeneruj Account Plan z těchto dat sesbíraných v rozhovoru:\n\n${JSON.stringify(extractedData, null, 2)}`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const raw = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const parts = raw.split('---JSON_SEPARATOR---')
    const markdown = parts[0].trim()

    let json = '{}'
    if (parts[1]) {
      try {
        const jsonRaw = parts[1].trim().replace(/^```json|^```|```$/gm, '').trim()
        json = JSON.stringify(JSON.parse(jsonRaw), null, 2)
      } catch {
        json = parts[1].trim()
      }
    }

    return res.status(200).json({ markdown, json })
  } catch (err) {
    console.error('[generate]', err)
    return res.status(500).json({ error: 'Generation failed' })
  }
}
