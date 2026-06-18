export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body;
  try { body = req.body; } catch { return res.status(400).json({ error: "Invalid body" }); }

  const { symbol, range } = body;
  if (!symbol) return res.status(400).json({ error: "Missing symbol" });

  // Validate against Yahoo's accepted range values to avoid passing through anything unexpected
  const validRanges = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"];
  const safeRange = validRanges.includes(range) ? range : "1mo";

  // Scale data granularity to the range — daily data over 5 years is ~1,800 points,
  // which is unnecessary detail for a small sparkline and slows the fetch down.
  // Use weekly intervals for longer ranges to keep payloads light.
  const interval = (safeRange === "5y" || safeRange === "10y" || safeRange === "max") ? "1wk" : "1d";

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
  };

  try {
    const res2 = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${safeRange}`,
      { headers }
    );
    const data = await res2.json();
    const result = data?.chart?.result?.[0];
    if (!result) return res.status(404).json({ error: "No data" });

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];

    const points = timestamps
      .map((t, i) => ({ t: t * 1000, v: closes[i] }))
      .filter(p => p.v != null && !isNaN(p.v));

    return res.status(200).json({ points });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
