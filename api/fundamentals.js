export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body;
  try { body = req.body; if (typeof body === "string") body = JSON.parse(body); } 
  catch { return res.status(400).json({ error: "Invalid body" }); }

  const symbol = body?.symbol;
  if (!symbol) return res.status(400).json({ error: "Missing symbol" });

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
  };

  try {
    const calendarRes = await fetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=calendarEvents,summaryDetail,defaultKeyStatistics`,
      { headers }
    );

    if (!calendarRes.ok) return res.status(200).json({ nextEarnings: null, dividendYield: 0, dividendRate: 0, exDividendDate: null });

    const calData = await calendarRes.json();
    const summary = calData?.quoteSummary?.result?.[0] || {};
    const calendar = summary?.calendarEvents || {};
    const detail = summary?.summaryDetail || {};
    const stats = summary?.defaultKeyStatistics || {};

    const earningsTimestamps = calendar?.earnings?.earningsDate || [];
    const nextEarnings = earningsTimestamps.length > 0
      ? new Date(earningsTimestamps[0].raw * 1000).toISOString().slice(0, 10)
      : null;

    const dividendRate = detail?.dividendRate?.raw || 0;
    const dividendYield = detail?.dividendYield?.raw || 0;
    const exDividendDate = detail?.exDividendDate?.raw
      ? new Date(detail.exDividendDate.raw * 1000).toISOString().slice(0, 10)
      : null;

    return res.status(200).json({
      nextEarnings,
      dividendRate,
      dividendYield: parseFloat((dividendYield * 100).toFixed(2)),
      exDividendDate,
      lastDividend: stats?.lastDividendValue?.raw || 0,
      lastDividendDate: stats?.lastDividendDate?.raw
        ? new Date(stats.lastDividendDate.raw * 1000).toISOString().slice(0, 10)
        : null,
      payoutRatio: parseFloat(((detail?.payoutRatio?.raw || 0) * 100).toFixed(1)),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
