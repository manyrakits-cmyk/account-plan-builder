import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { company } = req.body ?? {}
  if (!company?.trim()) {
    return res.status(400).json({ error: 'Missing company name' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 512,
      system:
        'Jsi asistent pro obchodní tým v IT agentuře. Pokud znáš firmu z tréninkových dat, stručně popiš: obor podnikání, přibližnou velikost (počet zaměstnanců nebo obrat) a hlavní činnost. Pokud firmu neznáš nebo si nejsi jistý, řekni to upřímně. Piš v češtině, max 4 věty. Nevymýšlej si informace.',
      messages: [
        {
          role: 'user',
          content: `Dohledej základní informace o firmě: "${company.trim()}"`,
        },
      ],
    })

    const result = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')

    return res.status(200).json({ result })
  } catch (err) {
    console.error('[research]', err)
    return res.status(500).json({ error: 'Research failed' })
  }
}
