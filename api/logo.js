export default async function handler(req, res) {
  const { ticker } = req.query;
  if (!ticker) return res.status(400).send("Missing ticker");

  const DOMAIN_MAP = {
    AMZN: "amazon.com", AAPL: "apple.com", MSFT: "microsoft.com",
    GOOGL: "google.com", GOOG: "google.com", META: "meta.com",
    TSLA: "tesla.com", NVDA: "nvidia.com", HOOD: "robinhood.com",
    NFLX: "netflix.com", UBER: "uber.com", LYFT: "lyft.com",
    SPOT: "spotify.com", SHOP: "shopify.com", SQ: "block.xyz",
    PYPL: "paypal.com", V: "visa.com", MA: "mastercard.com",
    JPM: "jpmorganchase.com", BAC: "bankofamerica.com",
    DIS: "disney.com", BABA: "alibaba.com", NKE: "nike.com",
    AMD: "amd.com", INTC: "intel.com", CRM: "salesforce.com",
    ORCL: "oracle.com", IBM: "ibm.com", QCOM: "qualcomm.com",
    WMT: "walmart.com", COST: "costco.com", TGT: "target.com",
    SBUX: "starbucks.com", MCD: "mcdonalds.com", KO: "coca-cola.com",
    PEP: "pepsico.com", JNJ: "jnj.com", PFE: "pfizer.com",
    XOM: "exxonmobil.com", CVX: "chevron.com", BA: "boeing.com",
    GE: "ge.com", F: "ford.com", GM: "gm.com",
    ABNB: "airbnb.com", COIN: "coinbase.com", RBLX: "roblox.com",
    SNAP: "snap.com", PINS: "pinterest.com", TWTR: "twitter.com",
    ZM: "zoom.us", DOCU: "docusign.com", SNOW: "snowflake.com",
    PLTR: "palantir.com", NET: "cloudflare.com", DDOG: "datadoghq.com",
  };

  const sym = ticker.toUpperCase();
  const domain = DOMAIN_MAP[sym] || `${sym.toLowerCase()}.com`;
  const url = `https://logo.clearbit.com/${domain}`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    if (!response.ok) return res.status(404).send("Logo not found");

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/png";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(Buffer.from(buffer));
  } catch {
    res.status(404).send("Logo not found");
  }
}
