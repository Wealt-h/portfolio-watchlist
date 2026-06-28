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

  const { query } = body;
  if (!query) return res.status(400).json({ error: "Missing query" });

  try {
    // Search Yahoo Finance
    const searchRes = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&lang=en-US&region=US&quotesCount=8&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`,
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" } }
    );
    const searchData = await searchRes.json();
    const quotes = searchData?.quotes || [];

    // Filter to useful types
    const typeMap = { EQUITY: "stock", ETF: "etf", CRYPTOCURRENCY: "crypto", MUTUALFUND: "etf" };
    const results = quotes
      .filter(q => q.quoteType && typeMap[q.quoteType] && q.symbol)
      .slice(0, 6)
      .map(q => ({
        symbol: q.symbol,
        name: q.longname || q.shortname || q.symbol,
        type: typeMap[q.quoteType] || "stock",
        exchange: q.exchDisp || q.exchange || "",
      }));

    return res.status(200).json({ results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
