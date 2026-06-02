import { useState, useEffect } from "react";

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
const INP = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,255,157,0.15)", borderRadius: 8, padding: "10px 12px", color: "#e8f5ec", fontSize: 13, fontFamily: "monospace", outline: "none", width: "100%", boxSizing: "border-box" };
const LBL = { fontSize: 10, color: "#4a6655", fontFamily: "monospace", letterSpacing: 2, marginBottom: 4 };

// ─── SIGNAL BADGE ─────────────────────────────────────────────────────────────
function SignalBadge({ sig, size = "md" }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: sig.bg, border: `1px solid ${sig.color}44`, borderRadius: 20, padding: size === "sm" ? "3px 10px" : "4px 12px", fontSize: size === "sm" ? 10 : 11, fontWeight: 700, color: sig.color, fontFamily: "monospace", letterSpacing: 1.5 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: sig.color, boxShadow: `0 0 6px ${sig.color}`, display: "inline-block", flexShrink: 0 }} />
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
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 10, color: "#4a6655", fontFamily: "monospace", letterSpacing: 2, marginBottom: 8 }}>SIGNAL BREAKDOWN · SCORE {sig.score}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {indicators.map(ind => (
          <div key={ind.label} style={{ background: ind.good ? "rgba(0,255,157,0.05)" : "rgba(255,107,107,0.05)", border: `1px solid ${ind.good ? "rgba(0,255,157,0.15)" : "rgba(255,107,107,0.12)"}`, borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 9, color: "#4a6655", fontFamily: "monospace", letterSpacing: 1.5 }}>{ind.label}</div>
            <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 800, color: ind.good ? "#00ff9d" : "#ff6b6b", margin: "3px 0" }}>{ind.value}</div>
            <div style={{ fontSize: 10, color: ind.good ? "#4a8a6a" : "#8a4a4a" }}>{ind.note}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: "#6a9a7a", fontStyle: "italic" }}>{sig.description}</div>
    </div>
  );
}

// ─── PRICE BAR ────────────────────────────────────────────────────────────────
function PriceBar({ low52w, high52w, current, ma200 }) {
  const pct = Math.min(100, Math.max(0, ((current - low52w) / (high52w - low52w)) * 100));
  const maPct = ma200 > 0 ? Math.min(100, Math.max(0, ((ma200 - low52w) / (high52w - low52w)) * 100)) : null;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#445544", marginBottom: 4, fontFamily: "monospace" }}>
        <span>{fmtUSD(low52w, 0)}</span><span>52W RANGE</span><span>{fmtUSD(high52w, 0)}</span>
      </div>
      <div style={{ position: "relative", height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 3 }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#1a3a2a,#00ff9d)", borderRadius: 3 }} />
        {maPct !== null && <div style={{ position: "absolute", top: -4, left: `${maPct}%`, transform: "translateX(-50%)", width: 2, height: 14, background: "#f5a623", borderRadius: 1, opacity: 0.8 }} />}
        <div style={{ position: "absolute", top: -3, left: `${pct}%`, transform: "translateX(-50%)", width: 12, height: 12, borderRadius: "50%", background: "#00ff9d", border: "2px solid #0a0f0d", boxShadow: "0 0 8px #00ff9d" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        <div style={{ fontSize: 10, color: "#00ff9d", fontFamily: "monospace" }}>{pct.toFixed(0)}% OF RANGE</div>
        {maPct !== null && <div style={{ fontSize: 10, color: "#f5a623", fontFamily: "monospace" }}>▲ 200MA</div>}
      </div>
    </div>
  );
}

// ─── WATCH CARD ───────────────────────────────────────────────────────────────
function WatchCard({ asset, onEdit, onDelete, onNotesUpdate }) {
  const [open, setOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const sig = calcSignal(asset);

  const handleAiUpdate = async (e) => {
    e.stopPropagation();
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/update-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          thesis: asset.thesis,
        }),
      });
      const data = await res.json();
      if (data.note) {
        onNotesUpdate(asset.id, data.note);
      } else {
        setAiError("Could not fetch update");
      }
    } catch {
      setAiError("Network error");
    }
    setAiLoading(false);
  };

  return (
    <div onClick={() => setOpen(!open)} style={{ background: "linear-gradient(145deg,#0d1510,#111a14)", border: "1px solid rgba(0,255,157,0.1)", borderRadius: 16, padding: "20px 22px", marginBottom: 14, cursor: "pointer", boxShadow: open ? "0 0 24px rgba(0,255,157,0.06)" : "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${sig.color}18`, border: `1px solid ${sig.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: sig.color, fontFamily: "monospace" }}>
            {asset.symbol.slice(0, 2)}
          </div>
          <div>
            <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 17, color: "#e8f5ec", letterSpacing: 1 }}>{asset.symbol}</div>
            <div style={{ fontSize: 12, color: "#4a6655" }}>{asset.name}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "monospace", fontSize: 19, fontWeight: 800, color: "#e8f5ec" }}>{fmtUSD(asset.currentPrice)}</div>
          <div style={{ fontSize: 12, color: asset.change24h < 0 ? "#ff6b6b" : "#00ff9d", fontFamily: "monospace", marginTop: 2 }}>
            {asset.change24h > 0 ? "+" : ""}{asset.change24h}% 24H
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <SignalBadge sig={sig} />
        <span style={{ fontSize: 11, color: "#3d5449" }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ marginTop: 16, borderTop: "1px solid rgba(0,255,157,0.07)", paddingTop: 16 }} onClick={e => e.stopPropagation()}>
          <PriceBar low52w={asset.low52w} high52w={asset.high52w} current={asset.currentPrice} ma200={asset.ma200} />
          <SignalBreakdown asset={asset} />
          {asset.thesis && <div style={{ marginTop: 14 }}><div style={LBL}>THESIS</div><div style={{ fontSize: 13, color: "#8aab96", lineHeight: 1.6 }}>{asset.thesis}</div></div>}

          {/* AI-powered notes section */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={LBL}>DAILY INTEL</div>
              <button onClick={handleAiUpdate} disabled={aiLoading}
                style={{ display: "flex", alignItems: "center", gap: 5, background: aiLoading ? "rgba(126,184,255,0.05)" : "rgba(126,184,255,0.1)", border: "1px solid rgba(126,184,255,0.25)", color: aiLoading ? "#3d6080" : "#7eb8ff", borderRadius: 20, padding: "3px 10px", fontSize: 10, fontFamily: "monospace", cursor: aiLoading ? "default" : "pointer", letterSpacing: 1 }}>
                <span style={{ display: "inline-block", animation: aiLoading ? "spin 1s linear infinite" : "none" }}>✦</span>
                {aiLoading ? "ANALYSING..." : "AI UPDATE"}
                <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
              </button>
            </div>
            {aiLoading && (
              <div style={{ background: "rgba(126,184,255,0.05)", border: "1px solid rgba(126,184,255,0.15)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7eb8ff", animation: "pulse 1s infinite" }} />
                  <span style={{ fontSize: 12, color: "#4a7a9a", fontFamily: "monospace" }}>Searching latest news for {asset.symbol}...</span>
                </div>
                <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }`}</style>
              </div>
            )}
            {!aiLoading && asset.notes && (
              <div style={{ background: "rgba(126,184,255,0.04)", border: "1px solid rgba(126,184,255,0.1)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 13, color: "#8aab96", lineHeight: 1.7 }}>{asset.notes}</div>
              </div>
            )}
            {!aiLoading && !asset.notes && (
              <div style={{ fontSize: 12, color: "#2d4a3a", fontStyle: "italic", fontFamily: "monospace" }}>Tap AI UPDATE for today's market briefing →</div>
            )}
            {aiError && <div style={{ fontSize: 11, color: "#ff6b6b", marginTop: 6, fontFamily: "monospace" }}>{aiError}</div>}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={() => onEdit(asset)} style={{ flex: 1, background: "rgba(0,255,157,0.07)", border: "1px solid rgba(0,255,157,0.2)", color: "#00ff9d", borderRadius: 8, padding: "8px 0", fontSize: 12, fontFamily: "monospace", cursor: "pointer", letterSpacing: 1 }}>EDIT</button>
            <button onClick={() => onDelete(asset.id)} style={{ flex: 1, background: "rgba(255,107,107,0.07)", border: "1px solid rgba(255,107,107,0.2)", color: "#ff6b6b", borderRadius: 8, padding: "8px 0", fontSize: 12, fontFamily: "monospace", cursor: "pointer", letterSpacing: 1 }}>REMOVE</button>
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
      <div style={{ background: "#0d1510", border: "1px solid rgba(0,255,157,0.2)", borderRadius: 18, padding: 28, width: "100%", maxWidth: 500, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ fontFamily: "monospace", fontSize: 13, color: "#00ff9d", letterSpacing: 2, marginBottom: 20 }}>{asset ? "EDIT ASSET" : "ADD ASSET"}</div>
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
          <button onClick={() => onSave({ ...f, ...parsed })} style={{ flex: 2, background: "rgba(0,255,157,0.1)", border: "1px solid rgba(0,255,157,0.3)", color: "#00ff9d", borderRadius: 10, padding: "12px 0", fontSize: 13, fontFamily: "monospace", cursor: "pointer", letterSpacing: 1 }}>SAVE</button>
          <button onClick={onClose} style={{ flex: 1, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#556", borderRadius: 10, padding: "12px 0", fontSize: 13, fontFamily: "monospace", cursor: "pointer" }}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}

// ─── BUY MODAL ────────────────────────────────────────────────────────────────
function BuyModal({ watchlist, onSave, onClose }) {
  const [f, setF] = useState({ symbol: "", name: "", buyPrice: "", units: "", date: new Date().toISOString().slice(0,10), currentPrice: "", notes: "" });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const pick = (sym) => { const a = watchlist.find(x => x.symbol === sym); if (a) setF(p => ({ ...p, symbol: a.symbol, name: a.name, currentPrice: a.currentPrice })); else setF(p => ({ ...p, symbol: sym })); };
  const cost = parseFloat(f.buyPrice) * parseFloat(f.units) || 0;
  const SML = { ...INP, padding: "7px 10px", fontSize: 12 };
  const LBL2 = { ...LBL, marginBottom: 3 };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#0d1510", border: "1px solid rgba(0,255,157,0.2)", borderRadius: "18px 18px 0 0", padding: "20px 18px 32px", width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto" }}>

        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: "monospace", fontSize: 13, color: "#00ff9d", letterSpacing: 2 }}>LOG A BUY</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#4a6655", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        {/* Symbol pills */}
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>
          {watchlist.map(a => { const s = calcSignal(a); return (
            <button key={a.symbol} onClick={() => pick(a.symbol)}
              style={{ background: f.symbol===a.symbol?`${s.color}22`:"rgba(255,255,255,0.05)", border: `1px solid ${f.symbol===a.symbol?s.color+"66":"rgba(255,255,255,0.1)"}`, color: f.symbol===a.symbol?s.color:"#6a8a7a", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontFamily: "monospace", cursor: "pointer" }}>
              {a.symbol}
            </button>
          );})}
          <input value={f.symbol.length && !watchlist.find(x=>x.symbol===f.symbol) ? f.symbol : ""} onChange={e => pick(e.target.value.toUpperCase())} placeholder="OTHER" style={{ ...SML, width: 80, borderRadius: 20, padding: "5px 12px", textAlign: "center" }} />
        </div>

        {/* Price + Units row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div>
            <div style={LBL2}>BUY PRICE</div>
            <input value={f.buyPrice} onChange={e => set("buyPrice", e.target.value)} type="number" placeholder="0.00" style={SML} />
          </div>
          <div>
            <div style={LBL2}>UNITS</div>
            <input value={f.units} onChange={e => set("units", e.target.value)} type="number" placeholder="0" style={SML} />
          </div>
          <div>
            <div style={LBL2}>DATE</div>
            <input value={f.date} onChange={e => set("date", e.target.value)} type="date" style={{ ...SML, colorScheme: "dark" }} />
          </div>
        </div>

        {/* Total cost pill */}
        {cost > 0 && (
          <div style={{ background: "rgba(0,255,157,0.06)", border: "1px solid rgba(0,255,157,0.15)", borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontFamily: "monospace", fontSize: 12, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#4a6655" }}>TOTAL COST</span>
            <span style={{ color: "#00ff9d", fontWeight: 800 }}>{fmtUSD(cost)}</span>
          </div>
        )}

        {/* Notes */}
        <div style={{ marginBottom: 14 }}>
          <div style={LBL2}>NOTES <span style={{ color: "#2d4a3a", fontWeight: 400 }}>(optional)</span></div>
          <textarea value={f.notes} onChange={e => set("notes", e.target.value)} rows={2} placeholder="Why I bought this dip..." style={{ ...SML, resize: "none", width: "100%" }} />
        </div>

        {/* Action buttons */}
        <button onClick={() => onSave({ ...f, id: Date.now(), buyPrice: parseFloat(f.buyPrice), units: parseFloat(f.units), currentPrice: parseFloat(f.currentPrice)||parseFloat(f.buyPrice) })}
          style={{ width: "100%", background: "linear-gradient(135deg, rgba(0,255,157,0.15), rgba(0,255,157,0.08))", border: "1px solid rgba(0,255,157,0.35)", color: "#00ff9d", borderRadius: 12, padding: "13px 0", fontSize: 13, fontFamily: "monospace", cursor: "pointer", letterSpacing: 2, fontWeight: 700 }}>
          LOG BUY
        </button>
      </div>
    </div>
  );
}

// ─── POSITION CARD ────────────────────────────────────────────────────────────
function PositionCard({ buys, onDelete, onUpdatePrice }) {
  const [open, setOpen] = useState(false);
  const [editPrice, setEditPrice] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const symbol = buys[0].symbol;
  const totalUnits = buys.reduce((s,b) => s+b.units, 0);
  const totalCost = buys.reduce((s,b) => s+b.buyPrice*b.units, 0);
  const avgBuy = totalCost / totalUnits;
  const currentPrice = buys[buys.length-1].currentPrice;
  const currentValue = currentPrice * totalUnits;
  const pnl = currentValue - totalCost;
  const pnlPct = (pnl / totalCost) * 100;
  const isUp = pnl >= 0;
  return (
    <div onClick={() => setOpen(!open)} style={{ background: "linear-gradient(145deg,#0d1510,#111a14)", border: `1px solid ${isUp?"rgba(0,255,157,0.15)":"rgba(255,107,107,0.15)"}`, borderRadius: 16, padding: "20px 22px", marginBottom: 14, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: isUp?"rgba(0,255,157,0.1)":"rgba(255,107,107,0.1)", border: `1px solid ${isUp?"rgba(0,255,157,0.25)":"rgba(255,107,107,0.25)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: isUp?"#00ff9d":"#ff6b6b", fontFamily: "monospace" }}>
            {symbol.slice(0,2)}
          </div>
          <div>
            <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 17, color: "#e8f5ec", letterSpacing: 1 }}>{symbol}</div>
            <div style={{ fontSize: 12, color: "#4a6655" }}>{totalUnits.toLocaleString(undefined,{maximumFractionDigits:6})} units · {buys.length} buy{buys.length>1?"s":""}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 800, color: isUp?"#00ff9d":"#ff6b6b" }}>{fmtPct(pnlPct)}</div>
          <div style={{ fontFamily: "monospace", fontSize: 13, color: isUp?"#00cc7a":"#cc4444", marginTop: 2 }}>{isUp?"+":""}{fmtUSD(pnl)}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
        {[["INVESTED",fmtUSD(totalCost)],["CURRENT VAL",fmtUSD(currentValue)],["AVG BUY",fmtUSD(avgBuy)]].map(([l,v]) => (
          <div key={l} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 9, color: "#3d5449", fontFamily: "monospace", letterSpacing: 1.5 }}>{l}</div>
            <div style={{ fontFamily: "monospace", fontSize: 12, color: "#c8dfd1", fontWeight: 700, marginTop: 3 }}>{v}</div>
          </div>
        ))}
      </div>
      {open && (
        <div style={{ marginTop: 16, borderTop: "1px solid rgba(0,255,157,0.08)", paddingTop: 16 }} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 10, color: "#4a6655", fontFamily: "monospace", letterSpacing: 2, marginBottom: 10 }}>BUY HISTORY</div>
          {buys.map((b,i) => (
            <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div>
                <div style={{ fontFamily: "monospace", fontSize: 12, color: "#8aab96" }}>#{i+1} · {b.date}</div>
                {b.notes && <div style={{ fontSize: 11, color: "#3d5449", marginTop: 2 }}>{b.notes}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "monospace", fontSize: 12, color: "#e8f5ec" }}>{fmtUSD(b.buyPrice)} × {b.units}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "#4a6655" }}>{fmtUSD(b.buyPrice*b.units)}</div>
                </div>
                <button onClick={() => onDelete(b.id)} style={{ background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", color: "#ff6b6b", borderRadius: 6, padding: "4px 8px", fontSize: 10, fontFamily: "monospace", cursor: "pointer" }}>✕</button>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 14 }}>
            <div style={LBL}>UPDATE CURRENT PRICE</div>
            {editPrice ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input value={newPrice} onChange={e => setNewPrice(e.target.value)} type="number" placeholder={String(currentPrice)} style={{ flex: 1, ...INP }} />
                <button onClick={() => { onUpdatePrice(symbol, parseFloat(newPrice)); setEditPrice(false); setNewPrice(""); }} style={{ background: "rgba(0,255,157,0.1)", border: "1px solid rgba(0,255,157,0.3)", color: "#00ff9d", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontFamily: "monospace", cursor: "pointer" }}>SET</button>
                <button onClick={() => setEditPrice(false)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#556", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontFamily: "monospace", cursor: "pointer" }}>✕</button>
              </div>
            ) : (
              <button onClick={() => setEditPrice(true)} style={{ background: "rgba(126,184,255,0.07)", border: "1px solid rgba(126,184,255,0.2)", color: "#7eb8ff", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontFamily: "monospace", cursor: "pointer", letterSpacing: 1 }}>
                CURRENT: {fmtUSD(currentPrice)} · UPDATE
              </button>
            )}
          </div>
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
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px 18px", marginBottom: 20 }}>
      <div style={{ fontSize: 10, color: "#3d5449", fontFamily: "monospace", letterSpacing: 2, marginBottom: 12 }}>SIGNAL LOGIC · AUTO-CALCULATED</div>
      {rules.map(({ sig, rule }) => (
        <div key={sig.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <SignalBadge sig={sig} size="sm" />
          <span style={{ fontSize: 11, color: "#4a6655" }}>{rule}</span>
        </div>
      ))}
      <div style={{ marginTop: 10, fontSize: 11, color: "#3d5449", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}>
        Inputs: RSI · 52W High · 200-Day MA · Fear & Greed (crypto only)
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
  const [buyModal, setBuyModal] = useState(false);
  const [filterSig, setFilterSig] = useState("all");
  const [showLegend, setShowLegend] = useState(false);
  const [liveStatus, setLiveStatus] = useState("idle"); // idle | fetching | ok | error
  const [lastUpdated, setLastUpdated] = useState(null);

  // ── Live price refresh
  const refreshPrices = async (wl) => {
    const list = wl || watchlist;
    if (!list.length) return;
    setLiveStatus("fetching");
    const symbols = [...new Set(list.map(a => a.symbol))];
    const prices = await fetchLivePrices(symbols);
    if (Object.keys(prices).length > 0) {
      setWatchlist(prev => prev.map(a =>
        prices[a.symbol]
          ? { ...a, currentPrice: prices[a.symbol].price, change24h: prices[a.symbol].change24h }
          : a
      ));
      setLastUpdated(new Date());
      setLiveStatus("ok");
    } else {
      setLiveStatus("error");
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
      const p = await load("pf_portfolio_v3", DEFAULT_PORTFOLIO);
      setWatchlist(w); setPortfolio(p); setLoaded(true);
    })();
  }, []);
  useEffect(() => { if (loaded) save("pf_watchlist_v3", watchlist); }, [watchlist, loaded]);
  useEffect(() => { if (loaded) save("pf_portfolio_v3", portfolio); }, [portfolio, loaded]);

  const saveWatch = (form) => {
    if (watchModal?.asset) setWatchlist(w => w.map(x => x.id === watchModal.asset.id ? { ...form, id: x.id } : x));
    else setWatchlist(w => [...w, { ...form, id: Date.now() }]);
    setWatchModal(null);
  };

  const positions = portfolio.reduce((acc, b) => { if (!acc[b.symbol]) acc[b.symbol]=[]; acc[b.symbol].push(b); return acc; }, {});
  const totalInvested = portfolio.reduce((s,b) => s+b.buyPrice*b.units, 0);
  const totalValue = Object.values(positions).reduce((s, buys) => s + buys[buys.length-1].currentPrice * buys.reduce((u,b)=>u+b.units,0), 0);
  const totalPnl = totalValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl/totalInvested)*100 : 0;

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
    <div style={{ minHeight: "100vh", background: "#070c09", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "monospace", color: "#00ff9d", fontSize: 13, letterSpacing: 3, opacity: 0.5 }}>LOADING...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#070c09", color: "#e8f5ec", fontFamily: "'Georgia', serif", padding: "24px 20px 80px" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "monospace", fontSize: 10, color: "#2d5040", letterSpacing: 4, marginBottom: 6 }}>PORTFOLIO RESEARCH SYSTEM</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: -1, background: "linear-gradient(90deg,#00ff9d,#7eb8ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          {tab === "watchlist" ? "WATCHLIST" : "PORTFOLIO"}
        </h1>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:6 }}>
          <div style={{ fontSize: 13, color: "#3d5449" }}>Buy quality assets on red days</div>
          <button onClick={() => refreshPrices()} disabled={liveStatus==="fetching"}
            style={{ background:"rgba(0,255,157,0.07)", border:"1px solid rgba(0,255,157,0.2)", color: liveStatus==="fetching"?"#2d6644":"#00ff9d", borderRadius:8, padding:"6px 12px", fontSize:10, fontFamily:"monospace", cursor: liveStatus==="fetching"?"default":"pointer", letterSpacing:1.5, display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ display:"inline-block", animation: liveStatus==="fetching"?"spin 1s linear infinite":"none" }}>↻</span>
            {liveStatus==="fetching" ? "..." : "REFRESH"}
            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 24, background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 4, border: "1px solid rgba(255,255,255,0.06)" }}>
        {[["watchlist","WATCHLIST"],["portfolio","PORTFOLIO"]].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, background: tab===t?"rgba(0,255,157,0.1)":"transparent", border: tab===t?"1px solid rgba(0,255,157,0.25)":"1px solid transparent", color: tab===t?"#00ff9d":"#3d5449", borderRadius: 9, padding: "10px 0", fontSize: 12, fontFamily: "monospace", cursor: "pointer", letterSpacing: 2, transition: "all 0.15s" }}>{l}</button>
        ))}
      </div>

      {tab === "watchlist" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
            {[{l:"ASSETS",v:watchlist.length,c:"#7eb8ff"},{l:"BUY NOW",v:buyableCount,c:"#00ff9d"},{l:"WATCHING",v:watchlist.filter(a=>calcSignal(a).signal==="watch").length,c:"#f5a623"}].map(s => (
              <div key={s.l} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"12px 0", textAlign:"center" }}>
                <div style={{ fontSize:22, fontWeight:900, fontFamily:"monospace", color:s.c }}>{s.v}</div>
                <div style={{ fontSize:9, color:"#3d5449", fontFamily:"monospace", letterSpacing:2, marginTop:2 }}>{s.l}</div>
              </div>
            ))}
          </div>

          <button onClick={() => setShowLegend(!showLegend)} style={{ width:"100%", background:"transparent", border:"1px solid rgba(255,255,255,0.07)", color:"#4a6655", borderRadius:10, padding:"8px 0", fontSize:11, fontFamily:"monospace", cursor:"pointer", letterSpacing:2, marginBottom:14 }}>
            {showLegend ? "▲ HIDE" : "▼ SHOW"} SIGNAL LOGIC
          </button>
          {showLegend && <SignalLegend />}

          <div style={{ display:"flex", gap:8, marginBottom:16, overflowX:"auto", paddingBottom:2 }}>
            {[["all","ALL"],["strong-buy","STRONG BUY"],["dip","BUY DIP"],["watch","WATCHING"],["near-high","WAIT"],["crypto","CRYPTO"],["stock","STOCK"]].map(([f,l]) => (
              <button key={f} onClick={() => setFilterSig(f)} style={{ background:filterSig===f?"rgba(0,255,157,0.1)":"transparent", border:`1px solid ${filterSig===f?"rgba(0,255,157,0.3)":"rgba(255,255,255,0.08)"}`, color:filterSig===f?"#00ff9d":"#4a6655", borderRadius:20, padding:"5px 13px", fontSize:10, fontFamily:"monospace", cursor:"pointer", letterSpacing:1.5, whiteSpace:"nowrap" }}>{l}</button>
            ))}
          </div>

          {filteredWatch.length === 0
            ? <div style={{ textAlign:"center", color:"#3d5449", fontFamily:"monospace", fontSize:13, padding:"40px 0" }}>NO ASSETS MATCH FILTER</div>
            : filteredWatch.map(a => <WatchCard key={a.id} asset={a} onEdit={a => setWatchModal({asset:a})} onDelete={id => setWatchlist(w => w.filter(x => x.id !== id))} onNotesUpdate={(id, note) => setWatchlist(w => w.map(x => x.id === id ? {...x, notes: note} : x))} />)
          }
          <button onClick={() => setWatchModal({asset:null})} style={{ width:"100%", marginTop:8, background:"rgba(0,255,157,0.05)", border:"1px dashed rgba(0,255,157,0.2)", color:"#00ff9d", borderRadius:14, padding:"16px 0", fontSize:13, fontFamily:"monospace", cursor:"pointer", letterSpacing:2 }}>+ ADD ASSET</button>
        </>
      )}

      {tab === "portfolio" && (
        <>
          {portfolio.length > 0 && (
            <div style={{ background:"linear-gradient(135deg,#0d1a10,#0a1a14)", border:"1px solid rgba(0,255,157,0.15)", borderRadius:16, padding:"20px 22px", marginBottom:20 }}>
              <div style={{ fontSize:10, color:"#4a6655", fontFamily:"monospace", letterSpacing:2, marginBottom:12 }}>TOTAL PORTFOLIO</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {[["INVESTED",fmtUSD(totalInvested),"#7eb8ff"],["CURRENT VALUE",fmtUSD(totalValue),"#e8f5ec"]].map(([l,v,c]) => (
                  <div key={l}><div style={{ fontSize:10, color:"#3d5449", fontFamily:"monospace", letterSpacing:1.5 }}>{l}</div><div style={{ fontFamily:"monospace", fontSize:18, fontWeight:800, color:c, marginTop:4 }}>{v}</div></div>
                ))}
              </div>
              <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid rgba(255,255,255,0.05)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:10, color:"#4a6655", fontFamily:"monospace", letterSpacing:2 }}>TOTAL P&L</div>
                <div>
                  <span style={{ fontFamily:"monospace", fontSize:20, fontWeight:900, color:totalPnl>=0?"#00ff9d":"#ff6b6b" }}>{fmtPct(totalPnlPct)}</span>
                  <span style={{ fontFamily:"monospace", fontSize:14, color:totalPnl>=0?"#00cc7a":"#cc4444", marginLeft:10 }}>{totalPnl>=0?"+":""}{fmtUSD(totalPnl)}</span>
                </div>
              </div>
            </div>
          )}
          {Object.keys(positions).length === 0
            ? <div style={{ textAlign:"center", color:"#3d5449", fontFamily:"monospace", fontSize:13, padding:"40px 0", lineHeight:2 }}>NO POSITIONS YET<br/><span style={{fontSize:11}}>Log your first buy below</span></div>
            : Object.entries(positions).map(([sym,buys]) => <PositionCard key={sym} buys={buys} onDelete={id=>setPortfolio(p=>p.filter(x=>x.id!==id))} onUpdatePrice={(sym,price)=>setPortfolio(p=>p.map(b=>b.symbol===sym?{...b,currentPrice:price}:b))} />)
          }
          <button onClick={() => setBuyModal(true)} style={{ width:"100%", marginTop:8, background:"rgba(0,255,157,0.07)", border:"1px dashed rgba(0,255,157,0.25)", color:"#00ff9d", borderRadius:14, padding:"16px 0", fontSize:13, fontFamily:"monospace", cursor:"pointer", letterSpacing:2 }}>+ LOG A BUY</button>
        </>
      )}

      <div style={{ textAlign:"center", marginTop:28, fontSize:10, fontFamily:"monospace", letterSpacing:2, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background: liveStatus==="ok" ? "#00ff9d" : liveStatus==="fetching" ? "#f5a623" : liveStatus==="error" ? "#ff6b6b" : "#3d5449", boxShadow: liveStatus==="ok" ? "0 0 6px #00ff9d" : "none", animation: liveStatus==="fetching" ? "pulse 1s infinite" : "none" }} />
          <span style={{ color: liveStatus==="ok" ? "#2d6644" : liveStatus==="fetching" ? "#7a5a20" : "#3d5449" }}>
            {liveStatus==="fetching" ? "UPDATING PRICES..." : liveStatus==="ok" ? "LIVE · AUTO-REFRESH 60s" : liveStatus==="error" ? "PRICE FETCH FAILED" : "INITIALISING..."}
          </span>
        </div>
        {lastUpdated && <div style={{ color:"#1e3028" }}>LAST UPDATED {lastUpdated.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}</div>}
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      </div>

      {watchModal !== null && <WatchModal asset={watchModal.asset} onSave={saveWatch} onClose={() => setWatchModal(null)} />}
      {buyModal && <BuyModal watchlist={watchlist} onSave={buy=>{setPortfolio(p=>[...p,buy]);setBuyModal(false);}} onClose={() => setBuyModal(false)} />}
    </div>
  );
}
