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

// Percentage return of `currentPrice` versus the close at-or-before `daysAgo`.
// `series` is an array of { t (ms), c (close) } sorted oldest→newest. If there
// isn't enough history to reach that far back, falls back to the earliest close
// (so e.g. a 6-month-old asset's "1 year" return uses its full available range).
function returnSince(series, currentPrice, daysAgo) {
  if (!series.length || !currentPrice) return 0;
  const cutoff = Date.now() - daysAgo * 86400000;
  let base = null;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].t <= cutoff) { base = series[i].c; break; }
  }
  if (base == null) base = series[0].c;
  return base ? ((currentPrice - base) / base) * 100 : 0;
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
      // One year of daily candles gives us the live price + 24h change, the
      // 52-week range, the 200-day MA, RSI, and the week/month/year returns.
      // A second lightweight monthly max-range fetch gives the all-time return.
      const [res, maxRes] = await Promise.all([
        fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`, { headers }),
        fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1mo&range=max`, { headers }).catch(() => null),
      ]);
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      const meta = result?.meta;
      if (!meta) return;

      const price = meta.regularMarketPrice ?? meta.previousClose;
      if (price == null) return;

      const quote = result?.indicators?.quote?.[0] || {};
      const closes = (quote.close || []).filter(v => v != null && !isNaN(v));
      const highs  = (quote.high  || []).filter(v => v != null && !isNaN(v));
      const lows   = (quote.low   || []).filter(v => v != null && !isNaN(v));

      // Timestamped series (oldest→newest), used for the period returns.
      const ts = result?.timestamp || [];
      const rawCloses = quote.close || [];
      const series = [];
      for (let i = 0; i < ts.length; i++) {
        if (rawCloses[i] != null && !isNaN(rawCloses[i])) series.push({ t: ts[i] * 1000, c: rawCloses[i] });
      }

      // True 24h change must use the prior *session* close. We must NOT use
      // meta.chartPreviousClose here: with a 1-year range that value is the
      // close ~1 year ago, which turns the daily % into a 1-year return (the
      // cause of the wildly large percentages that appeared on the cards).
      const prevClose = meta.previousClose ?? meta.regularMarketPreviousClose
        ?? (closes.length >= 2 ? closes[closes.length - 2] : price);
      const change24h = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

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

      // All-time return from the monthly max-range series' earliest close.
      let allTime = 0;
      try {
        const maxData = maxRes ? await maxRes.json() : null;
        const maxCloses = (maxData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [])
          .filter(v => v != null && !isNaN(v));
        if (maxCloses.length) {
          const first = maxCloses[0];
          allTime = first ? ((price - first) / first) * 100 : 0;
        }
      } catch {}

      results[sym] = {
        price: round2(price),
        change24h: round2(change24h),
        high52w: round2(high52w),
        low52w: round2(low52w),
        ma200: round2(ma200),
        rsi,
        periods: {
          day: round2(change24h),
          week: round2(returnSince(series, price, 7)),
          month: round2(returnSince(series, price, 30)),
          year: round2(returnSince(series, price, 365)),
          all: round2(allTime),
        },
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
