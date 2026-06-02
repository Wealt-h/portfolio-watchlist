export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const { symbol, name, type, currentPrice, change24h, mode } = req.body;
  if (!symbol) return res.status(400).json({ error: "Missing symbol" });

  const today = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

  const PHILOSOPHY = `
INVESTMENT PHILOSOPHY:

CORE BELIEF: Buy exceptional quality assets during periods of weakness. Patience and conviction over noise and short-termism.

1. BUFFETT / LI LU — QUALITY & MOAT FIRST
   - Only invest in businesses with durable competitive advantages (economic moats)
   - Favour brand power, network effects, switching costs, cost advantages, pricing power
   - Management must be honest, capable and shareholder-aligned
   - "Wonderful company at a fair price" — never overpay, but never sacrifice quality for cheapness
   - Concentrate in high-conviction ideas rather than diversifying into mediocrity
   - Hold for the long term and let compounding work undisturbed

2. DRUCKENMILLER — MACRO AWARENESS & ASYMMETRIC BETS
   - Always understand the macro environment: liquidity, rates, inflation, monetary policy
   - When macro tailwinds AND fundamentals align — size up with conviction
   - Asymmetric risk/reward: maximum upside, defined downside
   - "Preservation of capital and home runs" — protect the base, swing hard on the best pitches
   - Cut losses quickly when thesis breaks. Never marry a position

3. DALIO — ALL WEATHER RESILIENCE
   - Diversify across economic environments, not just asset classes
   - Understand which assets perform in: rising growth, falling growth, rising inflation, falling inflation
   - No one can predict the future — build a portfolio that survives all seasons
   - Risk parity thinking: balance risk exposure, not just dollar exposure

4. COHEN — EDGE & EXECUTION
   - Only enter when you have a clear edge — technical, fundamental or informational
   - Risk management is everything — position size based on conviction and volatility
   - Adapt quickly when conditions change. No ego. No anchoring
   - Sector specialisation creates information advantage

5. BITCOIN STANDARD — DIGITAL HARD MONEY
   - Bitcoin is the hardest money ever created — fixed supply, decentralised, censorship-resistant
   - Store of value in an era of monetary debasement and expanding government debt
   - Institutional adoption via ETFs has permanently changed its risk profile
   - Long-term holders have never lost money over any 4-year period

6. AI WAVE — INFRASTRUCTURE & COST REVOLUTION
   - AI is the largest productivity wave since the internet
   - Favour companies that are BOTH the infrastructure backbone of AI AND the biggest beneficiaries of AI cost reduction
   - AWS, cloud compute, data infrastructure = picks-and-shovels of the AI gold rush
   - Companies that can cut costs dramatically with AI while growing revenue = massive margin expansion

7. ENTRY DISCIPLINE — BUY ON RED DAYS
   - Never chase. Never buy at all-time highs without a specific catalyst thesis
   - Target entries when RSI < 40, price 10%+ below 52W high, below 200MA
   - Fear and negative sentiment = opportunity for the long-term investor
   - Scale in — first buy on initial dip, add on further weakness
`;

  const isThesis = mode === "thesis";

  const prompt = isThesis
    ? `${PHILOSOPHY}

You are writing a personal investment thesis for ${name} (${symbol}) — a ${type} asset.
Current price: $${currentPrice}

Based strictly on the investment philosophy above, write a 3-5 sentence thesis explaining:
1. Why this asset fits (or doesn't fit) the philosophy
2. Which specific principles it satisfies (moat, AI wave, Bitcoin Standard, macro, etc.)
3. What the long-term bull case is
4. Any key risks to the thesis

Be honest — if it doesn't fit the philosophy, say so. Be specific and analytical, not generic.
Write in first person as the investor. No bullet points.`

    : `${PHILOSOPHY}

You are updating a daily market note for ${name} (${symbol}) — a ${type} asset.
Today: ${today}
Current price: $${currentPrice}
24H change: ${change24h}%

Write a 3-4 sentence daily note covering:
1. What today's price action means in context of the investment philosophy
2. Whether current conditions represent a buying opportunity based on the entry discipline principles
3. Any relevant macro or sector factors

Be specific with the price. Be concise. No bullet points. Write like a personal investment journal entry.`;

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
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || "API error" });

    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
    if (!text) return res.status(500).json({ error: "No content returned" });

    return res.status(200).json({ note: text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
