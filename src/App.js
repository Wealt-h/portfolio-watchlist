import { useState, useEffect, useRef } from "react";
import React from "react";

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
function WatchCard({ asset, onEdit, onDelete, onNotesUpdate, onThesisUpdate }) {
  const [open, setOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(null); // null | "notes" | "thesis"
  const [aiError, setAiError] = useState(null);
  const sig = calcSignal(asset);

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


          {/* Thesis section */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={LBL}>THESIS</div>
              <button onClick={e => handleAiUpdate(e, "thesis")} disabled={!!aiLoading}
                style={{ display: "flex", alignItems: "center", gap: 5, background: aiLoading==="thesis"?"rgba(199,125,255,0.05)":"rgba(199,125,255,0.1)", border: "1px solid rgba(199,125,255,0.25)", color: aiLoading==="thesis"?"#6a3d80":"#c77dff", borderRadius: 20, padding: "3px 10px", fontSize: 10, fontFamily: "monospace", cursor: aiLoading?"default":"pointer", letterSpacing: 1 }}>
                <span style={{ display: "inline-block", animation: aiLoading==="thesis"?"spin 1s linear infinite":"none" }}>✦</span>
                {aiLoading==="thesis" ? "WRITING..." : "THESIS"}
                <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
              </button>
            </div>
            {aiLoading==="thesis" && <div style={{ fontSize: 12, color: "#6a3d80", fontFamily: "monospace", fontStyle: "italic" }}>Generating thesis...</div>}
            {asset.thesis && !aiLoading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {asset.thesis.split("\n").filter(l => l.trim()).map((line, i) => {
                  const isPos = line.startsWith("+");
                  const isNeg = line.startsWith("-");
                  const text = (isPos || isNeg) ? line.slice(1).trim() : line.trim();
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      {(isPos || isNeg) && (
                        <span style={{ fontSize: 13, fontWeight: 800, color: isPos ? "#00ff9d" : "#ff6b6b", flexShrink: 0, marginTop: 1 }}>
                          {isPos ? "+" : "−"}
                        </span>
                      )}
                      <span style={{ fontSize: 13, color: isPos ? "#7adba8" : isNeg ? "#cc7a7a" : "#8aab96", lineHeight: 1.5 }}>{text}</span>
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
                style={{ display: "flex", alignItems: "center", gap: 5, background: aiLoading==="notes"?"rgba(126,184,255,0.05)":"rgba(126,184,255,0.1)", border: "1px solid rgba(126,184,255,0.25)", color: aiLoading==="notes"?"#3d6080":"#7eb8ff", borderRadius: 20, padding: "3px 10px", fontSize: 10, fontFamily: "monospace", cursor: aiLoading?"default":"pointer", letterSpacing: 1 }}>
                <span style={{ display: "inline-block", animation: aiLoading==="notes"?"spin 1s linear infinite":"none" }}>✦</span>
                {aiLoading==="notes" ? "ANALYSING..." : "UPDATE"}
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#0d1510", border: "1px solid rgba(0,255,157,0.2)", borderRadius: "18px 18px 0 0", padding: "20px 18px 40px", width: "100%", maxWidth: 520, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: "monospace", fontSize: 13, color: "#00ff9d", letterSpacing: 2 }}>ADD ASSET</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#4a6655", fontSize: 20, cursor: "pointer" }}>✕</button>
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
            <div style={{ color: "#2d4a3a", fontFamily: "monospace", fontSize: 11, lineHeight: 2 }}>
              <div style={{ marginBottom: 12, color: "#3d5449" }}>POPULAR SEARCHES</div>
              {["BTC", "AMZN", "NVDA", "AAPL", "MSFT", "ETH", "TSLA", "GOOGL"].map(s => (
                <button key={s} onClick={() => { setQuery(s); search(s); }}
                  style={{ background: "rgba(0,255,157,0.05)", border: "1px solid rgba(0,255,157,0.1)", color: "#4a8a6a", borderRadius: 8, padding: "5px 12px", fontSize: 11, fontFamily: "monospace", cursor: "pointer", marginRight: 8, marginBottom: 8 }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {results.map(r => (
            <div key={r.symbol}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${TYPE_COLOR[r.type] || "#7eb8ff"}15`, border: `1px solid ${TYPE_COLOR[r.type] || "#7eb8ff"}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: TYPE_COLOR[r.type] || "#7eb8ff", fontFamily: "monospace" }}>
                  {r.symbol.slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14, color: "#e8f5ec" }}>{r.symbol}</div>
                  <div style={{ fontSize: 11, color: "#4a6655", marginTop: 1 }}>{r.name.length > 30 ? r.name.slice(0, 30) + "..." : r.name}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 9, color: TYPE_COLOR[r.type] || "#7eb8ff", fontFamily: "monospace", background: `${TYPE_COLOR[r.type] || "#7eb8ff"}15`, border: `1px solid ${TYPE_COLOR[r.type] || "#7eb8ff"}25`, borderRadius: 4, padding: "2px 6px" }}>
                  {r.type.toUpperCase()}
                </span>
                <button onClick={() => handleAdd(r)} disabled={!!adding}
                  style={{ background: adding === r.symbol ? "rgba(0,255,157,0.05)" : "rgba(0,255,157,0.1)", border: "1px solid rgba(0,255,157,0.3)", color: adding === r.symbol ? "#2d6644" : "#00ff9d", borderRadius: 8, padding: "6px 14px", fontSize: 11, fontFamily: "monospace", cursor: adding ? "default" : "pointer", letterSpacing: 1, minWidth: 60, textAlign: "center" }}>
                  {adding === r.symbol ? "..." : "+ ADD"}
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#0d1510", border: `1px solid ${accent}33`, borderRadius: "18px 18px 0 0", padding: "20px 18px 32px", width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {["buy","sell"].map(t => (
              <button key={t} onClick={() => setTradeType(t)} style={{ background: tradeType===t ? (t==="buy"?"rgba(0,255,157,0.15)":"rgba(245,166,35,0.15)") : "rgba(255,255,255,0.04)", border: `1px solid ${tradeType===t ? (t==="buy"?"rgba(0,255,157,0.4)":"rgba(245,166,35,0.4)") : "rgba(255,255,255,0.1)"}`, color: tradeType===t ? (t==="buy"?"#00ff9d":"#f5a623") : "#4a6655", borderRadius: 8, padding: "6px 16px", fontSize: 12, fontFamily: "monospace", cursor: "pointer", letterSpacing: 1 }}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#4a6655", fontSize: 20, cursor: "pointer" }}>✕</button>
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

        <button onClick={() => onSave({ id: Date.now(), type: tradeType, symbol: f.symbol, name: f.name, price: parseFloat(f.price)||0, units: parseFloat(f.units)||0, fees: parseFloat(f.fees)||0, date: f.date, notes: f.notes, total })}
          style={{ width: "100%", background: isBuy?"linear-gradient(135deg,rgba(0,255,157,0.15),rgba(0,255,157,0.08))":"linear-gradient(135deg,rgba(245,166,35,0.15),rgba(245,166,35,0.08))", border: `1px solid ${accent}55`, color: accent, borderRadius: 12, padding: "13px 0", fontSize: 13, fontFamily: "monospace", cursor: "pointer", letterSpacing: 2, fontWeight: 700 }}>
          LOG {tradeType.toUpperCase()}
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 300 }}>
      <div style={{ background: "#0d1510", border: `1px solid ${accent}33`, borderRadius: "18px 18px 0 0", padding: "20px 18px 32px", width: "100%", maxWidth: 520 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: accent, background: `${accent}18`, border: `1px solid ${accent}33`, borderRadius: 6, padding: "2px 8px" }}>{trade.type.toUpperCase()}</span>
            <span style={{ fontFamily: "monospace", fontSize: 13, color: "#e8f5ec", letterSpacing: 1 }}>{trade.symbol} · EDIT TRADE</span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#4a6655", fontSize: 20, cursor: "pointer" }}>✕</button>
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
          style={{ width: "100%", background: `linear-gradient(135deg,${accent}22,${accent}0a)`, border: `1px solid ${accent}44`, color: accent, borderRadius: 12, padding: "13px 0", fontSize: 13, fontFamily: "monospace", cursor: "pointer", letterSpacing: 2, fontWeight: 700 }}>
          SAVE CHANGES
        </button>
      </div>
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
    <div onClick={() => setOpen(!open)} style={{ background: "linear-gradient(145deg,#0d1510,#111a14)", border: `1px solid ${isUp?"rgba(0,255,157,0.15)":"rgba(255,107,107,0.15)"}`, borderRadius: 16, padding: "20px 22px", marginBottom: 14, cursor: "pointer" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: isUp?"rgba(0,255,157,0.1)":"rgba(255,107,107,0.1)", border: `1px solid ${isUp?"rgba(0,255,157,0.25)":"rgba(255,107,107,0.25)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: isUp?"#00ff9d":"#ff6b6b", fontFamily: "monospace" }}>
            {symbol.slice(0,2)}
          </div>
          <div>
            <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 17, color: "#e8f5ec", letterSpacing: 1 }}>{symbol}</div>
            <div style={{ fontSize: 12, color: "#4a6655" }}>{pos.unitsHeld.toLocaleString(undefined,{maximumFractionDigits:6})} units held</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 800, color: isUp?"#00ff9d":"#ff6b6b" }}>{fmtPct(pos.unrealisedPct)}</div>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: isUp?"#00cc7a":"#cc4444", marginTop: 2 }}>{pos.unrealisedPnl>=0?"+":""}{fmtUSD(pos.unrealisedPnl)}</div>
        </div>
      </div>

      {/* Key stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
        {[
          ["AVG BUY", fmtUSD(pos.avgBuyPrice)],
          ["BREAK EVEN", fmtUSD(pos.breakEven)],
          ["CURRENT VAL", fmtUSD(pos.currentValue)],
        ].map(([l,v]) => (
          <div key={l} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 9, color: "#3d5449", fontFamily: "monospace", letterSpacing: 1.5 }}>{l}</div>
            <div style={{ fontFamily: "monospace", fontSize: 12, color: "#c8dfd1", fontWeight: 700, marginTop: 3 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Realised P&L badge if any sells */}
      {hasSells && (
        <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, background: pos.realisedPnl>=0?"rgba(0,255,157,0.07)":"rgba(255,107,107,0.07)", border: `1px solid ${pos.realisedPnl>=0?"rgba(0,255,157,0.2)":"rgba(255,107,107,0.2)"}`, borderRadius: 20, padding: "4px 12px" }}>
          <span style={{ fontSize: 10, color: "#4a6655", fontFamily: "monospace" }}>REALISED P&L</span>
          <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: pos.realisedPnl>=0?"#00ff9d":"#ff6b6b" }}>{pos.realisedPnl>=0?"+":""}{fmtUSD(pos.realisedPnl)}</span>
        </div>
      )}

      {/* Expanded detail */}
      {open && (
        <div style={{ marginTop: 16, borderTop: "1px solid rgba(0,255,157,0.08)", paddingTop: 16 }} onClick={e => e.stopPropagation()}>

          {/* Full stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {[
              ["COST BASIS", fmtUSD(pos.costBasis)],
              ["CURRENT PRICE", fmtUSD(currentPrice)],
              ["TOTAL BOUGHT", `${pos.totalBuyUnits.toLocaleString(undefined,{maximumFractionDigits:6})} units`],
              ["TOTAL SOLD", `${pos.totalSellUnits.toLocaleString(undefined,{maximumFractionDigits:6})} units`],
            ].map(([l,v]) => (
              <div key={l} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontSize: 9, color: "#3d5449", fontFamily: "monospace", letterSpacing: 1.5 }}>{l}</div>
                <div style={{ fontFamily: "monospace", fontSize: 12, color: "#8aab96", marginTop: 3 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Trade log tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {["summary","trades"].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ background: view===v?"rgba(0,255,157,0.1)":"transparent", border: `1px solid ${view===v?"rgba(0,255,157,0.3)":"rgba(255,255,255,0.08)"}`, color: view===v?"#00ff9d":"#4a6655", borderRadius: 20, padding: "4px 14px", fontSize: 10, fontFamily: "monospace", cursor: "pointer", letterSpacing: 1.5 }}>
                {v.toUpperCase()}
              </button>
            ))}
          </div>

          {view === "trades" && (
            <div>
              {trades.sort((a,b) => new Date(b.date)-new Date(a.date)).map((t,i) => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: t.type==="buy"?"#00ff9d":"#f5a623", background: t.type==="buy"?"rgba(0,255,157,0.1)":"rgba(245,166,35,0.1)", border: `1px solid ${t.type==="buy"?"rgba(0,255,157,0.2)":"rgba(245,166,35,0.2)"}`, borderRadius: 4, padding: "1px 6px" }}>{t.type.toUpperCase()}</span>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#8aab96" }}>{t.date}</span>
                    </div>
                    {t.notes && <div style={{ fontSize: 11, color: "#3d5449", marginTop: 3 }}>{t.notes}</div>}
                    {t.fees > 0 && <div style={{ fontSize: 10, color: "#3d5449", marginTop: 2, fontFamily: "monospace" }}>FEE: {fmtUSD(t.fees)}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "monospace", fontSize: 12, color: "#e8f5ec" }}>{fmtUSD(t.price)} × {t.units}</div>
                      <div style={{ fontFamily: "monospace", fontSize: 11, color: t.type==="buy"?"#4a6655":"#f5a623" }}>{t.type==="buy"?"-":"+"}{ fmtUSD(t.price*t.units)}</div>
                    </div>
                    <button onClick={() => onEdit(t)} style={{ background: "rgba(126,184,255,0.08)", border: "1px solid rgba(126,184,255,0.2)", color: "#7eb8ff", borderRadius: 6, padding: "4px 8px", fontSize: 10, fontFamily: "monospace", cursor: "pointer" }}>✎</button>
                    <button onClick={() => onDelete(t.id)} style={{ background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", color: "#ff6b6b", borderRadius: 6, padding: "4px 8px", fontSize: 10, fontFamily: "monospace", cursor: "pointer" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === "summary" && (
            <div>
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "#4a6655", fontFamily: "monospace" }}>UNREALISED P&L</span>
                  <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 800, color: pos.unrealisedPnl>=0?"#00ff9d":"#ff6b6b" }}>{pos.unrealisedPnl>=0?"+":""}{fmtUSD(pos.unrealisedPnl)} ({fmtPct(pos.unrealisedPct)})</span>
                </div>
                {hasSells && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "#4a6655", fontFamily: "monospace" }}>REALISED P&L</span>
                  <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 800, color: pos.realisedPnl>=0?"#00ff9d":"#ff6b6b" }}>{pos.realisedPnl>=0?"+":""}{fmtUSD(pos.realisedPnl)}</span>
                </div>}
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 8 }}>
                  <span style={{ fontSize: 11, color: "#4a6655", fontFamily: "monospace" }}>TOTAL P&L</span>
                  <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 800, color: (pos.unrealisedPnl+pos.realisedPnl)>=0?"#00ff9d":"#ff6b6b" }}>{(pos.unrealisedPnl+pos.realisedPnl)>=0?"+":""}{fmtUSD(pos.unrealisedPnl+pos.realisedPnl)}</span>
                </div>
              </div>
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
  const [tradeModal, setTradeModal] = useState(null); // null | { defaultType, symbol? }
  const [searchModal, setSearchModal] = useState(false);
  const [editTradeModal, setEditTradeModal] = useState(null); // null | trade object
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
      const p = await load("pf_portfolio_v4", DEFAULT_PORTFOLIO);
      setWatchlist(w); setPortfolio(p); setLoaded(true);
    })();
  }, []);
  useEffect(() => { if (loaded) save("pf_watchlist_v3", watchlist); }, [watchlist, loaded]);
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
    <div style={{ minHeight: "100vh", background: "#070c09", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "monospace", color: "#00ff9d", fontSize: 13, letterSpacing: 3, opacity: 0.5 }}>LOADING...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#070c09", color: "#e8f5ec", fontFamily: "'Georgia', serif", padding: "24px 20px 80px" }}>
      {/* ── ACCRUE HEADER ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            {/* Logo mark + wordmark */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "linear-gradient(135deg, #0d2a1a, #0a1f12)",
                border: "1px solid rgba(0,255,157,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 12px rgba(0,255,157,0.1)",
                flexShrink: 0,
              }}>
                {/* A mark with upward bar */}
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M2 15L7 4L9 8.5L11 4L16 15" stroke="#00ff9d" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="4.5" y1="11" x2="13.5" y2="11" stroke="#00ff9d" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div style={{
                  fontSize: 22, fontWeight: 900, letterSpacing: 4,
                  background: "linear-gradient(90deg, #e8f5ec 0%, #00ff9d 60%, #7eb8ff 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  fontFamily: "monospace", lineHeight: 1,
                }}>ACCRUE</div>
                <div style={{ fontSize: 9, color: "#2d5040", letterSpacing: 3, fontFamily: "monospace", marginTop: 2 }}>
                  DISCIPLINED INVESTMENT INTELLIGENCE
                </div>
              </div>
            </div>
          </div>

          {/* Refresh + live status */}
          <button onClick={() => refreshPrices()} disabled={liveStatus==="fetching"}
            style={{
              background: "rgba(0,255,157,0.06)", border: "1px solid rgba(0,255,157,0.15)",
              color: liveStatus==="fetching" ? "#2d6644" : "#00ff9d",
              borderRadius: 10, padding: "8px 12px", fontSize: 10,
              fontFamily: "monospace", cursor: liveStatus==="fetching" ? "default" : "pointer",
              letterSpacing: 1.5, display: "flex", alignItems: "center", gap: 6, marginTop: 2,
            }}>
            <span style={{ display: "inline-block", animation: liveStatus==="fetching" ? "spin 1s linear infinite" : "none", fontSize: 13 }}>↻</span>
            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
          </button>
        </div>

        {/* Divider with live status */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(0,255,157,0.08)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: liveStatus==="ok" ? "#00ff9d" : liveStatus==="fetching" ? "#f5a623" : liveStatus==="error" ? "#ff6b6b" : "#3d5449",
              boxShadow: liveStatus==="ok" ? "0 0 5px #00ff9d" : "none",
            }} />
            <span style={{ fontSize: 9, color: "#2d5040", fontFamily: "monospace", letterSpacing: 2 }}>
              {liveStatus==="ok" ? "LIVE" : liveStatus==="fetching" ? "UPDATING" : liveStatus==="error" ? "OFFLINE" : "INITIALISING"}
            </span>
          </div>
          <div style={{ flex: 1, height: 1, background: "rgba(0,255,157,0.08)" }} />
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
            : filteredWatch.map(a => <WatchCard key={a.id} asset={a} onEdit={a => setWatchModal({asset:a})} onDelete={id => setWatchlist(w => w.filter(x => x.id !== id))} onNotesUpdate={(id, note) => setWatchlist(w => w.map(x => x.id === id ? {...x, notes: note} : x))} onThesisUpdate={(id, thesis) => setWatchlist(w => w.map(x => x.id === id ? {...x, thesis} : x))} />)
          }
          <button onClick={() => setSearchModal(true)} style={{ width:"100%", marginTop:8, background:"rgba(0,255,157,0.05)", border:"1px dashed rgba(0,255,157,0.2)", color:"#00ff9d", borderRadius:14, padding:"16px 0", fontSize:13, fontFamily:"monospace", cursor:"pointer", letterSpacing:2 }}>+ ADD ASSET</button>
        </>
      )}

      {tab === "portfolio" && (
        <>
          {portfolio.length > 0 && (
            <div style={{ background:"linear-gradient(135deg,#0d1a10,#0a1a14)", border:"1px solid rgba(0,255,157,0.15)", borderRadius:16, padding:"20px 22px", marginBottom:20 }}>
              <div style={{ fontSize:10, color:"#4a6655", fontFamily:"monospace", letterSpacing:2, marginBottom:14 }}>PORTFOLIO SUMMARY</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
                {[["COST BASIS",fmtUSD(totalCostBasis),"#7eb8ff"],["CURRENT VALUE",fmtUSD(totalCurrentValue),"#e8f5ec"]].map(([l,v,c]) => (
                  <div key={l} style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"10px 12px" }}>
                    <div style={{ fontSize:9, color:"#3d5449", fontFamily:"monospace", letterSpacing:1.5 }}>{l}</div>
                    <div style={{ fontFamily:"monospace", fontSize:16, fontWeight:800, color:c, marginTop:4 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
                <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"10px 12px" }}>
                  <div style={{ fontSize:9, color:"#3d5449", fontFamily:"monospace", letterSpacing:1.5 }}>UNREALISED P&L</div>
                  <div style={{ fontFamily:"monospace", fontSize:15, fontWeight:800, color:totalUnrealisedPnl>=0?"#00ff9d":"#ff6b6b", marginTop:4 }}>{totalUnrealisedPnl>=0?"+":""}{fmtUSD(totalUnrealisedPnl)}</div>
                  <div style={{ fontFamily:"monospace", fontSize:11, color:totalUnrealisedPnl>=0?"#2d6644":"#8a3333" }}>{fmtPct(totalPnlPct)}</div>
                </div>
                <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"10px 12px" }}>
                  <div style={{ fontSize:9, color:"#3d5449", fontFamily:"monospace", letterSpacing:1.5 }}>REALISED P&L</div>
                  <div style={{ fontFamily:"monospace", fontSize:15, fontWeight:800, color:totalRealisedPnl>=0?"#00ff9d":"#ff6b6b", marginTop:4 }}>{totalRealisedPnl>=0?"+":""}{fmtUSD(totalRealisedPnl)}</div>
                  <div style={{ fontFamily:"monospace", fontSize:11, color:"#3d5449" }}>LOCKED IN</div>
                </div>
              </div>
              <div style={{ borderTop:"1px solid rgba(255,255,255,0.05)", paddingTop:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:10, color:"#4a6655", fontFamily:"monospace", letterSpacing:2 }}>TOTAL P&L</div>
                <div>
                  <span style={{ fontFamily:"monospace", fontSize:20, fontWeight:900, color:totalPnl>=0?"#00ff9d":"#ff6b6b" }}>{totalPnl>=0?"+":""}{fmtUSD(totalPnl)}</span>
                </div>
              </div>
            </div>
          )}
          {positionSummaries.length === 0
            ? <div style={{ textAlign:"center", color:"#3d5449", fontFamily:"monospace", fontSize:13, padding:"40px 0", lineHeight:2 }}>NO POSITIONS YET<br/><span style={{fontSize:11}}>Log your first trade below</span></div>
            : positionSummaries.map(({sym, trades}) => (
                <PositionCard key={sym} trades={trades} currentPrice={getLivePrice(sym)}
                  onDelete={id => setPortfolio(p => p.filter(x => x.id !== id))}
                  onAddTrade={(sym) => setTradeModal({ defaultType:"buy", symbol:sym })}
                  onEdit={(trade) => setEditTradeModal(trade)} />
              ))
          }
          <button onClick={() => setTradeModal({defaultType:"buy"})} style={{ width:"100%", marginTop:8, background:"rgba(0,255,157,0.07)", border:"1px dashed rgba(0,255,157,0.25)", color:"#00ff9d", borderRadius:14, padding:"14px 0", fontSize:12, fontFamily:"monospace", cursor:"pointer", letterSpacing:2 }}>+ LOG TRADE</button>
        </>
      )}

      <div style={{ textAlign:"center", marginTop:28, fontSize:9, color:"#1a2e20", fontFamily:"monospace", letterSpacing:3 }}>
        ACCRUE · {lastUpdated ? `LAST SYNC ${lastUpdated.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}` : "ACCRUE INVESTMENT INTELLIGENCE"}
      </div>

      {watchModal !== null && <WatchModal asset={watchModal.asset} onSave={saveWatch} onClose={() => setWatchModal(null)} />}
      {searchModal && <AssetSearchModal onAdd={asset => { setWatchlist(w => [...w, asset]); }} onClose={() => setSearchModal(false)} />}
      {editTradeModal && <EditTradeModal trade={editTradeModal} onSave={(updated) => { setPortfolio(p => p.map(t => t.id === updated.id ? updated : t)); setEditTradeModal(null); }} onClose={() => setEditTradeModal(null)} />}
      {tradeModal !== null && <TradeModal watchlist={watchlist} defaultType={tradeModal.defaultType} onSave={trade=>{setPortfolio(p=>[...p,trade]);setTradeModal(null);}} onClose={() => setTradeModal(null)} />}
    </div>
  );
}
