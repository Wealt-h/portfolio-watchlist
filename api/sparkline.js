export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body;
  try { body = req.body; } catch { return res.status(400).json({ error: "Invalid body" }); }

  const { symbol, range } = body;
  if (!symbol) return res.status(400).json({ error: "Missing symbol" });

  // Validate against Yahoo's accepted range values to avoid passing through anything unexpected
  const validRanges = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"];
  const safeRange = validRanges.includes(range) ? range : "1mo";

  // Always request daily data — Yahoo's server-side weekly/monthly aggregation (interval=1wk/1mo)
  // has documented inconsistencies for crypto tickers (which trade 24/7 with no concept of a
  // "trading week"), sometimes returning truncated history or misaligned timestamp/price arrays.
  // We downsample ourselves below instead, which keeps full control over correctness.
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
  };

  try {
    const res2 = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${safeRange}`,
      { headers }
    );
    const data = await res2.json();
    const result = data?.chart?.result?.[0];
    if (!result) return res.status(404).json({ error: "No data" });

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];

    let points = timestamps
      .map((t, i) => ({ t: t * 1000, v: closes[i] }))
      .filter(p => p.v != null && !isNaN(p.v) && typeof p.v === "number");

    // Downsample longer ranges client-side (server-side here) to keep payload light —
    // take every Nth point but always keep the most recent point so "today" is accurate
    if (safeRange === "5y" || safeRange === "10y" || safeRange === "max") {
      const step = 7; // roughly weekly cadence from daily data
      const sampled = points.filter((_, i) => i % step === 0);
      // Ensure the final (most recent) point is always included
      if (points.length > 0 && sampled[sampled.length - 1]?.t !== points[points.length - 1].t) {
        sampled.push(points[points.length - 1]);
      }
      points = sampled;
    }

    return res.status(200).json({ points });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
