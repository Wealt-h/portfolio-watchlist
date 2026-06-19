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

  // Crypto tickers must be suffixed with -USD on Yahoo Finance, or they silently
  // resolve to an unrelated listed equity that happens to share the same short ticker
  // (e.g. plain "BTC" is a real stock, not Bitcoin). This list matches the full set
  // of crypto tickers supported elsewhere in the app — keep in sync with sparkline.js
  // and the CRYPTO_TICKERS constant in App.js.
  const CRYPTO_TICKERS = ["BTC","ETH","SOL","DOGE","ADA","XRP","BNB","AVAX","MATIC","DOT","LINK","LTC","UNI","ATOM","NEAR","APT","SHIB","TRX","TON"];

  const results = {};

  await Promise.all(symbols.map(async (sym) => {
    const symUpper = sym.toUpperCase();
    const ticker = CRYPTO_TICKERS.includes(symUpper) ? `${symUpper}-USD` : sym;
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
          price: parseFloat(price.toFixed(2)),
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
