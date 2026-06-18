// Accrue — FX rates for currency display toggle
// Proxies Frankfurter (ECB daily reference rates, free, no key, no rate limit)
export default async function handler(req, res) {
  try {
    const response = await fetch("https://api.frankfurter.dev/v1/latest?base=USD");

    if (!response.ok) {
      return res.status(502).json({ error: "FX provider unavailable" });
    }

    const data = await response.json();
    // data.rates = { AUD: 1.52, EUR: 0.92, GBP: 0.79, ... }
    res.status(200).json({
      base: "USD",
      date: data.date,
      rates: data.rates,
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch FX rates" });
  }
}
