// Accrue — Historical FX rate lookup for converting foreign-currency trades to USD
// Uses Frankfurter (ECB daily reference rates, free, no key, no rate limit, historical data back to 1999)
// Falls back to the most recent prior business day if the requested date has no rate
// (weekends / public holidays aren't published by the ECB) — walks back up to 10 days
export default async function handler(req, res) {
  const { date, currency } = req.query;

  if (!date || !currency) {
    return res.status(400).json({ error: "Missing date or currency" });
  }
  if (currency === "USD") {
    return res.status(200).json({ rate: 1, date, currency });
  }

  try {
    // Try the requested date first, walking backwards up to 10 days if needed
    let attemptDate = new Date(date);
    let rate = null;
    let resolvedDate = date;

    for (let i = 0; i < 10; i++) {
      const dateStr = attemptDate.toISOString().slice(0, 10);
      const response = await fetch(`https://api.frankfurter.dev/v1/${dateStr}?base=USD&symbols=${currency}`);

      if (response.ok) {
        const data = await response.json();
        if (data?.rates?.[currency]) {
          rate = data.rates[currency];
          resolvedDate = dateStr;
          break;
        }
      }
      // Step back one day and try again (handles weekends/holidays)
      attemptDate.setDate(attemptDate.getDate() - 1);
    }

    if (rate === null) {
      return res.status(502).json({ error: "No FX rate found within 10 days of requested date" });
    }

    res.status(200).json({ rate, date: resolvedDate, currency });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch historical FX rate" });
  }
}
