import Anthropic from '@anthropic-ai/sdk'
import mammoth from 'mammoth'

export const config = { maxDuration: 60 }

const SYSTEM_PROMPT = `Jsi research asistent. Na základě poskytnutých dokumentů sestav draft Account Planu.

Vytěž veškeré relevantní informace z dokumentů. Vyplň co víš s jistotou. Pole která v dokumentech nenajdeš nech prázdná.

Vrať POUZE čistý JSON (bez markdown bloků) v tomto schématu:
{
  "nazevKlienta": "...",
  "accountOwner": "...",
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

Pole "hypotezy" obsahuje 3-5 konkrétních tvrzení k ověření s uživatelem ve formátu otázky.`

async function fileToContentBlock(file) {
  const { name, mimeType, data } = file

  if (mimeType === 'application/pdf') {
    return {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data },
    }
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const buffer = Buffer.from(data, 'base64')
    const result = await mammoth.extractRawText({ buffer })
    return {
      type: 'text',
      text: `[Dokument: ${name}]\n${result.value}`,
    }
  }

  // plain text / markdown
  const text = Buffer.from(data, 'base64').toString('utf-8')
  return {
    type: 'text',
    text: `[Dokument: ${name}]\n${text}`,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { files = [], companyName = '' } = req.body ?? {}
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Missing files' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let contentBlocks
  try {
    contentBlocks = await Promise.all(files.map(fileToContentBlock))
  } catch (err) {
    console.error('[extract-docs] file processing error:', err)
    return res.status(400).json({ error: 'Nepodařilo se zpracovat soubor.' })
  }

  const contextText = companyName
    ? `Firma: "${companyName}"\n\nZ přiložených dokumentů vytěž informace pro Account Plan.`
    : 'Z přiložených dokumentů vytěž informace pro Account Plan. Název klienta zjisti z dokumentů.'

  const userContent = [
    ...contentBlocks,
    { type: 'text', text: contextText },
  ]

  const MODELS = ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001']

  for (let i = 0; i < MODELS.length; i++) {
    try {
      const response = await client.messages.create({
        model: MODELS[i],
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      })

      const text = response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('')

      const jsonStr = text.replace(/^```json\s*|^```\s*|```\s*$/gm, '').trim()
      const parsed = JSON.parse(jsonStr)
      const { hypotezy, ...draft } = parsed

      return res.status(200).json({ draft, hypotezy: hypotezy ?? [] })
    } catch (err) {
      if (i === MODELS.length - 1) {
        console.error('[extract-docs] all models failed:', err)
        return res.status(500).json({ error: 'Extrakce selhala.' })
      }
      console.warn(`[extract-docs] model ${MODELS[i]} failed, trying next`)
    }
  }
}
