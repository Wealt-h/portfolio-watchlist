export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const { symbol, name, type, thesis, currentPrice, change24h } = req.body;
  if (!symbol) {
    return res.status(400).json({ error: "Missing symbol" });
  }

  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const prompt = `You are a financial research assistant updating a personal investment journal.

Today is ${today}.
Asset: ${name} (${symbol})
Type: ${type}
Current Price: $${currentPrice}
24H Change: ${change24h}%
Investor thesis: "${thesis || 'Long-term growth asset'}"

Write a concise 3-4 sentence daily note covering:
1. Current price action and what the ${change24h > 0 ? 'gain' : 'decline'} suggests
2. Key things to watch for this asset right now
3. Whether current conditions align with the buy-on-dip strategy

Format: "[Date]: [price action]. [context/what to watch]. [dip strategy observation]."

Be specific, concise, no bullet points. Write like a personal investment journal entry.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || "API error" });
    }

    const text = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("")
      .trim();

    if (!text) {
      return res.status(500).json({ error: "No content returned" });
    }

    return res.status(200).json({ note: text });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
