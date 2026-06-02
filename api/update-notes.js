export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key not configured" }), { status: 500 });
  }

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { symbol, name, type, thesis } = body;
  if (!symbol) {
    return new Response(JSON.stringify({ error: "Missing symbol" }), { status: 400 });
  }

  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const prompt = `You are a financial research assistant. Search for the latest news and market data for ${name} (${symbol}) and write a concise daily market update note.

Today is ${today}.

The investor is long-term bullish on ${symbol}. Their thesis is: "${thesis || 'Long-term growth asset'}"

Search for:
1. Latest price action and any significant moves today or this week
2. Recent news, announcements, or analyst updates
3. Any macro factors affecting ${type === "crypto" ? "crypto markets" : "this stock"}
4. Key price levels being watched

Write a 3-4 sentence note in this exact format:
"[Date]: [Price action summary]. [Key news or catalyst]. [What to watch / entry opportunity if any]."

Be specific with numbers where possible. Be concise — max 4 sentences. Do not use bullet points. Write as if updating a personal investment journal.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "interleaved-thinking-2025-01-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || "API error" }), { status: 500 });
    }

    // Extract text from response content blocks
    const text = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("")
      .trim();

    if (!text) {
      return new Response(JSON.stringify({ error: "No content returned" }), { status: 500 });
    }

    return new Response(JSON.stringify({ note: text }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
