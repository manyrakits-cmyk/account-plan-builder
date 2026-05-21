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

  const { answers } = req.body ?? {}
  if (!answers) {
    return res.status(400).json({ error: 'Missing answers' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const userPrompt = `Odpovědi z interview:
- Název klienta: ${answers.client_name || ''}
- Account owner: ${answers.owner || ''}
- Obor a popis: ${answers.industry || ''}
- Velikost firmy: ${answers.size || ''}
- Stav vztahu (celkový): ${answers.relationship_overall || ''}
- Stav vztahu (po osobách): ${answers.relationship_detail || ''}
- Rozhodovači: ${answers.decision_makers || ''}
- IT kontakty: ${answers.it_contacts || ''}
- Ostatní stakeholdeři: ${answers.others || ''}
- Steering: ${answers.steering || ''}
- Oblasti spolupráce: ${answers.areas || ''}
- Roční objem: ${answers.budget_annual || ''}
- Rozložení budgetu: ${answers.budget_breakdown || ''}
- Strategická rizika: ${answers.strategic_risks || ''}
- Oportunity: ${answers.opportunities || ''}
- Cíle: ${answers.goals || ''}
- Aktivity: ${answers.activities || ''}
- Potřeba zásahu vedení: ${answers.mgmt_needed || ''}`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
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
