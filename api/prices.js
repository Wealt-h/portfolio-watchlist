export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { symbols } = body;
  if (!symbols || !symbols.length) {
    return new Response(JSON.stringify({ error: "No symbols provided" }), { status: 400 });
  }

  const TICKER_MAP = {
    BTC: "BTC-USD", ETH: "ETH-USD", SOL: "SOL-USD", DOGE: "DOGE-USD",
    AMZN: "AMZN", HOOD: "HOOD", AAPL: "AAPL", MSFT: "MSFT",
    NVDA: "NVDA", TSLA: "TSLA", GOOGL: "GOOGL", META: "META",
  };

  const results = {};

  await Promise.all(symbols.map(async (sym) => {
    const ticker = TICKER_MAP[sym] || sym;
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
          }
        }
      );
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (meta) {
        const price = meta.regularMarketPrice || meta.previousClose;
        const prev = meta.chartPreviousClose || meta.previousClose;
        const change24h = prev ? (((price - prev) / prev) * 100) : 0;
        results[sym] = {
          price: parseFloat(price.toFixed(sym === "BTC" || price > 1000 ? 2 : 2)),
          change24h: parseFloat(change24h.toFixed(2))
        };
      }
    } catch (e) {
      console.error(`Failed to fetch ${sym}:`, e.message);
    }
  }));

  return new Response(JSON.stringify({ prices: results }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
