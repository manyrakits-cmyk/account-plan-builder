import Anthropic from '@anthropic-ai/sdk'

export const config = { maxDuration: 30 }

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

const MAX_TEXT_CHARS = 10_000

function cleanAndTruncate(text) {
  const clean = text
    .replace(/<\/?account_plan_json>/g, '')
    .replace(/<\/?search_query>/g, '')
    .trim()
  if (clean.length <= MAX_TEXT_CHARS) return clean
  return clean.slice(0, MAX_TEXT_CHARS) + '\n\n[...zkráceno...]'
}

async function extractDocxText(buffer) {
  // Dynamic import to avoid ESM/CJS issues with mammoth
  const mammoth = await import('mammoth')
  const fn = mammoth.extractRawText ?? mammoth.default?.extractRawText
  if (typeof fn !== 'function') throw new Error('mammoth.extractRawText not available')
  const result = await fn({ buffer })
  return result.value ?? ''
}

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
    const rawText = await extractDocxText(buffer)
    return {
      type: 'text',
      text: `[Dokument: ${name}]\n${cleanAndTruncate(rawText)}`,
    }
  }

  // plain text / markdown
  const text = Buffer.from(data, 'base64').toString('utf-8')
  return {
    type: 'text',
    text: `[Dokument: ${name}]\n${cleanAndTruncate(text)}`,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { files = [], companyName = '' } = req.body ?? {}
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Missing files' })
  }

  let contentBlocks
  try {
    contentBlocks = await Promise.all(files.map(fileToContentBlock))
    console.log('[extract-docs] content blocks built:', contentBlocks.map((b) => b.type))
  } catch (err) {
    console.error('[extract-docs] file processing failed:', err.message)
    return res.status(400).json({ error: `Nepodařilo se zpracovat soubor: ${err.message}` })
  }

  const contextText = companyName
    ? `Firma: "${companyName}"\n\nZ přiložených dokumentů vytěž informace pro Account Plan.`
    : 'Z přiložených dokumentů vytěž informace pro Account Plan. Název klienta zjisti z dokumentů.'

  const userContent = [
    ...contentBlocks,
    { type: 'text', text: contextText },
  ]

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const MODELS = ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6']

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i]
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 2500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      })

      const text = response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('')

      const jsonStr = text.replace(/^```json\s*|^```\s*|```\s*$/gm, '').trim()

      try {
        const parsed = JSON.parse(jsonStr)
        const { hypotezy, ...draft } = parsed
        return res.status(200).json({ draft, hypotezy: hypotezy ?? [] })
      } catch (parseErr) {
        console.error(`[extract-docs] JSON parse failed for ${model}. Response: ${text.slice(0, 300)}`)
        throw parseErr
      }
    } catch (err) {
      const detail = err?.status ? `HTTP ${err.status}: ${err.message}` : err.message
      if (i === MODELS.length - 1) {
        console.error(`[extract-docs] all models failed. Last error (${model}): ${detail}`)
        return res.status(500).json({ error: 'Extrakce selhala.', detail })
      }
      console.warn(`[extract-docs] ${model} failed (${detail}), trying next`)
    }
  }
}
