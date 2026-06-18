// Accrue — Stock market Fear & Greed Index (CNN)
// Proxies CNN's public dataviz endpoint server-side to avoid CORS issues
export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://production.dataviz.cnn.io/index/fearandgreed/graphdata",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      return res.status(502).json({ error: "CNN endpoint unavailable" });
    }

    const data = await response.json();
    const current = data?.fear_and_greed;

    if (!current) {
      return res.status(502).json({ error: "Unexpected response shape" });
    }

    res.status(200).json({
      score: Math.round(current.score),
      rating: current.rating, // e.g. "fear", "greed", "neutral", "extreme fear", "extreme greed"
      previousClose: current.previous_close ? Math.round(current.previous_close) : null,
      previousWeek: current.previous_1_week ? Math.round(current.previous_1_week) : null,
      previousMonth: current.previous_1_month ? Math.round(current.previous_1_month) : null,
      timestamp: current.timestamp || null,
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch stock sentiment" });
  }
}
