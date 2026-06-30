export default async function handler(req, res) {
  // Browsers (and native app webviews making cross-origin requests) send an
  // automatic OPTIONS "preflight" request before a real POST with a JSON body,
  // to check whether the server allows it. Without explicitly answering this
  // OPTIONS request successfully, the browser/webview cancels the real POST
  // entirely — same root cause as the fix already applied to prices.js.
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const { symbol, name, type, currentPrice, change24h, mode, rsi, high52w, ma200, periods } = req.body;
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

Based strictly on the investment philosophy above, output ONLY bullet points in this exact format:
+ [positive reason this fits the philosophy]
+ [another positive]
- [risk or reason it doesn't fit]
- [another risk or negative]

Rules:
- Start each line with + for positives or - for negatives
- 3-5 positives, 2-3 negatives
- Each point max 12 words
- Be specific — reference moat, AI infrastructure, Bitcoin fundamentals, macro conditions, valuation etc.
- Write in objective third-person analyst voice. No "your", no "you", no personal language.
- No intro text, no conclusion, no headers. Just the bullet lines.`

    : `${PHILOSOPHY}

You are updating a daily market note for ${name} (${symbol}) — a ${type} asset.
Today: ${today}

DATA — use ONLY these figures, do not invent any others:
- Current price: $${currentPrice}
- 24-hour change: ${change24h}%  (this is the move over the LAST 24 HOURS ONLY)
${rsi ? `- RSI (14): ${rsi}\n` : ""}${high52w ? `- 52-week high: $${high52w}\n` : ""}${ma200 ? `- 200-day moving average: $${ma200}\n` : ""}${periods ? `- Longer-term returns: 1W ${periods.week}%, 1M ${periods.month}%, 1Y ${periods.year}%\n` : ""}
Output the note as exactly three sections, in this format:

## Technical Setup
A 2-3 sentence paragraph on today's price action and whether technicals meet the disciplined entry criteria (RSI < 40, price 10%+ below the 52-week high, price below the 200-day MA), citing the actual numbers above. Reference the 24-hour change as today's move only — do NOT describe a weekly, monthly, or yearly return as if it were today's move.

## Macro & Sector
A 2-3 sentence paragraph on the most relevant macro or sector context tied to the philosophy.

## Thesis
A 2-3 sentence paragraph giving the long-term positioning verdict.

Formatting rules:
- Put exactly "## " before each heading, alone on its line. Use ONLY these three headings.
- No title line, no "#" single-hash headers, no "**" bold, no bullet points, no other markdown.
- Objective third-person analyst voice. No "you", no "your".`;

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
