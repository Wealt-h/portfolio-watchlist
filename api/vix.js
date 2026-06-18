export const config = { runtime: "edge" };

// Accrue — CBOE Volatility Index (VIX), Wall Street's "fear gauge"
export default async function handler(req) {
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
        },
      }
    );

    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;

    if (!meta) {
      return new Response(JSON.stringify({ error: "No VIX data" }), { status: 502 });
    }

    const value = meta.regularMarketPrice ?? meta.previousClose;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose;
    const changePct = prevClose ? (((value - prevClose) / prevClose) * 100) : 0;

    // Classic VIX bands (widely used rule-of-thumb interpretation)
    // <12 complacent, 12-20 normal/calm, 20-30 elevated concern, >30 panic
    let level, label;
    if (value < 12) { level = "complacent"; label = "Complacent"; }
    else if (value < 20) { level = "calm"; label = "Calm"; }
    else if (value < 30) { level = "elevated"; label = "Elevated"; }
    else { level = "panic"; label = "Panic"; }

    return new Response(JSON.stringify({
      value: parseFloat(value.toFixed(2)),
      changePct: parseFloat(changePct.toFixed(2)),
      level,
      label,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to fetch VIX" }), { status: 500 });
  }
}
