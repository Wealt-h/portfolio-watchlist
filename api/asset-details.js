// Crypto tickers must be suffixed with -USD on Yahoo Finance, or they silently
// resolve to an unrelated listed equity sharing the same short ticker. Keep in
// sync with prices.js, sparkline.js, and CRYPTO_TICKERS in App.js.
const CRYPTO_TICKERS = ["BTC","ETH","SOL","DOGE","ADA","XRP","BNB","AVAX","MATIC","DOT","LINK","LTC","UNI","ATOM","NEAR","APT","SHIB","TRX","TON"];

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

  let body;
  try { body = await req.json ? await req.json() : req.body; } catch { body = req.body; }

  const { symbol } = body;
  if (!symbol) return res.status(400).json({ error: "Missing symbol" });

  // Apply the -USD suffix for crypto so the 52W range and MA200 resolve to the
  // correct asset (this was previously missing, leaving crypto indicators at 0).
  const ticker = CRYPTO_TICKERS.includes(symbol.toUpperCase()) ? `${symbol.toUpperCase()}-USD` : symbol;

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
  };

  try {
    // Fetch current quote + 52W range
    const quoteRes = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`,
      { headers }
    );
    const quoteData = await quoteRes.json();
    const meta = quoteData?.chart?.result?.[0]?.meta;

    if (!meta) return res.status(404).json({ error: "Symbol not found" });

    const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
    const prev = meta.chartPreviousClose || meta.previousClose || currentPrice;
    const change24h = prev ? parseFloat((((currentPrice - prev) / prev) * 100).toFixed(2)) : 0;
    const high52w = meta.fiftyTwoWeekHigh || 0;
    const low52w = meta.fiftyTwoWeekLow || 0;

    // Fetch 200 days of history to calculate 200MA
    let ma200 = 0;
    try {
      const histRes = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1y`,
        { headers }
      );
      const histData = await histRes.json();
      const closes = histData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
      const validCloses = closes.filter(v => v != null && !isNaN(v));
      if (validCloses.length >= 20) {
        const last200 = validCloses.slice(-200);
        ma200 = parseFloat((last200.reduce((s, v) => s + v, 0) / last200.length).toFixed(2));
      }
    } catch {}

    return res.status(200).json({
      currentPrice: parseFloat(currentPrice.toFixed(2)),
      change24h,
      high52w: parseFloat(high52w.toFixed(2)),
      low52w: parseFloat(low52w.toFixed(2)),
      ma200,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
