export const config = { maxDuration: 15 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { query } = req.body ?? {}
  if (!query?.trim()) return res.status(400).json({ error: 'Missing query' })

  const key = process.env.TAVILY_API_KEY
  if (!key) return res.status(200).json({ results: [], answer: null })

  try {
    const r = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        query: query.trim(),
        search_depth: 'basic',
        max_results: 4,
        include_answer: true,
      }),
    })
    if (!r.ok) return res.status(200).json({ results: [], answer: null })

    const data = await r.json()
    const results = (data.results ?? []).map((item) => ({
      title: item.title,
      content: item.content,
      url: item.url,
    }))

    return res.status(200).json({ results, answer: data.answer ?? null })
  } catch {
    return res.status(200).json({ results: [], answer: null })
  }
}
