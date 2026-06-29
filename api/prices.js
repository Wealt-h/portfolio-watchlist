export const config = { runtime: "edge" };

// Crypto tickers must be suffixed with -USD on Yahoo Finance, or they silently
// resolve to an unrelated listed equity that happens to share the same short
// ticker (e.g. plain "BTC" is a real stock, not Bitcoin). Keep this list in
// sync with sparkline.js, asset-details.js, and CRYPTO_TICKERS in App.js.
const CRYPTO_TICKERS = ["BTC","ETH","SOL","DOGE","ADA","XRP","BNB","AVAX","MATIC","DOT","LINK","LTC","UNI","ATOM","NEAR","APT","SHIB","TRX","TON"];

const round2 = (v) => (v == null || isNaN(v)) ? 0 : parseFloat(Number(v).toFixed(2));

// Standard 14-period Wilder's RSI from an array of closing prices.
// Returns 0 if there isn't enough data (the app treats 0 as "no reading").
function computeRSI(closes, period = 14) {
  if (!closes || closes.length < period + 1) return 0;
  let avgGain = 0, avgLoss = 0;
  // Seed: simple average of the first `period` changes
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) avgGain += diff; else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  // Wilder smoothing across the remaining changes
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return Math.round(100 - 100 / (1 + rs));
}

export default async function handler(req) {
  // Browsers (and native app webviews making cross-origin requests) send an
  // automatic OPTIONS "preflight" before a real POST. Without answering it
  // successfully the browser/webview cancels the POST — this was the original
  // cause of "Load failed" in the native iOS app.
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

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

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
  };

  const results = {};

  await Promise.all(symbols.map(async (sym) => {
    const symUpper = sym.toUpperCase();
    const ticker = CRYPTO_TICKERS.includes(symUpper) ? `${symUpper}-USD` : sym;
    try {
      // One year of daily candles gives us everything: the live price + 24h
      // change from meta, the 52-week range, the 200-day moving average, and
      // enough history to compute a real RSI.
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`,
        { headers }
      );
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      const meta = result?.meta;
      if (!meta) return;

      const price = meta.regularMarketPrice ?? meta.previousClose;
      if (price == null) return;
      const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
      const change24h = prev ? ((price - prev) / prev) * 100 : 0;

      const quote = result?.indicators?.quote?.[0] || {};
      const closes = (quote.close || []).filter(v => v != null && !isNaN(v));
      const highs  = (quote.high  || []).filter(v => v != null && !isNaN(v));
      const lows   = (quote.low   || []).filter(v => v != null && !isNaN(v));

      // Prefer Yahoo's own 52-week figures; fall back to the year of candles.
      const high52w = meta.fiftyTwoWeekHigh || (highs.length ? Math.max(...highs) : 0);
      const low52w  = meta.fiftyTwoWeekLow  || (lows.length  ? Math.min(...lows)  : 0);

      // 200-day moving average (matches the >=20 minimum used in asset-details.js)
      let ma200 = 0;
      if (closes.length >= 20) {
        const last200 = closes.slice(-200);
        ma200 = last200.reduce((s, v) => s + v, 0) / last200.length;
      }

      const rsi = computeRSI(closes, 14);

      results[sym] = {
        price: round2(price),
        change24h: round2(change24h),
        high52w: round2(high52w),
        low52w: round2(low52w),
        ma200: round2(ma200),
        rsi,
      };
    } catch (e) {
      console.error(`Failed to fetch ${sym}:`, e.message);
    }
  }));

  return new Response(JSON.stringify({ prices: results }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    }
  });
}
