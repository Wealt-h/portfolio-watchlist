import { useState, useEffect, useRef } from "react";
import React from "react";
import { AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// ─── SIGNAL ENGINE ────────────────────────────────────────────────────────────
function calcSignal({ currentPrice, high52w, rsi, ma200, fearGreed, type }) {
  const pctBelowHigh = high52w > 0 ? ((high52w - currentPrice) / high52w) * 100 : null;
  const belowMA200 = ma200 > 0 ? currentPrice < ma200 : null;
  const pctBelowMA200 = ma200 > 0 ? ((ma200 - currentPrice) / ma200) * 100 : null;

  let score = 0;
  let reasons = [];

  if (rsi > 0) {
    if (rsi < 30) { score += 3; reasons.push(`RSI ${rsi} — oversold`); }
    else if (rsi < 40) { score += 2; reasons.push(`RSI ${rsi} — weak momentum`); }
    else if (rsi < 50) { score += 1; reasons.push(`RSI ${rsi} — below neutral`); }
    else if (rsi >= 70) { score -= 2; reasons.push(`RSI ${rsi} — overbought`); }
  }

  if (pctBelowHigh !== null) {
    if (pctBelowHigh >= 20) { score += 3; reasons.push(`${pctBelowHigh.toFixed(0)}% below 52W high`); }
    else if (pctBelowHigh >= 10) { score += 2; reasons.push(`${pctBelowHigh.toFixed(0)}% below 52W high`); }
    else if (pctBelowHigh < 0) { score -= 1; reasons.push("Above 52W high"); }
    else { reasons.push(`${pctBelowHigh.toFixed(0)}% below 52W high`); }
  }

  if (belowMA200 !== null) {
    if (belowMA200 && pctBelowMA200 >= 10) { score += 2; reasons.push(`${pctBelowMA200.toFixed(0)}% below 200MA`); }
    else if (belowMA200) { score += 1; reasons.push("Below 200MA"); }
    else { score -= 1; reasons.push("Above 200MA"); }
  }

  if (type === "crypto" && fearGreed > 0) {
    if (fearGreed <= 20) { score += 3; reasons.push(`Fear & Greed ${fearGreed} — extreme fear`); }
    else if (fearGreed <= 30) { score += 2; reasons.push(`Fear & Greed ${fearGreed} — fear zone`); }
    else if (fearGreed <= 45) { score += 1; reasons.push(`Fear & Greed ${fearGreed} — cautious`); }
    else if (fearGreed >= 75) { score -= 2; reasons.push(`Fear & Greed ${fearGreed} — greed zone`); }
  }

  let signal, label, color, bg, description;
  if (score >= 6) {
    signal = "strong-buy"; label = "STRONG BUY"; color = "#00ff9d"; bg = "rgba(0,255,157,0.12)";
    description = "RSI oversold + significant dip from highs";
  } else if (score >= 4) {
    signal = "dip"; label = "BUY DIP"; color = "#7dffb3"; bg = "rgba(125,255,179,0.1)";
    description = "Good dip conditions across multiple indicators";
  } else if (score >= 2) {
    signal = "watch"; label = "WATCHING"; color = "#7eb8ff"; bg = "rgba(126,184,255,0.1)";
    description = "Some weakness — monitor for better entry";
  } else if (score >= 0) {
    signal = "near-high"; label = "WAIT"; color = "#f5a623"; bg = "rgba(245,166,35,0.1)";
    description = "Near highs — wait for a meaningful pullback";
  } else {
    signal = "avoid"; label = "AVOID"; color = "#ff6b6b"; bg = "rgba(255,107,107,0.1)";
    description = "Overbought or in greed territory";
  }

  return { signal, label, color, bg, score, reasons, pctBelowHigh, belowMA200, pctBelowMA200, description };
}

// ─── DEFAULTS ─────────────────────────────────────────────────────────────────
const DEFAULT_WATCHLIST = [
  {
    id: 1, symbol: "BTC", name: "Bitcoin", type: "crypto",
    currentPrice: 73303, high52w: 108000, low52w: 49000, ma200: 79000,
    rsi: 34, fearGreed: 30, change24h: -1.2,
    thesis: "Digital hard money / store of value. Fixed supply, growing institutional adoption via ETFs. Post-halving supply dynamics support long-term price appreciation.",
    notes: "ETF outflows in May. Watch $72K as key support.",
  },
  {
    id: 2, symbol: "AMZN", name: "Amazon", type: "stock",
    currentPrice: 270.48, high52w: 278.56, low52w: 196.0, ma200: 235,
    rsi: 62, fearGreed: 0, change24h: -1.6,
    thesis: "Best-in-class AI infrastructure play via AWS. AI-driven margin expansion across logistics, advertising & retail.",
    notes: "Near ATH. Truist target $320. Wait for pullback to $240–250.",
  },
  {
    id: 3, symbol: "HOOD", name: "Robinhood Markets", type: "stock",
    currentPrice: 94.01, high52w: 153.86, low52w: 62.92, ma200: 107,
    rsi: 55, fearGreed: 0, change24h: 11.6,
    thesis: "Fintech platform with growing retail investor base. AI agentic trading launch is a strong product differentiator. Crypto trading revenue benefits directly from BTC bull cycles. 39% below 52W high despite strong fundamentals.",
    notes: "Just launched Agentic Trading + Agentic Credit Card — drove a 28% rally in late May. Mizuho target $115, Deutsche Bank $88. Post-spike RSI elevated — wait for cooldown before entry.",
  },
];
const DEFAULT_PORTFOLIO = [];

// ─── STORAGE ──────────────────────────────────────────────────────────────────
async function load(key, fallback) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
}
async function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ─── REAL-TIME PRICES (via serverless to avoid CORS) ─────────────────────────
async function fetchLivePrices(symbols) {
  try {
    const res = await fetch("/api/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols })
    });
    const data = await res.json();
    return data.prices || {};
  } catch {
    return {};
  }
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmtUSD = (v, d = 2) => v == null || isNaN(v) ? "—" : "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtPct = (v) => (v >= 0 ? "+" : "") + Number(v).toFixed(2) + "%";
// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "'Courier New', monospace";
const C = {
  bg:          "#07080a",
  surface:     "#111318",
  surfaceHigh: "#181c22",
  border:      "rgba(255,255,255,0.14)",
  borderHover: "rgba(255,255,255,0.26)",
  borderAccent:"rgba(74,222,128,0.55)",
  text1:       "#f0f5f2",
  text2:       "rgba(240,245,242,0.65)",
  text3:       "rgba(240,245,242,0.35)",
  green:       "#3ddc84",
  greenDim:    "rgba(61,220,132,0.14)",
  greenBorder: "rgba(61,220,132,0.4)",
  red:         "#ff6b6b",
  redDim:      "rgba(255,107,107,0.12)",
  amber:       "#fbbf24",
  blue:        "#93c5fd",
  blueDim:     "rgba(147,197,253,0.12)",
};
const INP = { background: C.surfaceHigh, border: `1px solid ${C.borderHover}`, borderRadius: 8, padding: "10px 12px", color: C.text1, fontSize: 13, fontFamily: FONT, fontWeight: 300, outline: "none", width: "100%", boxSizing: "border-box" };
const LBL = { fontSize: 10, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 4, textTransform: "uppercase" };

// ─── SIGNAL BADGE ─────────────────────────────────────────────────────────────
function SignalBadge({ sig, size = "md" }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: `${sig.color}18`, border: `1px solid ${sig.color}70`, borderRadius: 4, padding: size === "sm" ? "2px 8px" : "4px 11px", fontSize: size === "sm" ? 9 : 10, fontWeight: 500, color: sig.color, fontFamily: MONO, letterSpacing: 1.5, textTransform: "uppercase" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: sig.color, display: "inline-block", flexShrink: 0, boxShadow: `0 0 4px ${sig.color}` }} />
      {sig.label}
    </span>
  );
}

// ─── SIGNAL BREAKDOWN ─────────────────────────────────────────────────────────
function SignalBreakdown({ asset }) {
  const sig = calcSignal(asset);
  const indicators = [
    asset.rsi > 0 && { label: "RSI", value: asset.rsi, note: asset.rsi < 30 ? "Oversold ✓" : asset.rsi < 40 ? "Weak ✓" : asset.rsi >= 70 ? "Overbought ✗" : "Neutral", good: asset.rsi < 40 },
    asset.high52w > 0 && { label: "vs 52W HIGH", value: sig.pctBelowHigh != null ? `-${sig.pctBelowHigh.toFixed(1)}%` : "—", note: sig.pctBelowHigh >= 20 ? "Strong dip ✓✓" : sig.pctBelowHigh >= 10 ? "Dip ✓" : "Near high ✗", good: sig.pctBelowHigh >= 10 },
    asset.ma200 > 0 && { label: "200MA", value: fmtUSD(asset.ma200, 0), note: sig.belowMA200 ? `${sig.pctBelowMA200?.toFixed(1)}% below ✓` : "Above 200MA ✗", good: sig.belowMA200 },
    asset.type === "crypto" && asset.fearGreed > 0 && { label: "FEAR & GREED", value: asset.fearGreed, note: asset.fearGreed <= 30 ? "Fear zone ✓" : asset.fearGreed >= 75 ? "Greed ✗" : "Neutral", good: asset.fearGreed <= 45 },
  ].filter(Boolean);

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 10 }}>SIGNAL BREAKDOWN · SCORE {sig.score}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {indicators.map(ind => (
          <div key={ind.label} style={{ background: ind.good ? C.greenDim : C.redDim, border: `1px solid ${ind.good ? C.greenBorder : "rgba(248,113,113,0.2)"}`, borderRadius: 6, padding: "8px 10px" }}>
            <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 4 }}>{ind.label}</div>
            <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 15, color: ind.good ? C.green : C.red, marginBottom: 2 }}>{ind.value}</div>
            <div style={{ fontSize: 10, color: ind.good ? "rgba(74,222,128,0.6)" : "rgba(248,113,113,0.6)", fontFamily: MONO }}>{ind.note}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: C.text3, fontStyle: "italic", fontFamily: FONT, fontWeight: 300 }}>{sig.description}</div>
    </div>
  );
}

// ─── PRICE BAR ────────────────────────────────────────────────────────────────
function PriceBar({ low52w, high52w, current, ma200 }) {
  const pct = Math.min(100, Math.max(0, ((current - low52w) / (high52w - low52w)) * 100));
  const maPct = ma200 > 0 ? Math.min(100, Math.max(0, ((ma200 - low52w) / (high52w - low52w)) * 100)) : null;
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.text3, marginBottom: 6, fontFamily: MONO, letterSpacing: 1 }}>
        <span>{fmtUSD(low52w, 0)}</span><span>52W RANGE</span><span>{fmtUSD(high52w, 0)}</span>
      </div>
      <div style={{ position: "relative", height: 3, background: C.borderHover, borderRadius: 3 }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${C.green}40, ${C.green})`, borderRadius: 3 }} />
        {maPct !== null && <div style={{ position: "absolute", top: -4, left: `${maPct}%`, transform: "translateX(-50%)", width: 1, height: 11, background: C.amber, opacity: 0.8 }} />}
        <div style={{ position: "absolute", top: -3, left: `${pct}%`, transform: "translateX(-50%)", width: 9, height: 9, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}80` }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <div style={{ fontSize: 10, color: C.text3, fontFamily: MONO }}>{pct.toFixed(0)}% of range</div>
        {maPct !== null && <div style={{ fontSize: 10, color: C.amber, fontFamily: MONO, opacity: 0.7 }}>200MA</div>}
      </div>
    </div>
  );
}

// ─── ASSET LOGO ──────────────────────────────────────────────────────────────
const STOCK_DOMAINS = {
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
  ABNB: "airbnb.com", COIN: "coinbase.com", PLTR: "palantir.com",
  NET: "cloudflare.com", SNOW: "snowflake.com", DDOG: "datadoghq.com",
};

const CRYPTO_TICKERS = ["BTC","ETH","SOL","DOGE","ADA","XRP","BNB","AVAX","MATIC","DOT","LINK","LTC","UNI","ATOM","NEAR","APT","SHIB","TRX","TON"];

function AssetLogo({ symbol, size = 40, color = "rgba(240,245,242,0.7)" }) {
  const [srcIndex, setSrcIndex] = useState(0);
  const ticker = symbol.replace("-USD","").replace("-","").toUpperCase();
  const isCrypto = CRYPTO_TICKERS.includes(ticker) || symbol.includes("-USD");
  const domain = STOCK_DOMAINS[ticker] || `${ticker.toLowerCase()}.com`;

  // cdn.tickerlogos.com — free, no API key, CORS enabled, finance-focused
  const sources = isCrypto
    ? [
        `https://assets.coincap.io/assets/icons/${ticker.toLowerCase()}@2x.png`,
        `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${ticker.toLowerCase()}.png`,
      ]
    : [
        `https://cdn.tickerlogos.com/${domain}`,
      ];

  const failed = srcIndex >= sources.length;

  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.25, background: C.surfaceHigh, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
      {!failed
        ? <img src={sources[srcIndex]} alt={symbol} onError={() => setSrcIndex(i => i + 1)}
            style={{ width: size * 0.68, height: size * 0.68, objectFit: "contain", borderRadius: 4 }} />
        : <span style={{ fontSize: size * 0.28, fontWeight: 500, color, fontFamily: MONO, letterSpacing: 1 }}>{ticker.slice(0,2)}</span>
      }
    </div>
  );
}

// ─── WATCH CARD ───────────────────────────────────────────────────────────────
function WatchCard({ asset, onEdit, onDelete, onNotesUpdate, onThesisUpdate }) {
  const [open, setOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [sparkData, setSparkData] = useState(null);
  const [sparkLoading, setSparkLoading] = useState(false);
  const sig = calcSignal(asset);

  useEffect(() => {
    if (!open || sparkData) return;
    setSparkLoading(true);
    fetch("/api/sparkline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: asset.symbol }),
    })
      .then(r => r.json())
      .then(d => { if (d.points) setSparkData(d.points); })
      .catch(() => {})
      .finally(() => setSparkLoading(false));
  }, [open]);

  const handleAiUpdate = async (e, mode = "notes") => {
    e.stopPropagation();
    setAiLoading(mode);
    setAiError(null);
    try {
      const res = await fetch("/api/update-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          currentPrice: asset.currentPrice,
          change24h: asset.change24h,
          mode,
        }),
      });
      const data = await res.json();
      if (data.note) {
        if (mode === "thesis") onThesisUpdate(asset.id, data.note);
        else onNotesUpdate(asset.id, data.note);
      } else {
        setAiError("Could not fetch update");
      }
    } catch {
      setAiError("Network error");
    }
    setAiLoading(null);
  };

  return (
    <div onClick={() => setOpen(!open)} style={{ background: open ? C.surfaceHigh : C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 12, padding: "18px 20px", marginBottom: 10, cursor: "pointer", borderLeft: open ? `3px solid ${C.green}` : `1px solid ${C.borderHover}`, transition: "border-color 0.2s, background 0.2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <AssetLogo symbol={asset.symbol} size={40} />
          <div>
            <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 16, color: C.text1, letterSpacing: 0.2 }}>{asset.symbol}</div>
            <div style={{ fontSize: 11, color: C.text3, fontFamily: FONT, fontWeight: 300, marginTop: 2 }}>{asset.name}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: FONT, fontWeight: 400, fontSize: 20, color: C.text1, letterSpacing: -0.5 }}>{fmtUSD(asset.currentPrice)}</div>
          <div style={{ fontSize: 11, color: asset.change24h < 0 ? C.red : C.green, fontFamily: MONO, marginTop: 3, fontWeight: 500 }}>
            {asset.change24h > 0 ? "+" : ""}{asset.change24h}%
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <SignalBadge sig={sig} />
        <span style={{ fontSize: 10, color: C.text3, marginLeft: 4 }}>{open ? "↑" : "↓"}</span>
      </div>
      {open && (
        <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 16 }} onClick={e => e.stopPropagation()}>
          <PriceBar low52w={asset.low52w} high52w={asset.high52w} current={asset.currentPrice} ma200={asset.ma200} />

          {/* Sparkline — 30 day price chart */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 8 }}>30 DAY PRICE</div>
            {sparkLoading && <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 10, color: C.text3, fontFamily: MONO }}>loading chart...</span></div>}
            {sparkData && !sparkLoading && (() => {
              const first = sparkData[0]?.v || 1;
              const last = sparkData[sparkData.length - 1]?.v || 1;
              const isUp = last >= first;
              const color = isUp ? C.green : C.red;
              return (
                <ResponsiveContainer width="100%" height={64}>
                  <AreaChart data={sparkData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id={`sg-${asset.symbol}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sg-${asset.symbol})`} dot={false} />
                    <Tooltip
                      contentStyle={{ background: C.surfaceHigh, border: `1px solid ${C.borderHover}`, borderRadius: 6, padding: "4px 8px" }}
                      labelStyle={{ display: "none" }}
                      itemStyle={{ color: C.text1, fontSize: 11, fontFamily: MONO }}
                      formatter={v => [fmtUSD(v), ""]}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
          <SignalBreakdown asset={asset} />


          {/* Thesis section */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={LBL}>THESIS</div>
              <button onClick={e => handleAiUpdate(e, "thesis")} disabled={!!aiLoading}
                style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: `1px solid ${C.border}`, color: C.text3, borderRadius: 4, padding: "3px 10px", fontSize: 9, fontFamily: MONO, cursor: aiLoading?"default":"pointer", letterSpacing: 1.5, textTransform: "uppercase" }}>
                <span style={{ display: "inline-block", animation: aiLoading==="thesis"?"spin 1s linear infinite":"none", opacity: 0.6 }}>↻</span>
                {aiLoading==="thesis" ? "writing..." : "thesis"}
                <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
              </button>
            </div>
            {aiLoading==="thesis" && <div style={{ fontSize: 12, color: "#6a3d80", fontFamily: "monospace", fontStyle: "italic" }}>Generating thesis...</div>}
            {asset.thesis && !aiLoading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {asset.thesis.split("\n").filter(l => l.trim()).map((line, i) => {
                  const isPos = line.startsWith("+");
                  const isNeg = line.startsWith("-");
                  const text = (isPos || isNeg) ? line.slice(1).trim() : line.trim();
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      {(isPos || isNeg) && (
                        <span style={{ fontSize: 11, fontWeight: 300, color: isPos ? C.green : C.red, flexShrink: 0, marginTop: 1, opacity: 0.8 }}>
                          {isPos ? "+" : "−"}
                        </span>
                      )}
                      <span style={{ fontSize: 12, color: isPos ? "rgba(74,222,128,0.7)" : isNeg ? "rgba(248,113,113,0.7)" : C.text2, lineHeight: 1.6, fontFamily: FONT, fontWeight: 300 }}>{text}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {!asset.thesis && !aiLoading && (
              <div style={{ fontSize: 12, color: "#2d4a3a", fontStyle: "italic", fontFamily: "monospace" }}>Tap AI THESIS to generate a philosophy-aligned thesis →</div>
            )}
          </div>

          {/* Daily Intel section */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={LBL}>DAILY INTEL</div>
              <button onClick={e => handleAiUpdate(e, "notes")} disabled={!!aiLoading}
                style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: `1px solid ${C.border}`, color: C.text3, borderRadius: 4, padding: "3px 10px", fontSize: 9, fontFamily: MONO, cursor: aiLoading?"default":"pointer", letterSpacing: 1.5, textTransform: "uppercase" }}>
                <span style={{ display: "inline-block", animation: aiLoading==="notes"?"spin 1s linear infinite":"none", opacity: 0.6 }}>↻</span>
                {aiLoading==="notes" ? "updating..." : "update"}
              </button>
            </div>
            {aiLoading==="notes" && (
              <div style={{ background: "rgba(126,184,255,0.05)", border: "1px solid rgba(126,184,255,0.15)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7eb8ff", animation: "pulse 1s infinite" }} />
                  <span style={{ fontSize: 12, color: "#4a7a9a", fontFamily: "monospace" }}>Fetching market update...</span>
                  <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }`}</style>
                </div>
              </div>
            )}
            {!aiLoading && asset.notes && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.7, fontFamily: FONT, fontWeight: 300 }}>{asset.notes}</div>
              </div>
            )}
            {!aiLoading && !asset.notes && (
              <div style={{ fontSize: 12, color: "#2d4a3a", fontStyle: "italic", fontFamily: "monospace" }}>Tap AI UPDATE for today's market briefing →</div>
            )}
            {aiError && <div style={{ fontSize: 11, color: "#ff6b6b", marginTop: 6, fontFamily: "monospace" }}>{aiError}</div>}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={() => onEdit(asset)} style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, color: C.text2, borderRadius: 6, padding: "8px 0", fontSize: 11, fontFamily: MONO, cursor: "pointer", letterSpacing: 1.5, textTransform: "uppercase" }}>Edit</button>
            <button onClick={() => onDelete(asset.id)} style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, color: "rgba(248,113,113,0.4)", borderRadius: 6, padding: "8px 0", fontSize: 11, fontFamily: MONO, cursor: "pointer", letterSpacing: 1.5, textTransform: "uppercase" }}>Remove</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── WATCH MODAL ──────────────────────────────────────────────────────────────
function WatchModal({ asset, onSave, onClose }) {
  const blank = { symbol: "", name: "", type: "stock", currentPrice: "", high52w: "", low52w: "", ma200: "", rsi: "", fearGreed: "", change24h: 0, thesis: "", notes: "" };
  const [f, setF] = useState(asset ? { ...asset } : blank);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const parsed = { ...f, currentPrice: parseFloat(f.currentPrice)||0, high52w: parseFloat(f.high52w)||0, low52w: parseFloat(f.low52w)||0, ma200: parseFloat(f.ma200)||0, rsi: parseFloat(f.rsi)||0, fearGreed: parseFloat(f.fearGreed)||0 };
  const sig = parsed.currentPrice && parsed.high52w ? calcSignal(parsed) : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 14, padding: 28, width: "100%", maxWidth: 500, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 15, color: C.text1, marginBottom: 20, letterSpacing: 0.3 }}>{asset ? "Edit asset" : "Add asset"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 13 }}>
          <div><div style={LBL}>SYMBOL</div><input value={f.symbol} onChange={e => set("symbol", e.target.value.toUpperCase())} placeholder="HOOD" style={INP} /></div>
          <div><div style={LBL}>NAME</div><input value={f.name} onChange={e => set("name", e.target.value)} placeholder="Robinhood" style={INP} /></div>
        </div>
        <div style={{ marginBottom: 13 }}>
          <div style={LBL}>TYPE</div>
          <div style={{ display: "flex", gap: 8 }}>
            {["stock","crypto","etf"].map(t => (
              <button key={t} onClick={() => set("type", t)} style={{ flex: 1, background: f.type===t?"rgba(0,255,157,0.12)":"rgba(255,255,255,0.03)", border: `1px solid ${f.type===t?"rgba(0,255,157,0.35)":"rgba(255,255,255,0.08)"}`, color: f.type===t?"#00ff9d":"#4a6655", borderRadius: 8, padding: "8px 0", fontSize: 11, fontFamily: "monospace", cursor: "pointer", letterSpacing: 1 }}>{t.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 13 }}>
          {[["CURRENT PRICE ($)","currentPrice"],["52W HIGH ($)","high52w"],["52W LOW ($)","low52w"],["200-DAY MA ($)","ma200"]].map(([l,k]) => (
            <div key={k}><div style={LBL}>{l}</div><input value={f[k]} onChange={e => set(k, e.target.value)} type="number" style={INP} /></div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 13 }}>
          <div>
            <div style={LBL}>RSI (0–100)</div>
            <input value={f.rsi} onChange={e => set("rsi", e.target.value)} type="number" placeholder="34" style={INP} />
            <div style={{ fontSize: 10, color: "#3a5a4a", marginTop: 3, fontFamily: "monospace" }}>{"<30 oversold · >70 overbought"}</div>
          </div>
          {f.type === "crypto" ? (
            <div>
              <div style={LBL}>FEAR & GREED (0–100)</div>
              <input value={f.fearGreed} onChange={e => set("fearGreed", e.target.value)} type="number" placeholder="30" style={INP} />
              <div style={{ fontSize: 10, color: "#3a5a4a", marginTop: 3, fontFamily: "monospace" }}>{"<30 fear · >75 greed"}</div>
            </div>
          ) : (
            <div>
              <div style={LBL}>24H CHANGE (%)</div>
              <input value={f.change24h} onChange={e => set("change24h", e.target.value)} type="number" placeholder="-1.2" style={INP} />
            </div>
          )}
        </div>
        {sig && (
          <div style={{ background: `${sig.color}08`, border: `1px solid ${sig.color}25`, borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "#4a6655", fontFamily: "monospace", letterSpacing: 2, marginBottom: 8 }}>AUTO SIGNAL PREVIEW</div>
            <SignalBadge sig={sig} />
            <div style={{ fontSize: 12, color: "#6a9a7a", marginTop: 6, fontStyle: "italic" }}>{sig.description}</div>
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {sig.reasons.map((r,i) => <span key={i} style={{ fontSize: 10, color: "#4a7a5a", fontFamily: "monospace", background: "rgba(0,255,157,0.05)", border: "1px solid rgba(0,255,157,0.1)", borderRadius: 4, padding: "2px 6px" }}>{r}</span>)}
            </div>
          </div>
        )}
        {[["THESIS","thesis","Why I'm long-term bullish..."],["NOTES","notes","Entry targets, key levels..."]].map(([l,k,ph]) => (
          <div key={k} style={{ marginBottom: 13 }}><div style={LBL}>{l}</div><textarea value={f[k]} onChange={e => set(k, e.target.value)} rows={2} placeholder={ph} style={{ ...INP, resize: "vertical" }} /></div>
        ))}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => onSave({ ...f, ...parsed })} style={{ flex: 2, background: C.surface, border: `1px solid ${C.borderHover}`, color: C.text1, borderRadius: 8, padding: "12px 0", fontSize: 12, fontFamily: FONT, fontWeight: 300, cursor: "pointer" }}>Save</button>
          <button onClick={onClose} style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, color: C.text3, borderRadius: 8, padding: "12px 0", fontSize: 12, fontFamily: FONT, fontWeight: 300, cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── ASSET SEARCH MODAL ──────────────────────────────────────────────────────
function AssetSearchModal({ onAdd, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(null);
  const [error, setError] = useState(null);
  const debounceRef = React.useRef(null);

  const search = async (q) => {
    if (!q || q.length < 1) { setResults([]); return; }
    setSearching(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch { setError("Search failed"); }
    setSearching(false);
  };

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 350);
  };

  const handleAdd = async (result) => {
    setAdding(result.symbol);
    setError(null);
    try {
      const res = await fetch("/api/asset-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: result.symbol }),
      });
      const details = await res.json();
      if (details.error) throw new Error(details.error);
      onAdd({
        id: Date.now(),
        symbol: result.symbol,
        name: result.name,
        type: result.type,
        exchange: result.exchange,
        currentPrice: details.currentPrice || 0,
        change24h: details.change24h || 0,
        high52w: details.high52w || 0,
        low52w: details.low52w || 0,
        ma200: details.ma200 || 0,
        rsi: 50,
        fearGreed: 0,
        thesis: "",
        notes: "",
      });
      onClose();
    } catch (err) {
      setError(`Failed to add ${result.symbol}: ${err.message}`);
    }
    setAdding(null);
  };

  const TYPE_COLOR = { stock: "#7eb8ff", crypto: "#00ff9d", etf: "#f5a623" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: "14px 14px 0 0", padding: "20px 18px 40px", width: "100%", maxWidth: 520, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 15, color: C.text1, letterSpacing: 0.3 }}>Add asset</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.text3, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        {/* Search input */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <input
            autoFocus
            value={query}
            onChange={handleInput}
            placeholder="Search stocks, crypto, ETFs..."
            style={{ ...INP, paddingLeft: 36, fontSize: 14 }}
          />
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#4a6655", fontSize: 14 }}>
            {searching ? "⟳" : "⌕"}
          </span>
        </div>

        {/* Results */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {error && <div style={{ fontSize: 12, color: "#ff6b6b", fontFamily: "monospace", marginBottom: 10 }}>{error}</div>}

          {results.length === 0 && !searching && query.length > 0 && (
            <div style={{ textAlign: "center", color: "#3d5449", fontFamily: "monospace", fontSize: 12, padding: "30px 0" }}>NO RESULTS FOUND</div>
          )}

          {results.length === 0 && !query && (
            <div>
              <div style={{ marginBottom: 12, fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2 }}>POPULAR</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["BTC", "AMZN", "NVDA", "AAPL", "MSFT", "ETH", "TSLA", "GOOGL"].map(s => (
                  <button key={s} onClick={() => { setQuery(s); search(s); }}
                    style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text2, borderRadius: 4, padding: "5px 12px", fontSize: 11, fontFamily: FONT, fontWeight: 300, cursor: "pointer" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.map(r => (
            <div key={r.symbol} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <AssetLogo symbol={r.symbol} size={36} />
                <div>
                  <div style={{ fontFamily: FONT, fontWeight: 400, fontSize: 14, color: C.text1 }}>{r.symbol}</div>
                  <div style={{ fontSize: 11, color: C.text3, marginTop: 1, fontFamily: FONT, fontWeight: 300 }}>{r.name.length > 32 ? r.name.slice(0, 32) + "…" : r.name}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5 }}>{r.type.toUpperCase()}</span>
                <button onClick={() => handleAdd(r)} disabled={!!adding}
                  style={{ background: "transparent", border: `1px solid ${C.border}`, color: adding===r.symbol?C.text3:C.text1, borderRadius: 6, padding: "6px 14px", fontSize: 11, fontFamily: FONT, fontWeight: 300, cursor: adding?"default":"pointer", minWidth: 60, textAlign: "center" }}>
                  {adding === r.symbol ? "…" : "+ Add"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TRADE MODAL (BUY + SELL) ─────────────────────────────────────────────────
function TradeModal({ watchlist, onSave, onClose, defaultType = "buy" }) {
  const [tradeType, setTradeType] = useState(defaultType);
  const [f, setF] = useState({ symbol: "", name: "", price: "", units: "", fees: "", date: new Date().toISOString().slice(0,10), notes: "" });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const pick = (sym) => { const a = watchlist.find(x => x.symbol === sym); if (a) setF(p => ({ ...p, symbol: a.symbol, name: a.name })); else setF(p => ({ ...p, symbol: sym })); };
  const subtotal = (parseFloat(f.price)||0) * (parseFloat(f.units)||0);
  const fees = parseFloat(f.fees)||0;
  const total = tradeType === "buy" ? subtotal + fees : subtotal - fees;
  const SML = { ...INP, padding: "7px 10px", fontSize: 12 };
  const LBL2 = { ...LBL, marginBottom: 3 };
  const isBuy = tradeType === "buy";
  const accent = isBuy ? "#00ff9d" : "#f5a623";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: "14px 14px 0 0", padding: "20px 18px 32px", width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {["buy","sell"].map(t => (
              <button key={t} onClick={() => setTradeType(t)} style={{ background: tradeType===t?C.surface:"transparent", border:`1px solid ${tradeType===t?C.borderHover:C.border}`, color:tradeType===t?C.text1:C.text3, borderRadius:4, padding:"6px 16px", fontSize:11, fontFamily:FONT, fontWeight:300, cursor:"pointer", letterSpacing:0.3 }}>
                {t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.text3, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        {/* Symbol pills */}
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>
          {watchlist.map(a => (
            <button key={a.symbol} onClick={() => pick(a.symbol)}
              style={{ background: f.symbol===a.symbol?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.04)", border: `1px solid ${f.symbol===a.symbol?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.1)"}`, color: f.symbol===a.symbol?"#e8f5ec":"#6a8a7a", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontFamily: "monospace", cursor: "pointer" }}>
              {a.symbol}
            </button>
          ))}
          <input value={f.symbol.length && !watchlist.find(x=>x.symbol===f.symbol) ? f.symbol : ""} onChange={e => pick(e.target.value.toUpperCase())} placeholder="OTHER" style={{ ...SML, width: 80, borderRadius: 20, padding: "5px 12px", textAlign: "center" }} />
        </div>

        {/* Price / Units / Date */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
          <div><div style={LBL2}>{isBuy?"BUY":"SELL"} PRICE</div><input value={f.price} onChange={e => set("price", e.target.value)} type="number" placeholder="0.00" style={SML} /></div>
          <div><div style={LBL2}>UNITS</div><input value={f.units} onChange={e => set("units", e.target.value)} type="number" placeholder="0" style={SML} /></div>
          <div><div style={LBL2}>DATE</div><input value={f.date} onChange={e => set("date", e.target.value)} type="date" style={{ ...SML, colorScheme: "dark" }} /></div>
        </div>

        {/* Fees */}
        <div style={{ marginBottom: 10 }}>
          <div style={LBL2}>BROKERAGE FEE <span style={{ color: "#2d4a3a" }}>(optional)</span></div>
          <input value={f.fees} onChange={e => set("fees", e.target.value)} type="number" placeholder="0.00" style={{ ...SML, width: "50%" }} />
        </div>

        {/* Summary pill */}
        {subtotal > 0 && (
          <div style={{ background: isBuy?"rgba(0,255,157,0.06)":"rgba(245,166,35,0.06)", border: `1px solid ${isBuy?"rgba(0,255,157,0.15)":"rgba(245,166,35,0.15)"}`, borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 12, marginBottom: fees>0?4:0 }}>
              <span style={{ color: "#4a6655" }}>SUBTOTAL</span>
              <span style={{ color: "#c8dfd1" }}>{fmtUSD(subtotal)}</span>
            </div>
            {fees > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: "#4a6655" }}>FEES</span>
              <span style={{ color: "#ff6b6b" }}>+{fmtUSD(fees)}</span>
            </div>}
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 13, borderTop: fees>0?"1px solid rgba(255,255,255,0.06)":"none", paddingTop: fees>0?4:0 }}>
              <span style={{ color: "#4a6655" }}>{isBuy?"TOTAL COST":"NET PROCEEDS"}</span>
              <span style={{ color: accent, fontWeight: 800 }}>{fmtUSD(total)}</span>
            </div>
          </div>
        )}

        {/* Notes */}
        <div style={{ marginBottom: 14 }}>
          <div style={LBL2}>NOTES <span style={{ color: "#2d4a3a" }}>(optional)</span></div>
          <textarea value={f.notes} onChange={e => set("notes", e.target.value)} rows={2} placeholder={isBuy?"Why I bought this dip...":"Why I'm taking profit / cutting loss..."} style={{ ...SML, resize: "none", width: "100%" }} />
        </div>

        <button onClick={() => onSave({ id: Date.now(), type: tradeType, symbol: f.symbol.toUpperCase().trim(), name: f.name, price: parseFloat(f.price)||0, units: parseFloat(f.units)||0, fees: parseFloat(f.fees)||0, date: f.date, notes: f.notes, total })}
          style={{ width: "100%", background: C.surface, border: `1px solid ${C.borderHover}`, color: C.text1, borderRadius: 8, padding: "13px 0", fontSize: 12, fontFamily: FONT, fontWeight: 300, cursor: "pointer", letterSpacing: 0.5 }}>
          Log {tradeType}
        </button>
      </div>
    </div>
  );
}

// ─── EDIT TRADE MODAL ────────────────────────────────────────────────────────
function EditTradeModal({ trade, onSave, onClose }) {
  const [f, setF] = useState({
    price: trade.price,
    units: trade.units,
    fees: trade.fees || 0,
    date: trade.date,
    notes: trade.notes || "",
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const subtotal = (parseFloat(f.price)||0) * (parseFloat(f.units)||0);
  const fees = parseFloat(f.fees)||0;
  const total = trade.type === "buy" ? subtotal + fees : subtotal - fees;
  const SML = { ...INP, padding: "7px 10px", fontSize: 12 };
  const LBL2 = { ...LBL, marginBottom: 3 };
  const accent = trade.type === "buy" ? "#00ff9d" : "#f5a623";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 300 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: "14px 14px 0 0", padding: "20px 18px 32px", width: "100%", maxWidth: 520 }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 9, fontFamily: MONO, color: trade.type==="buy"?C.green:C.amber, letterSpacing: 2, textTransform: "uppercase" }}>{trade.type}</span>
            <span style={{ fontFamily: FONT, fontWeight: 300, fontSize: 14, color: C.text1 }}>{trade.symbol} · Edit trade</span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.text3, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        {/* Fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div><div style={LBL2}>PRICE ($)</div><input value={f.price} onChange={e => set("price", e.target.value)} type="number" style={SML} /></div>
          <div><div style={LBL2}>UNITS</div><input value={f.units} onChange={e => set("units", e.target.value)} type="number" style={SML} /></div>
          <div><div style={LBL2}>DATE</div><input value={f.date} onChange={e => set("date", e.target.value)} type="date" style={{ ...SML, colorScheme: "dark" }} /></div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={LBL2}>BROKERAGE FEE</div>
          <input value={f.fees} onChange={e => set("fees", e.target.value)} type="number" style={{ ...SML, width: "50%" }} />
        </div>

        {/* Summary */}
        {subtotal > 0 && (
          <div style={{ background: `${accent}08`, border: `1px solid ${accent}20`, borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontFamily: "monospace", fontSize: 12, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#4a6655" }}>{trade.type === "buy" ? "TOTAL COST" : "NET PROCEEDS"}</span>
            <span style={{ color: accent, fontWeight: 800 }}>{fmtUSD(total)}</span>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <div style={LBL2}>NOTES</div>
          <textarea value={f.notes} onChange={e => set("notes", e.target.value)} rows={2} style={{ ...SML, resize: "none", width: "100%" }} />
        </div>

        <button onClick={() => onSave({ ...trade, price: parseFloat(f.price)||0, units: parseFloat(f.units)||0, fees: parseFloat(f.fees)||0, date: f.date, notes: f.notes, total })}
          style={{ width: "100%", background: C.surface, border: `1px solid ${C.borderHover}`, color: C.text1, borderRadius: 8, padding: "13px 0", fontSize: 12, fontFamily: FONT, fontWeight: 300, cursor: "pointer" }}>
          Save changes
        </button>
      </div>
    </div>
  );
}

// ─── INSIGHTS TAB ────────────────────────────────────────────────────────────
function InsightsTab({ portfolio, watchlist, positionSummaries, period, setPeriod, spyData, btcPeriodData, getLivePrice }) {

  // Period days mapping
  const periodDays = { daily: 1, weekly: 7, monthly: 30 };
  const days = periodDays[period];

  // Filter trades within period
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const periodTrades = portfolio.filter(t => t.date >= cutoffStr);

  // Overall P&L
  const totalInvested = positionSummaries.reduce((s, {pos}) => s + pos.costBasis, 0);
  const totalValue = positionSummaries.reduce((s, {pos}) => s + pos.currentValue, 0);
  const totalPnl = totalValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  // Best / worst performer
  const performers = positionSummaries
    .map(({sym, pos}) => ({ sym, pct: pos.unrealisedPct, pnl: pos.unrealisedPnl }))
    .sort((a, b) => b.pct - a.pct);
  const best = performers[0] || null;
  const worst = performers[performers.length - 1] || null;

  // Win rate
  const winners = positionSummaries.filter(({pos}) => pos.unrealisedPnl > 0).length;
  const winRate = positionSummaries.length > 0 ? (winners / positionSummaries.length) * 100 : 0;

  // Asset class breakdown
  const assetClasses = {};
  positionSummaries.forEach(({sym, pos}) => {
    const asset = watchlist.find(a => a.symbol === sym);
    const type = asset?.type || "stock";
    if (!assetClasses[type]) assetClasses[type] = { pnl: 0, value: 0, cost: 0, assets: [] };
    assetClasses[type].pnl += pos.unrealisedPnl;
    assetClasses[type].value += pos.currentValue;
    assetClasses[type].cost += pos.costBasis;
    assetClasses[type].assets.push({ sym, pct: pos.unrealisedPct, pnl: pos.unrealisedPnl });
  });

  const classColors = { crypto: C.amber, stock: C.blue, etf: C.green };
  const classLabels = { crypto: "Crypto", stock: "Stocks", etf: "ETFs" };

  // S&P and BTC benchmarks (24h change as proxy)
  const spyChange = spyData?.change24h || null;
  const btcChange = btcPeriodData?.change24h || null;

  // Bar chart data for asset classes
  const barData = Object.entries(assetClasses).map(([type, data]) => ({
    name: classLabels[type] || type,
    pct: data.cost > 0 ? parseFloat(((data.pnl / data.cost) * 100).toFixed(2)) : 0,
    color: classColors[type] || C.blue,
  }));

  // Add benchmarks to bar chart
  if (spyChange !== null) barData.push({ name: "S&P 500", pct: spyChange, color: "rgba(240,245,242,0.4)", isBenchmark: true });
  if (btcChange !== null && !assetClasses["crypto"]) barData.push({ name: "BTC", pct: btcChange, color: C.amber, isBenchmark: true });

  const StatCard = ({ label, value, sub, color }) => (
    <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 20, color: color || C.text1, letterSpacing: -0.5 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.text3, fontFamily: MONO, marginTop: 3 }}>{sub}</div>}
    </div>
  );

  return (
    <div>
      {/* Period toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {["daily","weekly","monthly"].map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ flex: 1, background: period===p?C.surfaceHigh:"transparent", border: `1px solid ${period===p?C.borderHover:C.border}`, color: period===p?C.text1:C.text3, borderRadius: 6, padding: "8px 0", fontSize: 11, fontFamily: FONT, fontWeight: period===p?500:300, cursor: "pointer", letterSpacing: 0.3, textTransform: "capitalize" }}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {positionSummaries.length === 0 ? (
        <div style={{ textAlign: "center", color: C.text3, fontFamily: FONT, fontWeight: 300, fontSize: 13, padding: "60px 0" }}>
          No portfolio data yet<br/><span style={{ fontSize: 11, opacity: 0.6 }}>Add trades to see insights</span>
        </div>
      ) : (
        <>
          {/* Overall P&L */}
          <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 10 }}>OVERALL P&L</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 28, color: totalPnl >= 0 ? C.green : C.red, letterSpacing: -1 }}>
                  {totalPnl >= 0 ? "+" : ""}{fmtUSD(totalPnl)}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: totalPnl >= 0 ? "rgba(61,220,132,0.7)" : "rgba(255,107,107,0.7)", marginTop: 3 }}>
                  {totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(2)}% since purchase
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 3 }}>CURRENT VALUE</div>
                <div style={{ fontFamily: FONT, fontWeight: 400, fontSize: 16, color: C.text1 }}>{fmtUSD(totalValue)}</div>
              </div>
            </div>
          </div>

          {/* Best / Worst / Win rate */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            <StatCard
              label="Best"
              value={best ? best.sym : "—"}
              sub={best ? `+${best.pct.toFixed(1)}%` : null}
              color={C.green}
            />
            <StatCard
              label="Worst"
              value={worst && worst.pct < 0 ? worst.sym : "—"}
              sub={worst && worst.pct < 0 ? `${worst.pct.toFixed(1)}%` : "None in loss"}
              color={worst && worst.pct < 0 ? C.red : C.text3}
            />
            <StatCard
              label="Win Rate"
              value={`${winRate.toFixed(0)}%`}
              sub={`${winners}/${positionSummaries.length} positions`}
              color={winRate >= 50 ? C.green : C.red}
            />
          </div>

          {/* Asset class performance vs benchmarks */}
          <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 14 }}>ASSET CLASS PERFORMANCE</div>

            {/* Bar chart */}
            <div style={{ marginBottom: 16 }}>
              {barData.map((d, i) => {
                const maxAbs = Math.max(...barData.map(b => Math.abs(b.pct)), 1);
                const barWidth = Math.abs(d.pct) / maxAbs * 100;
                return (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {d.isBenchmark && <span style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1 }}>BENCH</span>}
                        <span style={{ fontSize: 12, color: d.isBenchmark ? C.text3 : C.text1, fontFamily: FONT, fontWeight: d.isBenchmark ? 300 : 400 }}>{d.name}</span>
                      </div>
                      <span style={{ fontSize: 12, fontFamily: MONO, fontWeight: 500, color: d.pct >= 0 ? C.green : C.red }}>
                        {d.pct >= 0 ? "+" : ""}{d.pct.toFixed(2)}%
                      </span>
                    </div>
                    <div style={{ height: 4, background: C.surfaceHigh, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${barWidth}%`, background: d.pct >= 0 ? d.color : C.red, borderRadius: 2, opacity: d.isBenchmark ? 0.5 : 0.85 }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Asset breakdown per class */}
            {Object.entries(assetClasses).map(([type, data]) => (
              <div key={type} style={{ marginBottom: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: classColors[type] || C.blue }} />
                    <span style={{ fontSize: 10, color: C.text2, fontFamily: MONO, letterSpacing: 1.5 }}>{(classLabels[type] || type).toUpperCase()}</span>
                  </div>
                  <span style={{ fontSize: 11, color: data.pnl >= 0 ? C.green : C.red, fontFamily: MONO }}>
                    {data.pnl >= 0 ? "+" : ""}{fmtUSD(data.pnl)}
                  </span>
                </div>
                {data.assets.map((a, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0 5px 12px", borderLeft: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 12, color: C.text2, fontFamily: FONT, fontWeight: 300 }}>{a.sym}</span>
                    <span style={{ fontSize: 12, color: a.pct >= 0 ? C.green : C.red, fontFamily: MONO }}>{a.pct >= 0 ? "+" : ""}{a.pct.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* vs S&P 500 */}
          {spyChange !== null && (
            <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 12 }}>VS S&P 500</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 4 }}>YOUR PORTFOLIO</div>
                  <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 22, color: totalPnlPct >= 0 ? C.green : C.red, letterSpacing: -0.5 }}>
                    {totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 4 }}>S&P 500 (24H)</div>
                  <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 22, color: spyChange >= 0 ? C.green : C.red, letterSpacing: -0.5 }}>
                    {spyChange >= 0 ? "+" : ""}{spyChange.toFixed(2)}%
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12, padding: "10px 14px", background: C.surfaceHigh, borderRadius: 8 }}>
                {(() => {
                  const diff = totalPnlPct - spyChange;
                  const beating = diff >= 0;
                  return (
                    <div style={{ fontSize: 12, color: beating ? C.green : C.red, fontFamily: FONT, fontWeight: 300 }}>
                      {beating ? "↑" : "↓"} {Math.abs(diff).toFixed(2)}% {beating ? "ahead of" : "behind"} the S&P 500
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── ANALYTICS CARD ──────────────────────────────────────────────────────────
function AnalyticsCard({ donutData, chartData, hasChart, showToggle, lineColor, isUp, total, chartData0 }) {
  const [view, setView] = useState("chart"); // "chart" | "allocation"

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 12, padding: "16px 20px", marginBottom: 14 }}>

      {/* Header with toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2 }}>
          {view === "chart" ? "PORTFOLIO VALUE" : "ALLOCATION"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {view === "chart" && hasChart && (
            <div style={{ fontSize: 12, fontFamily: FONT, fontWeight: 400, color: lineColor }}>
              {isUp ? "+" : ""}{fmtUSD(total - (chartData0?.cost || 0))}
            </div>
          )}
          {showToggle && (
            <div style={{ display: "flex", background: C.surfaceHigh, borderRadius: 6, padding: 2, border: `1px solid ${C.border}` }}>
              {[["chart","↗"], ["allocation","◑"]].map(([v, icon]) => (
                <button key={v} onClick={() => setView(v)}
                  style={{ background: view===v ? C.borderHover : "transparent", border: "none", color: view===v ? C.text1 : C.text3, borderRadius: 4, padding: "3px 8px", fontSize: 11, cursor: "pointer", transition: "all 0.15s" }}>
                  {icon}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart view */}
      {view === "chart" && hasChart && (
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={lineColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: C.text3, fontFamily: MONO }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <Area type="monotone" dataKey="cost" stroke={lineColor} strokeWidth={1.5} fill="url(#portfolioGrad)" dot={false} />
            <Tooltip
              contentStyle={{ background: C.surfaceHigh, border: `1px solid ${C.borderHover}`, borderRadius: 6, padding: "4px 8px" }}
              labelStyle={{ color: C.text3, fontSize: 9, fontFamily: MONO }}
              itemStyle={{ color: C.text1, fontSize: 11, fontFamily: MONO }}
              formatter={v => [fmtUSD(v), "Value"]}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* Allocation view */}
      {(view === "allocation" || !showToggle) && donutData && (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <PieChart width={90} height={90}>
            <Pie data={donutData} cx={41} cy={41} innerRadius={24} outerRadius={40} dataKey="value" strokeWidth={0}>
              {donutData.map((d, i) => <Cell key={i} fill={d.color} opacity={0.9} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: C.surfaceHigh, border: `1px solid ${C.borderHover}`, borderRadius: 6, padding: "4px 8px" }}
              itemStyle={{ color: C.text1, fontSize: 11, fontFamily: MONO }}
              formatter={(v, n) => [`${v}%`, n]}
            />
          </PieChart>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            {donutData.map((d, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: d.color }} />
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.text2, letterSpacing: 1 }}>{d.name}</span>
                </div>
                <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 12, color: C.text1 }}>{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── POSITION HELPERS ────────────────────────────────────────────────────────
function calcPosition(trades, currentPrice) {
  const buys = trades.filter(t => t.type === "buy");
  const sells = trades.filter(t => t.type === "sell");
  const totalBuyUnits = buys.reduce((s,t) => s+t.units, 0);
  const totalSellUnits = sells.reduce((s,t) => s+t.units, 0);
  const unitsHeld = totalBuyUnits - totalSellUnits;
  const totalCostWithFees = buys.reduce((s,t) => s+(t.price*t.units)+(t.fees||0), 0);
  const totalBuyUnitsForAvg = totalBuyUnits || 1;
  const avgBuyPrice = buys.reduce((s,t) => s+t.price*t.units, 0) / totalBuyUnitsForAvg;
  const totalFeesOnBuys = buys.reduce((s,t) => s+(t.fees||0), 0);
  const breakEven = unitsHeld > 0 ? (totalCostWithFees - sells.reduce((s,t) => s+(t.price*t.units)-(t.fees||0),0)) / unitsHeld : 0;
  const currentValue = currentPrice * unitsHeld;
  const costBasis = avgBuyPrice * unitsHeld + (unitsHeld/totalBuyUnitsForAvg)*totalFeesOnBuys;
  const unrealisedPnl = currentValue - costBasis;
  const unrealisedPct = costBasis > 0 ? (unrealisedPnl/costBasis)*100 : 0;
  // Realised P&L: for each sell, profit = (sellPrice - avgBuyPrice) * units - fees
  const realisedPnl = sells.reduce((s,t) => s + (t.price - avgBuyPrice)*t.units - (t.fees||0), 0);
  return { unitsHeld, avgBuyPrice, breakEven, currentValue, costBasis, unrealisedPnl, unrealisedPct, realisedPnl, totalBuyUnits, totalSellUnits };
}

// ─── POSITION CARD ────────────────────────────────────────────────────────────
function PositionCard({ trades, currentPrice, onDelete, onAddTrade, onEdit }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("summary"); // summary | trades
  const symbol = trades[0].symbol;
  const name = trades[0].name;
  const pos = calcPosition(trades, currentPrice);
  const isUp = pos.unrealisedPnl >= 0;
  const hasSells = trades.some(t => t.type === "sell");

  return (
    <div onClick={() => setOpen(!open)} style={{ background: open ? C.surfaceHigh : C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 12, padding: "18px 20px", marginBottom: 10, cursor: "pointer", borderLeft: open ? `3px solid ${isUp ? C.green : C.red}` : `1px solid ${C.borderHover}`, transition: "border-color 0.2s, background 0.2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <AssetLogo symbol={symbol} size={40} color={isUp ? C.green : C.red} />
          <div>
            <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 16, color: C.text1 }}>{symbol}</div>
            <div style={{ fontSize: 11, color: C.text3, fontFamily: FONT, fontWeight: 300, marginTop: 2 }}>{pos.unitsHeld.toLocaleString(undefined,{maximumFractionDigits:6})} units</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 20, color: isUp?C.green:C.red, letterSpacing: -0.5 }}>{fmtPct(pos.unrealisedPct)}</div>
          <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 12, color: isUp?"rgba(74,222,128,0.7)":"rgba(248,113,113,0.7)", marginTop: 3 }}>{pos.unrealisedPnl>=0?"+":""}{fmtUSD(pos.unrealisedPnl)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 14 }}>
        {[["Avg buy", fmtUSD(pos.avgBuyPrice)], ["Break even", fmtUSD(pos.breakEven)], ["Value", fmtUSD(pos.currentValue)]].map(([l,v]) => (
          <div key={l}>
            <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 3, textTransform: "uppercase" }}>{l}</div>
            <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 13, color: C.text2 }}>{v}</div>
          </div>
        ))}
      </div>

      {hasSells && (
        <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5 }}>REALISED</span>
          <span style={{ fontSize: 12, fontFamily: FONT, fontWeight: 300, color: pos.realisedPnl>=0?C.green:C.red }}>{pos.realisedPnl>=0?"+":""}{fmtUSD(pos.realisedPnl)}</span>
        </div>
      )}

      {/* Expanded detail */}
      {open && (
        <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 16 }} onClick={e => e.stopPropagation()}>

          {/* Full stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {[["Cost basis", fmtUSD(pos.costBasis)], ["Current price", fmtUSD(currentPrice)], ["Total bought", `${pos.totalBuyUnits.toLocaleString(undefined,{maximumFractionDigits:6})} units`], ["Total sold", `${pos.totalSellUnits.toLocaleString(undefined,{maximumFractionDigits:6})} units`]].map(([l,v]) => (
              <div key={l}>
                <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 3, textTransform: "uppercase" }}>{l}</div>
                <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 13, color: C.text2 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Trade log tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {["summary","trades"].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ background: view===v?C.surface:"transparent", border:`1px solid ${view===v?C.borderHover:C.border}`, color:view===v?C.text1:C.text3, borderRadius:4, padding:"4px 14px", fontSize:10, fontFamily:FONT, fontWeight:300, cursor:"pointer", letterSpacing:0.3 }}>
                {v.charAt(0).toUpperCase()+v.slice(1)}
              </button>
            ))}
          </div>

          {view === "trades" && (
            <div>
              {trades.sort((a,b) => new Date(b.date)-new Date(a.date)).map((t,i) => {
                // Per-trade P&L (only meaningful for buys)
                const tradeCost = t.price * t.units + (t.fees || 0);
                const tradeCurrentVal = currentPrice * t.units;
                const tradePnl = t.type === "buy" ? tradeCurrentVal - tradeCost : null;
                const tradePnlPct = tradePnl !== null && tradeCost > 0 ? (tradePnl / tradeCost) * 100 : null;
                const tradeIsUp = tradePnl >= 0;
                return (
                <div key={t.id} style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                  {/* Top row: type + date + edit/delete */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 9, fontFamily: MONO, color: t.type==="buy"?C.green:C.amber, letterSpacing: 1.5, textTransform: "uppercase" }}>{t.type}</span>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: C.text3 }}>{t.date}</span>
                    </div>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button onClick={() => onEdit(t)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.text3, borderRadius: 4, padding: "3px 7px", fontSize: 10, fontFamily: MONO, cursor: "pointer" }}>✎</button>
                      <button onClick={() => onDelete(t.id)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: "rgba(248,113,113,0.4)", borderRadius: 4, padding: "3px 7px", fontSize: 10, fontFamily: MONO, cursor: "pointer" }}>✕</button>
                    </div>
                  </div>
                  {/* Bottom row: price x units | cost | P&L */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                    <div>
                      <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 2 }}>PRICE × UNITS</div>
                      <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 12, color: C.text1 }}>{fmtUSD(t.price)}</div>
                      <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 10, color: C.text3 }}>× {t.units}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 2 }}>COST</div>
                      <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 12, color: C.text1 }}>{fmtUSD(tradeCost)}</div>
                      {t.fees > 0 && <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 10, color: C.text3 }}>+{fmtUSD(t.fees)} fee</div>}
                    </div>
                    {tradePnlPct !== null && (
                      <div>
                        <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 2 }}>P&L</div>
                        <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 13, color: tradeIsUp ? C.green : C.red }}>
                          {tradePnl >= 0 ? "+" : ""}{fmtUSD(tradePnl)}
                        </div>
                        <div style={{ fontFamily: MONO, fontSize: 10, color: tradeIsUp ? "rgba(74,222,128,0.8)" : "rgba(248,113,113,0.8)", fontWeight: 500 }}>
                          {tradePnlPct >= 0 ? "+" : ""}{tradePnlPct.toFixed(2)}%
                        </div>
                      </div>
                    )}
                  </div>
                  {t.notes && <div style={{ fontSize: 11, color: C.text3, marginTop: 6, fontFamily: FONT, fontWeight: 300, fontStyle: "italic" }}>{t.notes}</div>}
                </div>
                );
              })}
            </div>
          )}

          {view === "summary" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[["Unrealised P&L", `${pos.unrealisedPnl>=0?"+":""}${fmtUSD(pos.unrealisedPnl)} (${fmtPct(pos.unrealisedPct)})`, pos.unrealisedPnl], ...(hasSells?[["Realised P&L", `${pos.realisedPnl>=0?"+":""}${fmtUSD(pos.realisedPnl)}`, pos.realisedPnl]]:[]), ["Total P&L", `${(pos.unrealisedPnl+pos.realisedPnl)>=0?"+":""}${fmtUSD(pos.unrealisedPnl+pos.realisedPnl)}`, pos.unrealisedPnl+pos.realisedPnl]].map(([l,v,n]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: C.text3, fontFamily: MONO, letterSpacing: 1.5, textTransform: "uppercase" }}>{l}</span>
                  <span style={{ fontFamily: FONT, fontWeight: 300, fontSize: 14, color: n>=0?C.green:C.red }}>{v}</span>
                </div>
              ))}
            </div>
          )}


        </div>
      )}
    </div>
  );
}

// ─── SIGNAL LEGEND ────────────────────────────────────────────────────────────
function SignalLegend() {
  const rules = [
    { sig: { label: "STRONG BUY", color: "#00ff9d", bg: "rgba(0,255,157,0.12)" }, rule: "RSI < 30 + 20%+ below 52W high" },
    { sig: { label: "BUY DIP",    color: "#7dffb3", bg: "rgba(125,255,179,0.1)" }, rule: "RSI < 40 + 10–20% below 52W high" },
    { sig: { label: "WATCHING",   color: "#7eb8ff", bg: "rgba(126,184,255,0.1)" }, rule: "Some weakness — monitor entry" },
    { sig: { label: "WAIT",       color: "#f5a623", bg: "rgba(245,166,35,0.1)"  }, rule: "Near highs, no dip yet" },
    { sig: { label: "AVOID",      color: "#ff6b6b", bg: "rgba(255,107,107,0.1)" }, rule: "Overbought / greed territory" },
  ];
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
      <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 14, textTransform: "uppercase" }}>Signal logic</div>
      {rules.map(({ sig, rule }) => (
        <div key={sig.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <SignalBadge sig={sig} size="sm" />
          <span style={{ fontSize: 11, color: C.text3, fontFamily: FONT, fontWeight: 300 }}>{rule}</span>
        </div>
      ))}
      <div style={{ marginTop: 12, fontSize: 10, color: C.text3, borderTop: `1px solid ${C.border}`, paddingTop: 10, fontFamily: MONO, letterSpacing: 1, opacity: 0.6 }}>
        Inputs: RSI · 52W High · 200-Day MA · Fear & Greed (crypto)
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("watchlist");
  const [watchlist, setWatchlist] = useState(DEFAULT_WATCHLIST);
  const [portfolio, setPortfolio] = useState(DEFAULT_PORTFOLIO);
  const [loaded, setLoaded] = useState(false);
  const [watchModal, setWatchModal] = useState(null);
  const [tradeModal, setTradeModal] = useState(null); // null | { defaultType, symbol? }
  const [searchModal, setSearchModal] = useState(false);
  const [editTradeModal, setEditTradeModal] = useState(null); // null | trade object
  const [filterSig, setFilterSig] = useState("all");
  const [showLegend, setShowLegend] = useState(false);
  const [liveStatus, setLiveStatus] = useState("idle"); // idle | fetching | ok | error
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fearGreedData, setFearGreedData] = useState(null); // { value, label }
  const [insightsPeriod, setInsightsPeriod] = useState("weekly"); // daily | weekly | monthly
  const [spyData, setSpyData] = useState(null);
  const [btcPeriodData, setBtcPeriodData] = useState(null);

  // ── Live price refresh
  const refreshPrices = async (wl) => {
    const list = wl || watchlist;
    if (!list.length) return;
    setLiveStatus("fetching");
    const symbols = [...new Set(list.map(a => a.symbol))];

    // Fetch prices + Fear & Greed in parallel
    const [prices, fgRes] = await Promise.all([
      fetchLivePrices(symbols),
      fetch("https://api.alternative.me/fng/?limit=1").then(r => r.json()).catch(() => null)
    ]);

    if (Object.keys(prices).length > 0) {
      // Apply live prices
      setWatchlist(prev => prev.map(a => {
        const p = prices[a.symbol];
        if (!p) return a;
        // Auto-apply Fear & Greed to crypto assets
        const fg = fgRes?.data?.[0]?.value ? parseInt(fgRes.data[0].value) : a.fearGreed;
        return { ...a, currentPrice: p.price, change24h: p.change24h, ...(a.type === "crypto" ? { fearGreed: fg } : {}) };
      }));
      setLastUpdated(new Date());
      setLiveStatus("ok");
    } else {
      setLiveStatus("error");
    }

    // Store Fear & Greed for display
    if (fgRes?.data?.[0]) {
      const val = parseInt(fgRes.data[0].value);
      const label = fgRes.data[0].value_classification;
      setFearGreedData({ value: val, label });
    }
  };

  useEffect(() => {
    if (!loaded) return;
    refreshPrices(watchlist);
    const interval = setInterval(() => refreshPrices(), 60000);
    return () => clearInterval(interval);
  }, [loaded]);

  useEffect(() => {
    (async () => {
      const w = await load("pf_watchlist_v3", DEFAULT_WATCHLIST);
      const p = await load("pf_portfolio_v4", DEFAULT_PORTFOLIO);
      setWatchlist(w); setPortfolio(p); setLoaded(true);
    })();
  }, []);
  useEffect(() => { if (loaded) save("pf_watchlist_v3", watchlist); }, [watchlist, loaded]);

  // Fetch SPY and BTC benchmark data for insights
  useEffect(() => {
    if (tab !== "insights") return;
    const fetchBenchmarks = async () => {
      try {
        const [spyRes, btcRes] = await Promise.all([
          fetch("/api/prices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbols: ["SPY", "BTC"] }) }),
        ]);
        const spyData = await spyRes.json();
        if (spyData.prices) {
          setSpyData(spyData.prices["SPY"] || null);
          setBtcPeriodData(spyData.prices["BTC"] || null);
        }
      } catch {}
    };
    fetchBenchmarks();
  }, [tab]);
  useEffect(() => { if (loaded) save("pf_portfolio_v4", portfolio); }, [portfolio, loaded]);

  const saveWatch = (form) => {
    if (watchModal?.asset) setWatchlist(w => w.map(x => x.id === watchModal.asset.id ? { ...form, id: x.id } : x));
    else setWatchlist(w => [...w, { ...form, id: Date.now() }]);
    setWatchModal(null);
  };

  // Group trades by symbol
  // Normalise symbols to uppercase to prevent duplicate positions
  const positions = portfolio.reduce((acc, t) => { const sym = (t.symbol||"").toUpperCase().trim(); if (!acc[sym]) acc[sym]=[]; acc[sym].push({...t, symbol: sym}); return acc; }, {});

  // Portfolio summary using live prices from watchlist
  const getLivePrice = (sym) => { const a = watchlist.find(x => x.symbol===sym); return a?.currentPrice || 0; };
  const positionSummaries = Object.entries(positions).map(([sym, trades]) => ({ sym, trades, pos: calcPosition(trades, getLivePrice(sym)) }));
  const totalCostBasis = positionSummaries.reduce((s,{pos}) => s+pos.costBasis, 0);
  const totalCurrentValue = positionSummaries.reduce((s,{pos}) => s+pos.currentValue, 0);
  const totalUnrealisedPnl = positionSummaries.reduce((s,{pos}) => s+pos.unrealisedPnl, 0);
  const totalRealisedPnl = positionSummaries.reduce((s,{pos}) => s+pos.realisedPnl, 0);
  const totalPnl = totalUnrealisedPnl + totalRealisedPnl;
  const totalPnlPct = totalCostBasis > 0 ? (totalUnrealisedPnl/totalCostBasis)*100 : 0;

  const filterMap = {
    all: watchlist,
    "strong-buy": watchlist.filter(a => calcSignal(a).signal === "strong-buy"),
    dip: watchlist.filter(a => calcSignal(a).signal === "dip"),
    watch: watchlist.filter(a => calcSignal(a).signal === "watch"),
    "near-high": watchlist.filter(a => calcSignal(a).signal === "near-high"),
    crypto: watchlist.filter(a => a.type === "crypto"),
    stock: watchlist.filter(a => a.type === "stock"),
  };
  const filteredWatch = filterMap[filterSig] || watchlist;
  const buyableCount = watchlist.filter(a => ["strong-buy","dip"].includes(calcSignal(a).signal)).length;

  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: FONT, fontWeight: 100, color: C.text3, fontSize: 18, letterSpacing: 8 }}>accrue</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #090b0e 0%, #08090a 100%)", color: C.text1, fontFamily: FONT, fontWeight: 300, padding: "28px 20px 80px" }}>
      {/* ── ACCRUE HEADER ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            {/* ACCRUE wordmark — letter fade */}
            <div style={{ display: "flex", alignItems: "center", gap: 0, lineHeight: 1 }}>
              {[
                ["A", 1.0],
                ["C", 0.92],
                ["C", 0.84],
                ["R", 0.76],
                ["U", 0.68],
                ["E", 0.60],
              ].map(([letter, opacity], i) => (
                <span key={i} style={{
                  fontSize: 30,
                  fontWeight: 200,
                  letterSpacing: 7,
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                  color: `rgba(240,245,242,${opacity})`,
                  display: "inline-block",
                }}>{letter}</span>
              ))}
            </div>
          </div>

          {/* Refresh + live status */}
          <button onClick={() => refreshPrices()} disabled={liveStatus==="fetching"}
            style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.text3, borderRadius: 6, padding: "7px 10px", fontSize: 13, fontFamily: FONT, cursor: liveStatus==="fetching"?"default":"pointer", display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
            <span style={{ display: "inline-block", animation: liveStatus==="fetching"?"spin 1s linear infinite":"none" }}>↻</span>
            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
          </button>
        </div>

        {/* Divider with live status */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
          <div style={{ flex: 1, height: 1, background: C.borderHover }} />
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: liveStatus==="ok"?C.green:liveStatus==="error"?C.red:C.text3, opacity: 0.7 }} />
            <span style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, opacity: 0.6 }}>
              {liveStatus==="ok" ? "live" : liveStatus==="fetching" ? "updating" : liveStatus==="error" ? "offline" : "loading"}
            </span>
          </div>
          <div style={{ flex: 1, height: 1, background: C.borderHover }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 28, background: C.surface, borderRadius: 8, padding: 3, border: `1px solid ${C.borderHover}` }}>
        {[["watchlist","Watchlist"],["portfolio","Portfolio"],["insights","Insights"]].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, background: tab===t?C.surfaceHigh:"transparent", border: `1px solid ${tab===t?C.border:"transparent"}`, color: tab===t?C.text1:C.text3, borderRadius: 6, padding: "9px 0", fontSize: 11, fontFamily: FONT, fontWeight: tab===t?500:300, cursor: "pointer", letterSpacing: 0.3, transition: "all 0.15s" }}>{l}</button>
        ))}
      </div>

      {tab === "watchlist" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 24 }}>
            {[{l:"Assets",v:watchlist.length},{l:"Buy now",v:buyableCount},{l:"Watching",v:watchlist.filter(a=>calcSignal(a).signal==="watch").length}].map(s => (
              <div key={s.l} style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 8, padding: "12px 0", textAlign: "center" }}>
                <div style={{ fontSize: 26, fontWeight: 400, fontFamily: FONT, color: C.text1 }}>{s.v}</div>
                <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginTop: 4 }}>{s.l.toUpperCase()}</div>
              </div>
            ))}
          </div>

          <button onClick={() => setShowLegend(!showLegend)} style={{ width:"100%", background:"transparent", border:`1px solid ${C.border}`, color:C.text3, borderRadius:6, padding:"8px 0", fontSize:10, fontFamily:MONO, cursor:"pointer", letterSpacing:2, marginBottom:14, textTransform:"uppercase" }}>
            {showLegend ? "↑ hide" : "↓ show"} signal logic
          </button>
          {showLegend && <SignalLegend />}

          <div style={{ display:"flex", gap:6, marginBottom:18, overflowX:"auto", paddingBottom:2 }}>
            {[["all","All"],["strong-buy","Strong buy"],["dip","Buy dip"],["watch","Watching"],["near-high","Wait"],["crypto","Crypto"],["stock","Stock"]].map(([f,l]) => (
              <button key={f} onClick={() => setFilterSig(f)} style={{ background: filterSig===f?C.surface:"transparent", border:`1px solid ${filterSig===f?C.borderHover:C.border}`, color:filterSig===f?C.text1:C.text3, borderRadius:4, padding:"4px 12px", fontSize:10, fontFamily:FONT, fontWeight:300, cursor:"pointer", whiteSpace:"nowrap", letterSpacing:0.3 }}>{l}</button>
            ))}
          </div>

          {/* Fear & Greed pill */}
          {fearGreedData && (() => {
            const v = fearGreedData.value;
            const color = v <= 25 ? C.green : v <= 45 ? "rgba(74,222,128,0.6)" : v <= 55 ? C.text3 : v <= 75 ? C.amber : C.red;
            const emoji = v <= 25 ? "😨" : v <= 45 ? "😟" : v <= 55 ? "😐" : v <= 75 ? "😏" : "🤑";
            return (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{emoji}</span>
                  <div>
                    <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 2 }}>FEAR & GREED INDEX</div>
                    <div style={{ fontSize: 11, color: C.text2, fontFamily: FONT, fontWeight: 300 }}>{fearGreedData.label}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 28, fontWeight: 500, fontFamily: FONT, color, letterSpacing: -1 }}>{v}</div>
                  <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1 }}>/100</div>
                </div>
              </div>
            );
          })()}

          {filteredWatch.length === 0
            ? <div style={{ textAlign:"center", color:C.text3, fontFamily:FONT, fontWeight:300, fontSize:13, padding:"40px 0" }}>No assets match filter</div>
            : filteredWatch.map(a => <WatchCard key={a.id} asset={a} onEdit={a => setWatchModal({asset:a})} onDelete={id => setWatchlist(w => w.filter(x => x.id !== id))} onNotesUpdate={(id, note) => setWatchlist(w => w.map(x => x.id === id ? {...x, notes: note} : x))} onThesisUpdate={(id, thesis) => setWatchlist(w => w.map(x => x.id === id ? {...x, thesis} : x))} />)
          }
          <button onClick={() => setSearchModal(true)} style={{ width:"100%", marginTop:10, background:"transparent", border:`1px dashed ${C.border}`, color:C.text3, borderRadius:8, padding:"16px 0", fontSize:11, fontFamily:FONT, fontWeight:300, cursor:"pointer", letterSpacing:1 }}>+ Add asset</button>
        </>
      )}

      {tab === "portfolio" && (
        <>
          {portfolio.length > 0 && (
            <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 12, padding: "20px 20px", marginBottom: 20 }}>
              <div style={{ fontSize: 9, color: C.text2, fontFamily: MONO, letterSpacing: 3, marginBottom: 16, textTransform: "uppercase" }}>Portfolio Summary</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                {[["Cost basis", fmtUSD(totalCostBasis)], ["Current value", fmtUSD(totalCurrentValue)]].map(([l,v]) => (
                  <div key={l}>
                    <div style={{ fontSize: 9, color: C.text2, fontFamily: MONO, letterSpacing: 2, marginBottom: 5, textTransform: "uppercase" }}>{l}</div>
                    <div style={{ fontFamily: FONT, fontWeight: 400, fontSize: 22, color: C.text1, letterSpacing: -0.5 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[["Unrealised", `${totalUnrealisedPnl>=0?"+":""}${fmtUSD(totalUnrealisedPnl)}`, totalUnrealisedPnl], ["Realised", `${totalRealisedPnl>=0?"+":""}${fmtUSD(totalRealisedPnl)}`, totalRealisedPnl], ["Total P&L", `${totalPnl>=0?"+":""}${fmtUSD(totalPnl)}`, totalPnl]].map(([l,v,n]) => (
                  <div key={l}>
                    <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 3, textTransform: "uppercase" }}>{l}</div>
                    <div style={{ fontFamily: FONT, fontWeight: n===totalPnl?600:400, fontSize: n===totalPnl?18:14, color: n>=0?C.green:C.red, letterSpacing: n===totalPnl?-0.5:0 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {positionSummaries.length === 0
            ? <div style={{ textAlign:"center", color:C.text3, fontFamily:FONT, fontWeight:300, fontSize:13, padding:"40px 0", lineHeight:2 }}>No positions yet<br/><span style={{fontSize:11, opacity:0.6}}>Log your first trade below</span></div>
            : (
              <>
                {/* Combined analytics card with toggle */}
                {(() => {
                  if (portfolio.length === 0) return null;

                  const COLORS = [C.green, C.blue, C.amber, "#c77dff", "#f87171", "#67e8f9"];
                  const total = positionSummaries.reduce((s,{pos}) => s + pos.currentValue, 0);
                  const donutData = positionSummaries.length > 1
                    ? positionSummaries.map(({sym, pos}, i) => ({
                        name: sym,
                        value: parseFloat(((pos.currentValue / total) * 100).toFixed(1)),
                        color: COLORS[i % COLORS.length],
                      }))
                    : null;

                  const allDates = [...new Set(portfolio.map(t => t.date))].sort();
                  const hasChart = allDates.length >= 2;
                  const chartData = hasChart ? allDates.map(date => {
                    const tradesUpTo = portfolio.filter(t => t.date <= date);
                    const cost = tradesUpTo.filter(t => t.type === "buy").reduce((s,t) => s + t.price * t.units + (t.fees||0), 0)
                               - tradesUpTo.filter(t => t.type === "sell").reduce((s,t) => s + t.price * t.units - (t.fees||0), 0);
                    return { date: date.slice(5), cost: parseFloat(cost.toFixed(2)) };
                  }) : [];
                  if (hasChart) chartData.push({ date: "Now", cost: parseFloat(total.toFixed(2)) });

                  const isUp = !hasChart || total >= (chartData[0]?.cost || 0);
                  const lineColor = isUp ? C.green : C.red;

                  // Only show toggle if both views are available
                  const showToggle = donutData && hasChart;

                  return (
                    <AnalyticsCard
                      donutData={donutData}
                      chartData={chartData}
                      hasChart={hasChart}
                      showToggle={showToggle}
                      lineColor={lineColor}
                      isUp={isUp}
                      total={total}
                      chartData0={chartData[0]}
                    />
                  );
                })()}

                {positionSummaries.map(({sym, trades}) => (
                  <PositionCard key={sym} trades={trades} currentPrice={getLivePrice(sym)}
                    onDelete={id => setPortfolio(p => p.filter(x => x.id !== id))}
                    onAddTrade={(sym) => setTradeModal({ defaultType:"buy", symbol:sym })}
                    onEdit={(trade) => setEditTradeModal(trade)} />
                ))}
              </>
            )
          }
          <button onClick={() => setTradeModal({defaultType:"buy"})} style={{ width:"100%", marginTop:10, background:"transparent", border:`1px dashed ${C.border}`, color:C.text3, borderRadius:8, padding:"14px 0", fontSize:11, fontFamily:FONT, fontWeight:300, cursor:"pointer", letterSpacing:1 }}>+ Log trade</button>
        </>
      )}

      {tab === "insights" && (
        <InsightsTab
          portfolio={portfolio}
          watchlist={watchlist}
          positionSummaries={positionSummaries}
          period={insightsPeriod}
          setPeriod={setInsightsPeriod}
          spyData={spyData}
          btcPeriodData={btcPeriodData}
          getLivePrice={getLivePrice}
        />
      )}

      <div style={{ textAlign:"center", marginTop:32, fontSize:9, color:C.text3, fontFamily:MONO, letterSpacing:2, opacity:0.4 }}>
        {lastUpdated ? `Last sync ${lastUpdated.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}` : "Accrue"}
      </div>

      {watchModal !== null && <WatchModal asset={watchModal.asset} onSave={saveWatch} onClose={() => setWatchModal(null)} />}
      {searchModal && <AssetSearchModal onAdd={asset => { setWatchlist(w => [...w, asset]); }} onClose={() => setSearchModal(false)} />}
      {editTradeModal && <EditTradeModal trade={editTradeModal} onSave={(updated) => { setPortfolio(p => p.map(t => t.id === updated.id ? updated : t)); setEditTradeModal(null); }} onClose={() => setEditTradeModal(null)} />}
      {tradeModal !== null && <TradeModal watchlist={watchlist} defaultType={tradeModal.defaultType} onSave={trade=>{setPortfolio(p=>[...p,trade]);setTradeModal(null);}} onClose={() => setTradeModal(null)} />}
    </div>
  );
}
