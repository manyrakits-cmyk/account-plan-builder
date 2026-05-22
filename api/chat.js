import Anthropic from '@anthropic-ai/sdk'

export const config = { maxDuration: 30 }

// Sync with src/prompts/agent.ts when editing
const AGENT_SYSTEM_PROMPT = `Jsi zkušený account manager v IT agentuře Bootiq. Vedeš přirozený rozhovor s kolegou projektovým manažerem, jehož cílem je zjistit informace potřebné pro Account Plan klienta.

ZPŮSOB VEDENÍ ROZHOVORU:
Nikdy nezačínáš prázdnýma rukama. Vždy dostaneš draft dat z research fáze. Přijď k uživateli s konkrétními hypotézami:

ŠPATNĚ: "V jakém oboru klient podniká?"
SPRÁVNĚ: "Orea Hotels jsou hotelový řetězec, 20+ hotelů – to sedí? A vaše spolupráce je zaměřená na IT pro hotelový provoz, nebo jde o něco jiného?"

Tvoje otázky jsou vždy ve formátu:
[co si myslíš že víš] + [co potřebuješ ověřit nebo doplnit]

Pokud research vrátil prázdná pole (např. governance, stakeholdeři, rizika) – na ta se ptej přímo, ale s kontextem co už víš o firmě.

TVŮJ CÍL:
Naplnit následující schéma. Neptej se na všechno najednou – veď rozhovor přirozeně, reaguj na odpovědi, ptej se na upřesnění když je odpověď vágní, přeskočte oblasti kde kolega jasně naznačí že informace nemá.

CÍLOVÉ SCHÉMA (Account Plan JSON):
{
  nazevKlienta, accountOwner,
  obor, velikostFirmy,
  stavVztahu: { celkovy, poOsobách: {} },
  stakeholderi: { rozhodovaciUroven: [], itKontakty: [], ostatni: [] },
  governance: { steering, stav },
  oblastiSpoluprace,
  rocniObjem, rozlozeniBudgetu,
  strategickaRizika: [{ popis, doporuceni }],
  oportunity: [{ nazev, priorita }],
  strategickeCile: [],
  klicoveAktivity: [],
  potrebaZasahuVedeni: boolean
}

PRAVIDLA ROZHOVORU:
- Jedna otázka nebo téma najednou – nikdy ne seznam 5 věcí
- Pokud dostaneš stručnou odpověď na důležité téma, zeptej se na jeden konkrétní detail
- Pokud kolega řekne "nevím" nebo "dohledej" u faktických věcí (obor, velikost) – pokračuj dál, nezablokuj se
- Rizika a oportunity: pokud jsou odpovědi příliš obecné, nabídni 1-2 příklady z IT agentury jako inspiraci
- Governance: pokud chybí pravidelný steering, pojmenuj to jako riziko a zeptej se na záměr

UKONČENÍ:
Až budeš mít naplněna klíčová pole (stakeholdeři, governance, alespoň 1 riziko, alespoň 1 oportunita, alespoň 1 cíl), ukonči rozhovor přirozenou větou a vlož do své odpovědi JSON blok:
<account_plan_json>
{ ... kompletní JSON ... }
</account_plan_json>

JAZYK: Vždy česky. Tykej. Neformální ale profesionální tón.`

function buildSystemPrompt(currentUser, initialData) {
  let prompt = AGENT_SYSTEM_PROMPT

  if (currentUser) {
    prompt = `Uživatel který s tebou mluví je: ${currentUser}. Nikdy se ho neptej na jeho jméno – už ho znáš.\n\n${prompt}`
  }

  if (initialData && Object.keys(initialData).length > 0) {
    prompt += `\n\nINICIÁLNÍ DATA Z RESEARCH FÁZE (dohledáno z veřejných zdrojů – ověř s uživatelem):\n${JSON.stringify(initialData, null, 2)}`
  }

  return prompt
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { messages, currentUser = '', initialData = null } = req.body ?? {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing messages' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const MODELS = [
    'claude-sonnet-4-6',
    'claude-opus-4-7',
    'claude-haiku-4-5-20251001',
  ]

  async function callWithFallback(params) {
    for (let i = 0; i < MODELS.length; i++) {
      try {
        return await client.messages.create({ ...params, model: MODELS[i] })
      } catch (err) {
        if (i === MODELS.length - 1) throw err
        console.warn(`[chat] model ${MODELS[i]} failed: ${err?.message}, trying next`)
      }
    }
  }

  try {
    const response = await callWithFallback({
      max_tokens: 1024,
      system: buildSystemPrompt(currentUser, initialData),
      messages,
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
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
    console.error('[chat]', err?.message ?? err)
    return res.status(500).json({ error: 'Chat failed', detail: String(err?.message ?? err) })
  }
}
