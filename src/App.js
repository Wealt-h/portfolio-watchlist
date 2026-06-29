import { useState, useEffect, useRef } from "react";
import React from "react";
import { AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "./supabaseClient";

// ─── API BASE URL (web vs native) ───────────────────────────────────────────
// On the web, relative fetches like "/api/prices" correctly resolve against
// whatever domain the page is loaded from. Inside the Capacitor-wrapped native
// app, the page is loaded from capacitor://localhost, which has no server of
// its own — so the same relative path would 404/fail silently. When running
// natively, prefix every API call with the real deployed URL instead.
//
// Detect "running natively" via the page's own protocol (capacitor:// or
// ionic://) rather than checking window.Capacitor.isNativePlatform() — that
// check depends on Capacitor's JS bridge having already finished injecting
// itself by the time this line runs at module load, which isn't guaranteed
// and was silently causing this to resolve to the wrong (empty) value.
const IS_NATIVE_APP = typeof window !== "undefined" && window.location && (window.location.protocol === "capacitor:" || window.location.protocol === "ionic:");
const API_BASE = IS_NATIVE_APP ? "https://portfolio-watchlist-cumx.vercel.app" : "";
const apiUrl = (path) => `${API_BASE}${path}`;

// ─── ONBOARDING ──────────────────────────────────────────────────────────────
const ONBOARDING_STEPS = [
  {
    icon: (color) => (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <polyline points="4,28 10,18 16,22 24,10 32,14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="32" cy="14" r="2.5" fill={color}/>
        <line x1="4" y1="32" x2="32" y2="32" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
      </svg>
    ),
    title: "Watchlist",
    subtitle: "Track quality assets",
    body: "Add stocks, crypto, ETFs and commodities to your watchlist. Accrue calculates buy signals using RSI, 52-week high distance, 200-day MA and Fear & Greed — so you always know when to act.",
    accent: "#3ddc84",
  },
  {
    icon: (color) => (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="4" y="20" width="7" height="12" rx="1.5" fill={color} opacity="0.8"/>
        <rect x="14.5" y="13" width="7" height="19" rx="1.5" fill={color} opacity="0.6"/>
        <rect x="25" y="6" width="7" height="26" rx="1.5" fill={color} opacity="0.4"/>
        <line x1="4" y1="32" x2="32" y2="32" stroke={color} strokeWidth="1" opacity="0.2"/>
      </svg>
    ),
    title: "Portfolio",
    subtitle: "Log every trade",
    body: "Record every buy and sell with price, units and fees. Track unrealised and realised P&L per position, monitor your cash accounts earning interest, and see your total portfolio value in one place.",
    accent: "#93c5fd",
  },
  {
    icon: (color) => (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="13" stroke={color} strokeWidth="1.8" opacity="0.3"/>
        <path d="M18 5 A13 13 0 0 1 31 18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <circle cx="18" cy="18" r="2.5" fill={color}/>
        <line x1="18" y1="18" x2="27" y2="10" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    title: "Insights",
    subtitle: "Understand your performance",
    body: "See how each asset class performs — crypto vs stocks vs cash. Compare your returns against the S&P 500. Track your win rate and best performers with daily, weekly and monthly breakdowns.",
    accent: "#fbbf24",
  },
  {
    icon: (color) => (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="6" y="8" width="24" height="20" rx="3" stroke={color} strokeWidth="1.8" opacity="0.4"/>
        <line x1="10" y1="15" x2="26" y2="15" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
        <line x1="10" y1="19" x2="22" y2="19" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
        <line x1="10" y1="23" x2="18" y2="23" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
        <circle cx="28" cy="26" r="5" fill="#07090c" stroke={color} strokeWidth="1.5"/>
        <line x1="28" y1="23.5" x2="28" y2="26" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="28" cy="27.5" r="0.8" fill={color}/>
      </svg>
    ),
    title: "AI Intelligence",
    subtitle: "Research powered by philosophy",
    body: "Every thesis and daily market update is generated through the lens of Buffett, Druckenmiller, Dalio, Cohen and the Bitcoin Standard — giving you institutional-grade analysis personalised to your strategy.",
    accent: "#c77dff",
  },
];

// ─── NAV DRAWER ──────────────────────────────────────────────────────────────
// ─── ABOUT SCREEN ────────────────────────────────────────────────────────────
function AboutScreen({ onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 400 }}>
      <div style={{
        background: C.modalBg, border: `1px solid ${C.border}`, borderRadius: "16px 16px 0 0",
        padding: "28px 24px 40px", width: "100%", maxWidth: 540, maxHeight: "86vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {[["A",1.0],["C",0.92],["C",0.84],["R",0.76],["U",0.68],["E",0.60]].map(([l,o],i) => (
              <span key={i} style={{ fontSize: 24, fontWeight: 200, letterSpacing: 5, color: C.text1, opacity: o, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>{l}</span>
            ))}
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.text3, fontSize: 18, cursor: "pointer", padding: 4 }}>✕</button>
        </div>

        <div style={{ fontSize: 11, color: C.green, opacity: 0.85, fontFamily: MONO, letterSpacing: 2, marginBottom: 22 }}>
          DISCIPLINED INVESTMENT INTELLIGENCE
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 300, fontSize: 14.5, lineHeight: 1.65, color: C.text2 }}>
          <p style={{ margin: 0 }}>
            Accrue was built on a simple premise: the best time to buy a great asset is when everyone else is scared to.
          </p>
          <p style={{ margin: 0 }}>
            It draws on ideas from some of the more disciplined voices in investing — patience and quality over hype, conviction sized to opportunity, risk managed deliberately rather than left to chance. You don't have to share every belief behind it to find it useful; the goal is simply to help you act with a clear head instead of a crowded one.
          </p>
          <p style={{ margin: 0 }}>
            Accrue exists to remove emotion from the process — tracking what you own, what it's worth, and whether today is a day to act or a day to wait.
          </p>
          <p style={{ margin: 0, color: C.text3, fontSize: 13 }}>
            This is a personal project, built and refined one feature at a time. If something feels off, I'd genuinely like to know — there's a feedback link in the menu.
          </p>
        </div>

        <div style={{ marginTop: 28, paddingTop: 18, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: C.text3, fontFamily: MONO, letterSpacing: 1 }}>v1.0.0</span>
          <span style={{ fontSize: 10, color: C.text3, fontFamily: MONO, letterSpacing: 1 }}>Built with care</span>
        </div>
      </div>
    </div>
  );
}


function NavDrawer({ open, onClose, tab, setTab, alertCount, onRestartOnboarding, displayCurrency, onOpenCurrencyPicker, onOpenAbout, theme, onSetTheme, onLogout }) {
  if (!open) return null;

  const NavItem = ({ icon, label, active, badge, onClick, dim }) => (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 12, width: "100%",
      background: active ? C.surfaceHigh : "transparent",
      border: "none", borderRadius: 8, padding: "11px 12px",
      cursor: "pointer", textAlign: "left",
    }}>
      <span style={{ fontSize: 16, opacity: active ? 0.95 : (dim ? 0.6 : 0.8), width: 18, textAlign: "center", color: C.text1 }}>{icon}</span>
      <span style={{ fontSize: 13, fontFamily: FONT, fontWeight: 300, color: active ? C.text1 : (dim ? C.text3 : C.text2) }}>{label}</span>
      {badge > 0 && <span style={{ marginLeft: "auto", fontSize: 10, color: C.green, fontFamily: MONO }}>{badge}</span>}
    </button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex" }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} />

      {/* Drawer panel */}
      <div style={{
        position: "relative", width: "78%", maxWidth: 280, height: "100%",
        background: C.surface, borderRight: `1px solid ${C.border}`,
        padding: "env(safe-area-inset-top, 28px) 20px 28px",
        display: "flex", flexDirection: "column",
        animation: "slideIn 0.22s ease",
      }}>
        <style>{`@keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>

        {/* Wordmark + close */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {[["A",1.0],["C",0.92],["C",0.84],["R",0.76],["U",0.68],["E",0.60]].map(([l,o],i) => (
              <span key={i} style={{ fontSize: 20, fontWeight: 200, letterSpacing: 4, color: C.text1, opacity: o, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>{l}</span>
            ))}
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.text3, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        {/* Primary nav */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <NavItem icon="☰" label="Watchlist" active={tab === "watchlist"} onClick={() => { setTab("watchlist"); onClose(); }} />
          <NavItem icon="◧" label="Portfolio" active={tab === "portfolio"} onClick={() => { setTab("portfolio"); onClose(); }} />
          <NavItem icon="◔" label="Insights" active={tab === "insights"} onClick={() => { setTab("insights"); onClose(); }} />
        </div>

        <div style={{ height: 1, background: C.border, margin: "16px 0" }} />

        {/* Secondary nav */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <NavItem icon="◌" label="Alerts" dim badge={alertCount} onClick={() => { setTab("watchlist"); onClose(); }} />
          <NavItem icon="◎" label={`Currency · ${displayCurrency}`} dim onClick={() => { onOpenCurrencyPicker(); onClose(); }} />

          <div style={{ padding: "11px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 16, opacity: 0.6, width: 18, textAlign: "center", color: C.text1 }}>◐</span>
              <span style={{ fontSize: 13, fontFamily: FONT, fontWeight: 300, color: C.text3 }}>Theme</span>
            </div>
            <div style={{ display: "flex", gap: 6, marginLeft: 30 }}>
              {[["dark","Dark"],["light","Light"],["cyberpunk","Cyberpunk"]].map(([t, l]) => (
                <button key={t} onClick={() => onSetTheme(t)} style={{
                  flex: 1, background: theme===t?C.surfaceHigh:"transparent", border: `1px solid ${theme===t?C.borderHover:C.border}`,
                  color: theme===t?C.text1:C.text3, borderRadius: 6, padding: "6px 4px", fontSize: 10, fontFamily: FONT, fontWeight: 300, cursor: "pointer", letterSpacing: 0.3,
                }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <NavItem icon="↻" label="Replay intro" dim onClick={() => { onRestartOnboarding(); onClose(); }} />
          <NavItem icon="ⓘ" label="About Accrue" dim onClick={() => { onOpenAbout(); onClose(); }} />
          <NavItem icon="✉" label="Help & feedback" dim onClick={() => { window.location.href = "mailto:?subject=Accrue%20feedback"; onClose(); }} />
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
          <NavItem icon="⏻" label="Log out" dim onClick={() => { onLogout(); onClose(); }} />
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, fontSize: 10, color: C.text3, fontFamily: MONO, letterSpacing: 1 }}>
          v1.0.0
        </div>
      </div>
    </div>
  );
}


// ─── RETURNING-VISIT SPLASH (logo only, auto-dismisses) ─────────────────────
function ReturningSplash({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div onClick={onDone} style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #07090c 0%, #08090a 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 32px",
      fontFamily: FONT,
      cursor: "pointer",
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .rsplash-logo { animation: fadeIn 1.2s ease forwards; opacity: 0; }
        .rsplash-tag  { animation: fadeUp 0.8s ease 1.0s forwards; opacity: 0; }
        .rsplash-line { animation: fadeIn 0.6s ease 1.6s forwards; opacity: 0; }
      `}</style>
      <div className="rsplash-logo" style={{ marginBottom: 28 }}>
        {[["A",1.0],["C",0.92],["C",0.84],["R",0.76],["U",0.68],["E",0.60]].map(([l,o],i) => (
          <span key={i} style={{ fontSize: 46, fontWeight: 100, letterSpacing: 11, color: `rgba(240,245,242,${o})`, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>{l}</span>
        ))}
      </div>
      <div className="rsplash-tag" style={{ fontSize: 13, color: "rgba(240,245,242,0.38)", fontWeight: 300, letterSpacing: 1.5, textAlign: "center", marginBottom: 10 }}>
        Disciplined Investment Intelligence
      </div>
      <div className="rsplash-line" style={{ width: 36, height: 1, background: "rgba(61,220,132,0.45)" }} />
    </div>
  );
}

// ─── AUTH SCREEN ─────────────────────────────────────────────────────────────
function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  const SML = { ...INP, padding: "12px 14px", fontSize: 16 };
  const LBL2 = { ...LBL, marginBottom: 5 };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (data?.user && !data.session) {
          // Email confirmation required before a session exists
          setInfoMessage("Check your email to confirm your account, then log in.");
          setMode("login");
        } else if (data?.session) {
          onAuthed(data.session);
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        onAuthed(data.session);
      }
    } catch (err) {
      setError(err.message || "Something went wrong — please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #07090c 0%, #08090a 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 24px",
      fontFamily: FONT,
    }}>
      {/* Wordmark */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 8 }}>
        {[["A",1.0],["C",0.92],["C",0.84],["R",0.76],["U",0.68],["E",0.60]].map(([l,o],i) => (
          <span key={i} style={{ fontSize: 32, fontWeight: 100, letterSpacing: 7, color: `rgba(240,245,242,${o})`, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>{l}</span>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "rgba(240,245,242,0.4)", fontWeight: 300, letterSpacing: 1.5, marginBottom: 36 }}>
        Disciplined Investment Intelligence
      </div>

      {/* Form card */}
      <div style={{ width: "100%", maxWidth: 380, background: "#111318", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, padding: "26px 22px" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
          {["login","signup"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(null); setInfoMessage(null); }}
              style={{ flex: 1, background: mode===m?"#181c22":"transparent", border: `1px solid ${mode===m?"rgba(255,255,255,0.26)":"rgba(255,255,255,0.14)"}`, color: mode===m?"#f0f5f2":"rgba(240,245,242,0.35)", borderRadius: 6, padding: "8px 0", fontSize: 12, fontFamily: FONT, fontWeight: 300, cursor: "pointer", letterSpacing: 0.3 }}>
              {m === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <div style={LBL2}>EMAIL</div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" style={SML} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={LBL2}>PASSWORD</div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="••••••••" style={SML} />
          </div>

          {error && <div style={{ fontSize: 12, color: "#ff6b6b", fontFamily: FONT, fontWeight: 300, marginBottom: 14, lineHeight: 1.4 }}>{error}</div>}
          {infoMessage && <div style={{ fontSize: 12, color: "#3ddc84", fontFamily: FONT, fontWeight: 300, marginBottom: 14, lineHeight: 1.4 }}>{infoMessage}</div>}

          <button type="submit" disabled={loading}
            style={{ width: "100%", background: "#181c22", border: "1px solid rgba(255,255,255,0.26)", color: "#f0f5f2", borderRadius: 8, padding: "13px 0", fontSize: 12, fontFamily: FONT, fontWeight: 300, cursor: loading ? "default" : "pointer", letterSpacing: 0.5, opacity: loading ? 0.6 : 1 }}>
            {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </div>

      <div style={{ fontSize: 10, color: "rgba(240,245,242,0.25)", fontFamily: MONO, letterSpacing: 1, marginTop: 28 }}>
        v1.0.0
      </div>
    </div>
  );
}


function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(-1); // -1 = splash

  const handleNext = () => {
    if (step < ONBOARDING_STEPS.length - 1) setStep(s => s + 1);
    else onComplete();
  };

  const handleSkip = () => onComplete();

  // Splash screen
  if (step === -1) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #07090c 0%, #08090a 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 32px",
        fontFamily: FONT,
      }}>
        <style>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          .splash-logo   { animation: fadeIn 1.2s ease forwards; opacity: 0; }
          .splash-tag    { animation: fadeUp 0.8s ease 1.0s forwards; opacity: 0; }
          .splash-line   { animation: fadeIn 0.6s ease 1.6s forwards; opacity: 0; }
          .splash-pills  { animation: fadeUp 0.8s ease 1.8s forwards; opacity: 0; }
          .splash-cta    { animation: fadeUp 0.7s ease 2.4s forwards; opacity: 0; }
        `}</style>

        {/* Logo */}
        <div className="splash-logo" style={{ marginBottom: 28 }}>
          {[["A",1.0],["C",0.92],["C",0.84],["R",0.76],["U",0.68],["E",0.60]].map(([l,o],i) => (
            <span key={i} style={{ fontSize: 46, fontWeight: 100, letterSpacing: 11, color: `rgba(240,245,242,${o})`, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>{l}</span>
          ))}
        </div>

        {/* Tagline */}
        <div className="splash-tag" style={{ fontSize: 13, color: "rgba(240,245,242,0.38)", fontWeight: 300, letterSpacing: 1.5, textAlign: "center", marginBottom: 10 }}>
          Disciplined Investment Intelligence
        </div>
        <div className="splash-line" style={{ width: 36, height: 1, background: "rgba(61,220,132,0.45)", marginBottom: 52 }} />

        {/* Feature pills */}
        <div className="splash-pills" style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 300, marginBottom: 52 }}>
          {[
            { svg: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><polyline points="1,12 5,7 8,9 12,4 15,6" stroke="#3ddc84" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="15" cy="6" r="1.2" fill="#3ddc84"/></svg>, text: "Live prices & buy signals" },
            { svg: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="7" r="4.5" stroke="rgba(240,245,242,0.5)" strokeWidth="1.3"/><path d="M8 11v3M6 14h4" stroke="rgba(240,245,242,0.5)" strokeWidth="1.3" strokeLinecap="round"/><circle cx="6.5" cy="6.5" r="0.8" fill="rgba(240,245,242,0.5)"/><circle cx="9.5" cy="6.5" r="0.8" fill="rgba(240,245,242,0.5)"/></svg>, text: "AI-powered research" },
            { svg: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="12" height="9" rx="1.5" stroke="rgba(240,245,242,0.5)" strokeWidth="1.3"/><path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1" stroke="rgba(240,245,242,0.5)" strokeWidth="1.3"/><line x1="5" y1="8" x2="11" y2="8" stroke="rgba(240,245,242,0.5)" strokeWidth="1.3" strokeLinecap="round"/><line x1="5" y1="10.5" x2="9" y2="10.5" stroke="rgba(240,245,242,0.5)" strokeWidth="1.3" strokeLinecap="round"/></svg>, text: "Full portfolio tracking" },
            { svg: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="rgba(240,245,242,0.5)" strokeWidth="1.3"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="rgba(240,245,242,0.5)" strokeWidth="1.3"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="rgba(240,245,242,0.5)" strokeWidth="1.3"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="#3ddc84" strokeWidth="1.3"/></svg>, text: "Performance insights" },
          ].map(({ svg, text }) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "13px 16px" }}>
              <div style={{ flexShrink: 0, opacity: 0.9 }}>{svg}</div>
              <span style={{ fontSize: 13, color: "rgba(240,245,242,0.55)", fontWeight: 300, letterSpacing: 0.2 }}>{text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="splash-cta" style={{ width: "100%", maxWidth: 300 }}>
          <button onClick={() => setStep(0)} style={{
            width: "100%",
            background: "linear-gradient(135deg, rgba(61,220,132,0.18), rgba(61,220,132,0.07))",
            border: "1px solid rgba(61,220,132,0.4)",
            color: "#3ddc84", borderRadius: 14, padding: "16px 0",
            fontSize: 14, fontFamily: FONT, fontWeight: 400,
            cursor: "pointer", letterSpacing: 1, marginBottom: 14,
          }}>
            Get started
          </button>
          <button onClick={handleSkip} style={{ display: "block", width: "100%", background: "transparent", border: "none", color: "rgba(240,245,242,0.22)", fontSize: 12, fontFamily: FONT, fontWeight: 300, cursor: "pointer", letterSpacing: 0.5, textAlign: "center" }}>
            Skip intro
          </button>
        </div>
      </div>
    );
  }

  const current = ONBOARDING_STEPS[step];
  const progress = (step + 1) / ONBOARDING_STEPS.length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #07090c 0%, #08090a 100%)",
      display: "flex", flexDirection: "column",
      padding: "60px 28px 48px",
      fontFamily: FONT,
    }}>
      {/* Progress bar */}
      <div style={{ width: "100%", height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginBottom: 48 }}>
        <div style={{ height: "100%", width: `${progress * 100}%`, background: current.accent, borderRadius: 2, transition: "width 0.4s ease" }} />
      </div>

      {/* Step dots */}
      <div style={{ display: "flex", gap: 6, marginBottom: 48 }}>
        {ONBOARDING_STEPS.map((_, i) => (
          <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i === step ? current.accent : "rgba(255,255,255,0.15)", transition: "all 0.3s ease" }} />
        ))}
      </div>

      {/* Icon */}
      <div style={{
        width: 80, height: 80, borderRadius: 22,
        background: `${current.accent}0e`,
        border: `1px solid ${current.accent}25`,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 32,
      }}>
        {current.icon(current.accent)}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: current.accent, fontFamily: MONO, letterSpacing: 3, marginBottom: 8, textTransform: "uppercase", opacity: 0.8 }}>
          {current.subtitle}
        </div>
        <div style={{ fontSize: 28, fontWeight: 300, color: "rgba(240,245,242,0.95)", letterSpacing: -0.5, marginBottom: 20, lineHeight: 1.2 }}>
          {current.title}
        </div>
        <div style={{ fontSize: 14, color: "rgba(240,245,242,0.5)", fontWeight: 300, lineHeight: 1.7, maxWidth: 340 }}>
          {current.body}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", gap: 12, marginTop: 48 }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{
            flex: 1, background: "transparent",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(240,245,242,0.4)", borderRadius: 12, padding: "14px 0",
            fontSize: 13, fontFamily: FONT, fontWeight: 300, cursor: "pointer",
          }}>
            Back
          </button>
        )}
        <button onClick={handleNext} style={{
          flex: 2,
          background: `linear-gradient(135deg, ${current.accent}25, ${current.accent}10)`,
          border: `1px solid ${current.accent}50`,
          color: current.accent, borderRadius: 12, padding: "14px 0",
          fontSize: 13, fontFamily: FONT, fontWeight: 400,
          cursor: "pointer", letterSpacing: 0.5,
        }}>
          {step === ONBOARDING_STEPS.length - 1 ? "Start using Accrue →" : "Next"}
        </button>
      </div>

      {/* Skip */}
      <button onClick={handleSkip} style={{ background: "transparent", border: "none", color: "rgba(240,245,242,0.2)", fontSize: 11, fontFamily: FONT, fontWeight: 300, cursor: "pointer", marginTop: 16, letterSpacing: 0.5 }}>
        Skip
      </button>
      </div>
  );
}


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

  if ((type === "crypto" || type === "commodity" || type === "stock" || type === "etf") && fearGreed > 0) {
    if (fearGreed <= 20) { score += 3; reasons.push(`Fear & Greed ${fearGreed} — extreme fear`); }
    else if (fearGreed <= 30) { score += 2; reasons.push(`Fear & Greed ${fearGreed} — fear zone`); }
    else if (fearGreed <= 45) { score += 1; reasons.push(`Fear & Greed ${fearGreed} — cautious`); }
    else if (fearGreed >= 75) { score -= 2; reasons.push(`Fear & Greed ${fearGreed} — greed zone`); }
  }

  let signal, label, color, bg, description;
  if (score >= 6) {
    signal = "strong-buy"; label = "STRONG BUY"; color = C.sigStrongBuy; bg = C.sigStrongBuyBg;
    description = "RSI oversold + significant dip from highs";
  } else if (score >= 4) {
    signal = "dip"; label = "BUY DIP"; color = C.sigDip; bg = C.sigDipBg;
    description = "Good dip conditions across multiple indicators";
  } else if (score >= 2) {
    signal = "watch"; label = "WATCHING"; color = C.sigWatch; bg = C.sigWatchBg;
    description = "Some weakness — monitor for better entry";
  } else if (score >= 0) {
    signal = "near-high"; label = "WAIT"; color = C.sigWait; bg = C.sigWaitBg;
    description = "Near highs — wait for a meaningful pullback";
  } else {
    signal = "avoid"; label = "AVOID"; color = C.sigAvoid; bg = C.sigAvoidBg;
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

// ─── SUPABASE: WATCHLIST ──────────────────────────────────────────────────────
// Maps between the app's camelCase watchlist shape and Supabase's snake_case columns.
async function fetchWatchlistFromSupabase(userId) {
  const { data, error } = await supabase.from("watchlist").select("*").eq("user_id", userId).order("id", { ascending: true });
  if (error) { console.error("fetchWatchlistFromSupabase:", error.message); return null; }
  return data.map(row => ({
    id: row.id, symbol: row.symbol, name: row.name, type: row.type,
    notes: row.notes || "", thesis: row.thesis || "", _synced: true,
  }));
}

async function pushWatchlistItemToSupabase(userId, asset) {
  const row = {
    user_id: userId, symbol: asset.symbol, name: asset.name, type: asset.type,
    notes: asset.notes || "", thesis: asset.thesis || "",
  };
  // Use an explicit flag to know whether this item already has a real Supabase row,
  // rather than guessing from the size of the id — hardcoded default watchlist items
  // use small ids (1, 2, 3...) that collide with Supabase's own auto-generated ids,
  // which made the old size-based heuristic unreliable and caused duplicate/broken rows.
  if (asset._synced && asset.id) {
    const { error } = await supabase.from("watchlist").update(row).eq("id", asset.id).eq("user_id", userId);
    if (error) console.error("pushWatchlistItemToSupabase (update):", error.message);
    return asset.id;
  } else {
    const { data, error } = await supabase.from("watchlist").insert(row).select("id").single();
    if (error) { console.error("pushWatchlistItemToSupabase (insert):", error.message); return null; }
    return data.id;
  }
}

async function deleteWatchlistItemFromSupabase(userId, id) {
  const { error } = await supabase.from("watchlist").delete().eq("id", id).eq("user_id", userId);
  if (error) console.error("deleteWatchlistItemFromSupabase:", error.message);
}

// ─── SUPABASE: TRADES (buy / sell / dividend) ─────────────────────────────────
async function fetchTradesFromSupabase(userId) {
  const { data, error } = await supabase.from("trades").select("*").eq("user_id", userId).order("id", { ascending: true });
  if (error) { console.error("fetchTradesFromSupabase:", error.message); return null; }
  return data.map(row => ({
    id: row.id, type: row.type, symbol: row.symbol, name: row.name,
    price: row.price, units: row.units, fees: row.fees || 0, amount: row.amount,
    date: row.date, notes: row.notes || "", brokerage: row.brokerage || "", _synced: true,
    ...(row.original_currency ? { originalCurrency: row.original_currency } : {}),
    ...(row.original_price != null ? { originalPrice: row.original_price } : {}),
    ...(row.original_amount != null ? { originalAmount: row.original_amount } : {}),
  }));
}

async function pushTradeToSupabase(userId, trade) {
  const row = {
    user_id: userId, type: trade.type, symbol: trade.symbol, name: trade.name,
    price: trade.price ?? null, units: trade.units ?? null, fees: trade.fees || 0, amount: trade.amount ?? null,
    date: trade.date, notes: trade.notes || "", brokerage: trade.brokerage || "",
    original_currency: trade.originalCurrency || null,
    original_price: trade.originalPrice ?? null,
    original_amount: trade.originalAmount ?? null,
  };
  // Same explicit-flag approach as watchlist — trade ids created locally with Date.now()
  // are reliably large, but that's not something we should depend on; an explicit flag
  // set at the moment a row is actually confirmed synced is unambiguous either way.
  if (trade._synced && trade.id) {
    const { error } = await supabase.from("trades").update(row).eq("id", trade.id).eq("user_id", userId);
    if (error) console.error("pushTradeToSupabase (update):", error.message);
    return trade.id;
  } else {
    const { data, error } = await supabase.from("trades").insert(row).select("id").single();
    if (error) { console.error("pushTradeToSupabase (insert):", error.message); return null; }
    return data.id;
  }
}

async function deleteTradeFromSupabase(userId, id) {
  const { error } = await supabase.from("trades").delete().eq("id", id).eq("user_id", userId);
  if (error) console.error("deleteTradeFromSupabase:", error.message);
}

// ─── SUPABASE: CASH ACCOUNTS ──────────────────────────────────────────────────
async function fetchCashAccountsFromSupabase(userId) {
  const { data, error } = await supabase.from("cash_accounts").select("*").eq("user_id", userId).order("id", { ascending: true });
  if (error) { console.error("fetchCashAccountsFromSupabase:", error.message); return null; }
  return data.map(row => ({
    id: row.id, institution: row.institution, principal: row.principal, rate: row.rate,
    startDate: row.start_date, accountType: row.account_type || "Savings", notes: row.notes || "", _synced: true,
  }));
}

async function pushCashAccountToSupabase(userId, account) {
  const row = {
    user_id: userId, institution: account.institution, principal: account.principal, rate: account.rate,
    start_date: account.startDate, account_type: account.accountType || "Savings", notes: account.notes || "",
  };
  if (account._synced && account.id) {
    const { error } = await supabase.from("cash_accounts").update(row).eq("id", account.id).eq("user_id", userId);
    if (error) console.error("pushCashAccountToSupabase (update):", error.message);
    return account.id;
  } else {
    const { data, error } = await supabase.from("cash_accounts").insert(row).select("id").single();
    if (error) { console.error("pushCashAccountToSupabase (insert):", error.message); return null; }
    return data.id;
  }
}

async function deleteCashAccountFromSupabase(userId, id) {
  const { error } = await supabase.from("cash_accounts").delete().eq("id", id).eq("user_id", userId);
  if (error) console.error("deleteCashAccountFromSupabase:", error.message);
}

// ─── SUPABASE: PROPERTIES ──────────────────────────────────────────────────────
async function fetchPropertiesFromSupabase(userId) {
  const { data, error } = await supabase.from("properties").select("*").eq("user_id", userId).order("id", { ascending: true });
  if (error) { console.error("fetchPropertiesFromSupabase:", error.message); return null; }
  return data.map(row => ({
    id: row.id, name: row.name, purchasePrice: row.purchase_price, currentValue: row.current_value,
    purchaseDate: row.purchase_date, loanPrincipal: row.loan_principal, interestRate: row.interest_rate,
    repaymentAmount: row.repayment_amount, repaymentFrequency: row.repayment_frequency,
    loanStartDate: row.loan_start_date, weeklyRent: row.weekly_rent, weeklyCosts: row.weekly_costs,
    notes: row.notes || "", dateAdded: row.date_added, _synced: true,
  }));
}

async function pushPropertyToSupabase(userId, property) {
  const row = {
    user_id: userId, name: property.name, purchase_price: property.purchasePrice, current_value: property.currentValue,
    purchase_date: property.purchaseDate, loan_principal: property.loanPrincipal || 0, interest_rate: property.interestRate || 0,
    repayment_amount: property.repaymentAmount || 0, repayment_frequency: property.repaymentFrequency || "monthly",
    loan_start_date: property.loanStartDate, weekly_rent: property.weeklyRent || 0, weekly_costs: property.weeklyCosts || 0,
    notes: property.notes || "", date_added: property.dateAdded || new Date().toISOString().slice(0, 10),
  };
  if (property._synced && property.id) {
    const { error } = await supabase.from("properties").update(row).eq("id", property.id).eq("user_id", userId);
    if (error) console.error("pushPropertyToSupabase (update):", error.message);
    return property.id;
  } else {
    const { data, error } = await supabase.from("properties").insert(row).select("id").single();
    if (error) { console.error("pushPropertyToSupabase (insert):", error.message); return null; }
    return data.id;
  }
}

async function deletePropertyFromSupabase(userId, id) {
  const { error } = await supabase.from("properties").delete().eq("id", id).eq("user_id", userId);
  if (error) console.error("deletePropertyFromSupabase:", error.message);
}

// ─── SUPABASE: ALERTS ──────────────────────────────────────────────────────────
async function fetchAlertsFromSupabase(userId) {
  const { data, error } = await supabase.from("alerts").select("*").eq("user_id", userId).order("id", { ascending: true });
  if (error) { console.error("fetchAlertsFromSupabase:", error.message); return null; }
  return data.map(row => ({
    id: row.id, symbol: row.symbol, target: row.target, direction: row.direction,
    triggered: row.triggered, _synced: true,
  }));
}

async function pushAlertToSupabase(userId, alert) {
  const row = { user_id: userId, symbol: alert.symbol, target: alert.target, direction: alert.direction, triggered: alert.triggered || false };
  if (alert._synced && alert.id) {
    const { error } = await supabase.from("alerts").update(row).eq("id", alert.id).eq("user_id", userId);
    if (error) console.error("pushAlertToSupabase (update):", error.message);
    return alert.id;
  } else {
    const { data, error } = await supabase.from("alerts").insert(row).select("id").single();
    if (error) { console.error("pushAlertToSupabase (insert):", error.message); return null; }
    return data.id;
  }
}

async function deleteAlertFromSupabase(userId, id) {
  const { error } = await supabase.from("alerts").delete().eq("id", id).eq("user_id", userId);
  if (error) console.error("deleteAlertFromSupabase:", error.message);
}

// ─── SUPABASE: USER PREFERENCES (single row per user) ────────────────────────
async function fetchPreferencesFromSupabase(userId) {
  const { data, error } = await supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle();
  if (error) { console.error("fetchPreferencesFromSupabase:", error.message); return null; }
  if (!data) return null; // no row yet for this user — caller should fall back to local/defaults
  return {
    theme: data.theme || "dark",
    displayCurrency: data.display_currency || "USD",
    selectedBenchmark: data.selected_benchmark || "SPY",
    onboarded: !!data.onboarded,
  };
}

// Upserts the whole preferences row — since this is a single row per user (not a list
// of items like everything else), there's no per-item id/sync tracking needed here;
// we just write the full current state every time something changes.
async function pushPreferencesToSupabase(userId, prefs) {
  const row = {
    user_id: userId,
    theme: prefs.theme,
    display_currency: prefs.displayCurrency,
    selected_benchmark: prefs.selectedBenchmark,
    onboarded: prefs.onboarded,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("user_preferences").upsert(row, { onConflict: "user_id" });
  if (error) console.error("pushPreferencesToSupabase:", error.message);
}

// ─── REAL-TIME PRICES (via serverless to avoid CORS) ─────────────────────────
async function fetchLivePrices(symbols) {
  try {
    const res = await fetch(apiUrl("/api/prices"), {
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
// ─── CURRENCY DISPLAY ENGINE ────────────────────────────────────────────────
// USD is always the source of truth for all stored/calculated values.
// This engine only affects DISPLAY — converts on the fly using live FX rates.
const CURRENCY_SYMBOLS = { USD: "$", AUD: "A$", GBP: "£", EUR: "€", CAD: "C$", NZD: "NZ$", JPY: "¥", SGD: "S$", HKD: "HK$", CHF: "CHF ", INR: "₹", CNY: "¥" };
const CURRENCY_NAMES = { USD: "US Dollar", AUD: "Australian Dollar", GBP: "British Pound", EUR: "Euro", CAD: "Canadian Dollar", NZD: "New Zealand Dollar", JPY: "Japanese Yen", SGD: "Singapore Dollar", HKD: "Hong Kong Dollar", CHF: "Swiss Franc", INR: "Indian Rupee", CNY: "Chinese Yuan" };

// Module-level display state — set via setDisplayCurrency(), read via fmtUSD()
let _displayCurrency = "USD";
let _fxRates = {}; // { AUD: 1.52, EUR: 0.92, ... } — all relative to USD base
function setDisplayCurrencyGlobals(currency, rates) {
  _displayCurrency = currency || "USD";
  _fxRates = rates || {};
}

const fmtUSD = (v, d = 2) => {
  if (v == null || isNaN(v)) return "—";
  let val = Number(v);
  let symbol = CURRENCY_SYMBOLS.USD;
  if (_displayCurrency !== "USD" && _fxRates[_displayCurrency]) {
    val = val * _fxRates[_displayCurrency];
    symbol = CURRENCY_SYMBOLS[_displayCurrency] || _displayCurrency + " ";
  }
  return symbol + Number(val).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
};
const fmtPct = (v) => (v >= 0 ? "+" : "") + Number(v).toFixed(2) + "%";
// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "'Courier New', monospace";

// green/red/amber/blue (and their *Dim/*Border variants) are intentionally identical
// across both themes — only surfaces, borders, and text tones change.
const DARK_THEME = {
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
  // Modal/card-specific tones used outside the main C references (TradeModal, CashModal, etc.)
  modalBg:     "#0e1014",
  modalBg2:    "#0a0c0e",
  modalBg3:    "#07090c",
  modalBg4:    "#090b0e",
  modalBg5:    "#08090a",
  labelDim:    "#2d4a3a",
  labelMute:   "#4a6655",
  textSoft:    "#c8dfd1",
  accentBuy:   "#00ff9d",
  accentSell:  "#f5a623",
  accentLink:  "#7eb8ff",
  // Watchlist signal badge colors — strongBuy/dip are distinct greens to preserve
  // the visual hierarchy between "strong buy" and "buy the dip"
  sigStrongBuy: "#00ff9d", sigStrongBuyBg: "rgba(0,255,157,0.12)",
  sigDip:       "#7dffb3", sigDipBg:       "rgba(125,255,179,0.1)",
  sigWatch:     "#7eb8ff", sigWatchBg:     "rgba(126,184,255,0.1)",
  sigWait:      "#f5a623", sigWaitBg:      "rgba(245,166,35,0.1)",
  sigAvoid:     "#ff6b6b", sigAvoidBg:     "rgba(255,107,107,0.1)",
};

const LIGHT_THEME = {
  bg:          "#eceae5",
  surface:     "#ffffff",
  surfaceHigh: "#e3e1da",
  border:      "rgba(20,20,18,0.18)",
  borderHover: "rgba(20,20,18,0.32)",
  borderAccent:"rgba(22,140,80,0.5)",
  text1:       "#1c1d1b",
  text2:       "rgba(28,29,27,0.78)",
  text3:       "rgba(28,29,27,0.58)",
  green:       "#3ddc84",
  greenDim:    "rgba(61,220,132,0.14)",
  greenBorder: "rgba(61,220,132,0.4)",
  red:         "#ff6b6b",
  redDim:      "rgba(255,107,107,0.12)",
  amber:       "#fbbf24",
  blue:        "#93c5fd",
  blueDim:     "rgba(147,197,253,0.12)",
  // Light-theme equivalents of the modal/card-specific dark tones above
  modalBg:     "#ffffff",
  modalBg2:    "#f1efe9",
  modalBg3:    "#eceae5",
  modalBg4:    "#f1efe9",
  modalBg5:    "#eceae5",
  labelDim:    "rgba(28,29,27,0.55)",
  labelMute:   "rgba(28,29,27,0.68)",
  textSoft:    "#1c1d1b",
  accentBuy:   "#0ba968",
  accentSell:  "#c97f12",
  accentLink:  "#2566c9",
  // Watchlist signal badge colors — deepened from the dark-theme neons so they read
  // clearly on a white card instead of looking glaring/oversaturated
  sigStrongBuy: "#0d9a5f", sigStrongBuyBg: "rgba(13,154,95,0.10)",
  sigDip:       "#179a6b", sigDipBg:       "rgba(23,154,107,0.09)",
  sigWatch:     "#2566c9", sigWatchBg:     "rgba(37,102,201,0.09)",
  sigWait:      "#c97f12", sigWaitBg:      "rgba(201,127,18,0.10)",
  sigAvoid:     "#d14f4f", sigAvoidBg:     "rgba(209,79,79,0.10)",
};

// Cyberpunk — a deliberately loud third option, distinct from the restrained dark/light
// themes. Deep violet-black base, hot magenta + electric cyan as the two signature accents,
// acid green standing in for "buy" the way it does in old terminal/hacker aesthetics.
const CYBERPUNK_THEME = {
  bg:          "#0a0014",
  surface:     "#150a28",
  surfaceHigh: "#1f1238",
  border:      "rgba(255,0,200,0.32)",
  borderHover: "rgba(0,240,255,0.55)",
  borderAccent:"rgba(0,240,255,0.7)",
  // Primary text gets a cyan tint instead of near-white — this is the color of every
  // price/number on screen, so it's the single biggest lever for "does this feel cyberpunk"
  text1:       "#e0fbff",
  text2:       "rgba(0,240,255,0.78)",
  text3:       "rgba(255,0,200,0.62)",
  green:       "#00ff9d",
  greenDim:    "rgba(0,255,157,0.18)",
  greenBorder: "rgba(0,255,157,0.5)",
  red:         "#ff0a6c",
  redDim:      "rgba(255,10,108,0.16)",
  amber:       "#ffe600",
  blue:        "#00f0ff",
  blueDim:     "rgba(0,240,255,0.16)",
  // Cyberpunk equivalents of the modal/card-specific tones
  modalBg:     "#150a28",
  modalBg2:    "#1f1238",
  modalBg3:    "#0a0014",
  modalBg4:    "#1f1238",
  modalBg5:    "#0a0014",
  labelDim:    "rgba(255,0,200,0.55)",
  labelMute:   "rgba(0,240,255,0.7)",
  textSoft:    "#e0fbff",
  accentBuy:   "#00ff9d",
  accentSell:  "#ff0a6c",
  accentLink:  "#00f0ff",
  // Watchlist signal badges — full neon, this theme is meant to pop
  sigStrongBuy: "#00ff9d", sigStrongBuyBg: "rgba(0,255,157,0.18)",
  sigDip:       "#00f0ff", sigDipBg:       "rgba(0,240,255,0.16)",
  sigWatch:     "#e066ff", sigWatchBg:     "rgba(224,102,255,0.18)",
  sigWait:      "#ffe600", sigWaitBg:      "rgba(255,230,0,0.16)",
  sigAvoid:     "#ff0a6c", sigAvoidBg:     "rgba(255,10,108,0.18)",
};

// Mutable theme object — every component reads C.xxx directly, so reassigning these
// properties (rather than replacing the object reference) makes every component
// pick up the new theme on next render without needing theme threaded through props.
const C = { ...DARK_THEME };
function applyTheme(themeName) {
  const palette = themeName === "light" ? LIGHT_THEME : themeName === "cyberpunk" ? CYBERPUNK_THEME : DARK_THEME;
  Object.assign(C, palette);
}

// INP/LBL are derived from C, so they must be read live (as functions) rather than
// computed once at module load, or they'd never reflect a theme change.
const getINP = () => ({ background: C.surfaceHigh, border: `1px solid ${C.borderHover}`, borderRadius: 8, padding: "10px 12px", color: C.text1, fontSize: 16, fontFamily: FONT, fontWeight: 300, outline: "none", width: "100%", boxSizing: "border-box" });
const getLBL = () => ({ fontSize: 10, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 4, textTransform: "uppercase" });
// Kept as plain objects too (existing call sites use INP/LBL directly as static style
// objects) — these getters are invoked at the top of App's render body each frame,
// same pattern as setDisplayCurrencyGlobals, so INP/LBL stay in sync with the live theme.
let INP = getINP();
let LBL = getLBL();
function refreshDerivedTokens() { INP = getINP(); LBL = getLBL(); }

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
    (asset.type === "crypto" || asset.type === "stock" || asset.type === "etf") && asset.fearGreed > 0 && { label: asset.type === "crypto" ? "FEAR & GREED" : "MARKET SENTIMENT", value: asset.fearGreed, note: asset.fearGreed <= 30 ? "Fear zone ✓" : asset.fearGreed >= 75 ? "Greed ✗" : "Neutral", good: asset.fearGreed <= 45 },
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

function AssetLogo({ symbol, size = 40, color = C.text2 }) {
  const [srcIndex, setSrcIndex] = useState(0);
  const ticker = symbol.replace("-USD","").replace("-","").toUpperCase();
  const isCrypto = CRYPTO_TICKERS.includes(ticker) || symbol.includes("-USD");
  const COMMODITY_EMOJI = { "GC=F": "🥇", "SI=F": "🥈", GLD: "🥇", SLV: "🥈", IAU: "🥇", PSLV: "🥈", GDX: "⛏️", PDBC: "🛢️" };
  const commodityEmoji = COMMODITY_EMOJI[ticker];
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

  if (commodityEmoji) {
    return (
      <div style={{ width: size, height: size, borderRadius: size * 0.25, background: "rgba(251,191,36,0.1)", border: `1px solid rgba(251,191,36,0.25)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: size * 0.5 }}>
        {commodityEmoji}
      </div>
    );
  }

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

// ─── ALERT MODAL ─────────────────────────────────────────────────────────────
function AlertModal({ symbol, currentPrice, alerts, onSave, onDelete, onClose }) {
  const [price, setPrice] = useState("");
  const [direction, setDirection] = useState("below");
  const myAlerts = alerts.filter(a => a.symbol === symbol);

  const handleAdd = () => {
    if (!price) return;
    onSave({ id: Date.now(), symbol, target: parseFloat(price), direction, triggered: false });
    setPrice("");
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 300 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: "14px 14px 0 0", padding: "20px 18px 32px", width: "100%", maxWidth: 520 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: FONT, fontWeight: 400, fontSize: 15, color: C.text1 }}>{symbol} · Price Alerts</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.text3, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ fontSize: 10, color: C.text3, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 6 }}>CURRENT PRICE: {fmtUSD(currentPrice)}</div>

        {/* Add alert */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <div style={{ display: "flex", background: C.surfaceHigh, borderRadius: 6, padding: 2, border: `1px solid ${C.border}` }}>
            {["below","above"].map(d => (
              <button key={d} onClick={() => setDirection(d)}
                style={{ background: direction===d?C.borderHover:"transparent", border:"none", color: direction===d?C.text1:C.text3, borderRadius:4, padding:"6px 12px", fontSize:11, fontFamily:FONT, fontWeight:300, cursor:"pointer" }}>
                {d.charAt(0).toUpperCase()+d.slice(1)}
              </button>
            ))}
          </div>
          <input value={price} onChange={e => setPrice(e.target.value)} type="number" placeholder="Target price"
            style={{ ...INP, flex: 1 }} />
          <button onClick={handleAdd}
            style={{ background: C.surfaceHigh, border: `1px solid ${C.borderHover}`, color: C.text1, borderRadius: 8, padding: "0 16px", fontSize: 12, fontFamily: FONT, fontWeight: 300, cursor: "pointer", whiteSpace: "nowrap" }}>
            + Add
          </button>
        </div>

        {/* Existing alerts */}
        {myAlerts.length === 0
          ? <div style={{ fontSize: 12, color: C.text3, fontFamily: FONT, fontWeight: 300, fontStyle: "italic" }}>No alerts set for {symbol}</div>
          : myAlerts.map(a => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <div>
                <span style={{ fontSize: 12, color: C.text1, fontFamily: FONT, fontWeight: 300 }}>
                  {a.direction === "below" ? "↓ Below" : "↑ Above"} {fmtUSD(a.target)}
                </span>
                {a.triggered && <span style={{ fontSize: 9, color: C.amber, fontFamily: MONO, marginLeft: 8, letterSpacing: 1 }}>TRIGGERED</span>}
              </div>
              <button onClick={() => onDelete(a.id)}
                style={{ background: "transparent", border: `1px solid ${C.border}`, color: "rgba(248,113,113,0.5)", borderRadius: 4, padding: "3px 8px", fontSize: 10, fontFamily: MONO, cursor: "pointer" }}>✕</button>
            </div>
          ))
        }

        <div style={{ marginTop: 14, fontSize: 10, color: C.text3, fontFamily: MONO, letterSpacing: 1, opacity: 0.6 }}>
          Alerts check every 60 seconds. Enable notifications for instant alerts.
        </div>
      </div>
    </div>
  );
}

// ─── WATCH CARD ───────────────────────────────────────────────────────────────
function WatchCard({ asset, period = "day", onDelete, onNotesUpdate, onThesisUpdate, onAlert, alertCount, onLogTrade }) {
  const [open, setOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [sparkData, setSparkData] = useState(null);
  const [sparkLoading, setSparkLoading] = useState(false);
  const sig = calcSignal(asset);
  // The percentage shown reflects the selected period; falls back to the 24h
  // change when period data hasn't loaded yet (e.g. first paint before refresh).
  const periodChange = (asset.periods && asset.periods[period] != null)
    ? asset.periods[period]
    : asset.change24h;

  useEffect(() => {
    if (!open || sparkData) return;
    setSparkLoading(true);
    fetch(apiUrl("/api/sparkline"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: asset.symbol, range: "5y" }),
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
      const res = await fetch(apiUrl("/api/update-notes"), {
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
          <div style={{ fontSize: 11, color: periodChange < 0 ? C.red : C.green, fontFamily: MONO, marginTop: 3, fontWeight: 500 }}>
            {periodChange > 0 ? "+" : ""}{periodChange}%
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

          {/* Sparkline — 5 year price chart */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 8 }}>5 YEAR PRICE</div>
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
                    <XAxis dataKey="t" hide />
                    <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sg-${asset.symbol})`} dot={false} isAnimationActive={false} />
                    <Tooltip
                      contentStyle={{ background: C.surfaceHigh, border: `1px solid ${C.borderHover}`, borderRadius: 6, padding: "6px 10px" }}
                      labelStyle={{ color: C.text3, fontSize: 9, fontFamily: MONO, marginBottom: 2 }}
                      itemStyle={{ color: C.text1, fontSize: 11, fontFamily: MONO }}
                      labelFormatter={(t) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      formatter={(value) => {
                        const n = Array.isArray(value) ? value[0] : value;
                        return [fmtUSD(typeof n === "number" ? n : Number(n)), "Price"];
                      }}
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
            {aiLoading==="thesis" && <div style={{ fontSize: 12, color: C.text3, fontFamily: "monospace", fontStyle: "italic" }}>Generating thesis...</div>}
            {asset.thesis && !aiLoading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {asset.thesis.split("\n").filter(l => l.trim()).map((line, i) => {
                  const isPos = line.trimStart().startsWith("+");
                  const isNeg = line.trimStart().startsWith("-");
                  const hasBullet = isPos || isNeg;
                  const text = hasBullet ? line.replace(/^[\s+\-]+/, "").trim() : line.trim();
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      {hasBullet && (
                        <span style={{ fontSize: 11, fontWeight: 300, color: isPos ? C.green : C.red, flexShrink: 0, marginTop: 2, opacity: 0.8, minWidth: 10 }}>
                          {isPos ? "+" : "−"}
                        </span>
                      )}
                      <span style={{ fontSize: 12, color: hasBullet ? (isPos ? "rgba(74,222,128,0.75)" : "rgba(248,113,113,0.75)") : C.text2, lineHeight: 1.65, fontFamily: FONT, fontWeight: 300 }}>{text}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {!asset.thesis && !aiLoading && (
              <div style={{ fontSize: 12, color: C.labelDim, fontStyle: "italic", fontFamily: "monospace" }}>Tap AI THESIS to generate a philosophy-aligned thesis →</div>
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
                  <span style={{ fontSize: 12, color: C.text3, fontFamily: "monospace" }}>Fetching market update...</span>
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
              <div style={{ fontSize: 12, color: C.labelDim, fontStyle: "italic", fontFamily: "monospace" }}>Tap AI UPDATE for today's market briefing →</div>
            )}
            {aiError && <div style={{ fontSize: 11, color: C.red, marginTop: 6, fontFamily: "monospace" }}>{aiError}</div>}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={() => onAlert(asset)} style={{ position: "relative", background: "transparent", border: `1px solid ${C.border}`, color: alertCount > 0 ? C.amber : C.text3, borderRadius: 6, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>
              🔔{alertCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: C.amber, color: "#08090a", borderRadius: "50%", width: 14, height: 14, fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontWeight: 700 }}>{alertCount}</span>}
            </button>
            <button onClick={() => onLogTrade(asset.symbol)} style={{ flex: 1, background: "transparent", border: `1px solid ${C.greenBorder}`, color: C.green, borderRadius: 6, padding: "8px 0", fontSize: 11, fontFamily: MONO, cursor: "pointer", letterSpacing: 1.5, textTransform: "uppercase" }}>+ Trade</button>
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
      <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 14, padding: 28, width: "100%", maxWidth: 500, maxHeight: "92vh", overflowY: "auto", boxSizing: "border-box" }}>
        <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 15, color: C.text1, marginBottom: 20, letterSpacing: 0.3 }}>{asset ? "Edit asset" : "Add asset"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 13 }}>
          <div><div style={LBL}>SYMBOL</div><input value={f.symbol} onChange={e => set("symbol", e.target.value.toUpperCase())} placeholder="HOOD" style={INP} /></div>
          <div><div style={LBL}>NAME</div><input value={f.name} onChange={e => set("name", e.target.value)} placeholder="Robinhood" style={INP} /></div>
        </div>
        <div style={{ marginBottom: 13 }}>
          <div style={LBL}>TYPE</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["stock","crypto","etf","commodity"].map(t => (
              <button key={t} onClick={() => set("type", t)} style={{ flex: 1, background: f.type===t?C.surfaceHigh:C.surface, border: `1px solid ${f.type===t?C.borderHover:C.border}`, color: f.type===t?C.text1:C.text3, borderRadius: 8, padding: "8px 0", fontSize: 11, fontFamily: MONO, cursor: "pointer", letterSpacing: 1 }}>{t.toUpperCase()}</button>
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
            <div style={{ fontSize: 10, color: C.labelDim, marginTop: 3, fontFamily: "monospace" }}>{"<30 oversold · >70 overbought"}</div>
          </div>
          {f.type === "crypto" ? (
            <div>
              <div style={LBL}>FEAR & GREED (0–100)</div>
              <input value={f.fearGreed} onChange={e => set("fearGreed", e.target.value)} type="number" placeholder="30" style={INP} />
              <div style={{ fontSize: 10, color: C.labelDim, marginTop: 3, fontFamily: "monospace" }}>{"<30 fear · >75 greed"}</div>
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
            <div style={{ fontSize: 10, color: C.labelMute, fontFamily: "monospace", letterSpacing: 2, marginBottom: 8 }}>AUTO SIGNAL PREVIEW</div>
            <SignalBadge sig={sig} />
            <div style={{ fontSize: 12, color: C.text3, marginTop: 6, fontStyle: "italic" }}>{sig.description}</div>
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {sig.reasons.map((r,i) => <span key={i} style={{ fontSize: 10, color: C.labelMute, fontFamily: "monospace", background: "rgba(0,255,157,0.05)", border: "1px solid rgba(0,255,157,0.1)", borderRadius: 4, padding: "2px 6px" }}>{r}</span>)}
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
      const res = await fetch(apiUrl("/api/search"), {
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
      const res = await fetch(apiUrl("/api/asset-details"), {
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

  const TYPE_COLOR = { stock: C.sigWatch, crypto: C.sigStrongBuy, etf: C.sigWait };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: "14px 14px 0 0", padding: "20px 18px 40px", width: "100%", maxWidth: 520, maxHeight: "85vh", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>

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
            style={{ ...INP, paddingLeft: 36, fontSize: 16 }}
          />
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.labelMute, fontSize: 14 }}>
            {searching ? "⟳" : "⌕"}
          </span>
        </div>

        {/* Results */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {error && <div style={{ fontSize: 12, color: C.red, fontFamily: "monospace", marginBottom: 10 }}>{error}</div>}

          {results.length === 0 && !searching && query.length > 0 && (
            <div style={{ textAlign: "center", color: C.labelDim, fontFamily: "monospace", fontSize: 12, padding: "30px 0" }}>NO RESULTS FOUND</div>
          )}

          {results.length === 0 && !query && (
            <div>
              <div style={{ marginBottom: 12, fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2 }}>POPULAR</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["BTC", "AMZN", "NVDA", "AAPL", "MSFT", "ETH", "TSLA", "GLD", "SLV"].map(s => (
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
function TradeModal({ watchlist, portfolio, onSave, onClose, defaultType = "buy", defaultSymbol = "", onAddCash }) {
  const [tradeType, setTradeType] = useState(defaultType);
  const [f, setF] = useState(() => {
    const match = watchlist.find(x => x.symbol === defaultSymbol);
    return { symbol: defaultSymbol || "", name: match?.name || "", price: "", units: "", fees: "", date: new Date().toISOString().slice(0,10), notes: "", brokerage: "" };
  });
  const [tradeCurrency, setTradeCurrency] = useState("USD");
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState(null);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const pick = (sym) => { const a = watchlist.find(x => x.symbol === sym); if (a) setF(p => ({ ...p, symbol: a.symbol, name: a.name })); else setF(p => ({ ...p, symbol: sym })); };
  const subtotal = (parseFloat(f.price)||0) * (parseFloat(f.units)||0);
  const fees = parseFloat(f.fees)||0;
  const total = tradeType === "buy" ? subtotal + fees : subtotal - fees;
  const SML = { ...INP, padding: "9px 10px", fontSize: 16 };
  const LBL2 = { ...LBL, marginBottom: 3 };
  const isBuy = tradeType === "buy";
  const accent = isBuy ? C.accentBuy : C.accentSell;
  // Previously-used brokerage names, most recent first, for the autocomplete suggestions
  const knownBrokerages = [...new Set((portfolio || []).filter(t => t.brokerage).sort((a,b) => new Date(b.date)-new Date(a.date)).map(t => t.brokerage))];

  const handleSave = async () => {
    let priceUSD = parseFloat(f.price) || 0;
    let feesUSD = parseFloat(f.fees) || 0;

    if (tradeCurrency !== "USD") {
      setConverting(true);
      setConvertError(null);
      try {
        const res = await fetch(`/api/fx-historical?date=${f.date}&currency=${tradeCurrency}`);
        const data = await res.json();
        if (data?.rate) {
          // data.rate is USD -> tradeCurrency, so divide to go the other way
          priceUSD = priceUSD / data.rate;
          feesUSD = feesUSD / data.rate;
        } else {
          setConvertError("Could not fetch exchange rate — trade not saved");
          setConverting(false);
          return;
        }
      } catch (e) {
        setConvertError("Could not fetch exchange rate — trade not saved");
        setConverting(false);
        return;
      }
      setConverting(false);
    }

    if (tradeType === "dividend") {
      onSave({
        id: Date.now(), type: "dividend", symbol: f.symbol.toUpperCase().trim(), name: f.name,
        amount: priceUSD, units: 0, fees: 0,
        date: f.date, notes: f.notes, brokerage: f.brokerage || "",
        ...(tradeCurrency !== "USD" ? { originalCurrency: tradeCurrency, originalAmount: parseFloat(f.price) || 0 } : {}),
      });
      return;
    }

    onSave({
      id: Date.now(), type: tradeType, symbol: f.symbol.toUpperCase().trim(), name: f.name,
      price: priceUSD, units: parseFloat(f.units) || 0, fees: feesUSD,
      date: f.date, notes: f.notes, brokerage: f.brokerage || "", total: tradeType === "buy" ? (priceUSD * (parseFloat(f.units)||0) + feesUSD) : (priceUSD * (parseFloat(f.units)||0) - feesUSD),
      ...(tradeCurrency !== "USD" ? { originalCurrency: tradeCurrency, originalPrice: parseFloat(f.price) || 0 } : {}),
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}>
      <style>{`
        input[type="date"]::-webkit-date-and-time-value { text-align: left; }
      `}</style>
      <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: "14px 14px 0 0", padding: "20px 18px 32px", width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto", boxSizing: "border-box" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {["buy","sell","dividend"].map(t => (
              <button key={t} onClick={() => setTradeType(t)} style={{ background: tradeType===t?C.surface:"transparent", border:`1px solid ${tradeType===t?C.borderHover:C.border}`, color:tradeType===t?C.text1:C.text3, borderRadius:4, padding:"6px 16px", fontSize:11, fontFamily:FONT, fontWeight:300, cursor:"pointer", letterSpacing:0.3 }}>
                {t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.text3, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        {/* Asset dropdown */}
        <div style={{ marginBottom: 12 }}>
          <div style={LBL2}>ASSET</div>
          <select
            value={watchlist.find(x => x.symbol === f.symbol) ? f.symbol : ""}
            onChange={e => {
              if (e.target.value === "__other__") { setF(p => ({ ...p, symbol: "", name: "" })); }
              else if (e.target.value === "__cash__") { onAddCash(); onClose(); }
              else { pick(e.target.value); }
            }}
            style={{ ...SML, background: C.surfaceHigh, cursor: "pointer" }}
          >
            <option value="" disabled>Select an asset...</option>
            {watchlist.map(a => (
              <option key={a.symbol} value={a.symbol}>{a.symbol} — {a.name}</option>
            ))}
            <option value="__other__">Other (enter manually)</option>
            <option value="__cash__">💰 Cash deposit</option>
          </select>

          {/* Manual entry shown only when "Other" selected or symbol not in watchlist */}
          {(!watchlist.find(x => x.symbol === f.symbol)) && (
            <input
              value={f.symbol}
              onChange={e => pick(e.target.value.toUpperCase())}
              placeholder="Enter ticker symbol"
              style={{ ...SML, marginTop: 8 }}
            />
          )}
        </div>

        {tradeType === "dividend" ? (
          <>
            {/* Dividend amount + currency — full width row */}
            <div style={{ marginBottom: 8 }}>
              <div style={LBL2}>DIVIDEND AMOUNT (TOTAL CASH RECEIVED)</div>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={f.price} onChange={e => set("price", e.target.value)} type="number" placeholder="0.00" style={{ ...SML, flex: 1, minWidth: 0 }} />
                <select value={tradeCurrency} onChange={e => setTradeCurrency(e.target.value)}
                  style={{ ...SML, width: 88, padding: "9px 8px", fontSize: 13, background: C.surfaceHigh, cursor: "pointer", flexShrink: 0 }}>
                  {Object.keys(CURRENCY_SYMBOLS).map(cur => (
                    <option key={cur} value={cur}>{cur}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 8 }}>
              <div style={LBL2}>DATE PAID</div>
              <input value={f.date} onChange={e => set("date", e.target.value)} type="date" style={{ ...SML, colorScheme: "dark", textAlign: "left" }} />
            </div>

            {tradeCurrency !== "USD" && (
              <div style={{ fontSize: 10, color: C.text3, fontFamily: FONT, fontWeight: 300, marginBottom: 10, fontStyle: "italic" }}>
                Entered in {CURRENCY_NAMES[tradeCurrency] || tradeCurrency} — will be converted to USD using the exchange rate on {f.date}.
              </div>
            )}

            {(parseFloat(f.price) || 0) > 0 && (
              <div style={{ background: C.greenDim, border: `1px solid ${C.greenBorder}`, borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 13 }}>
                  <span style={{ color: C.labelMute }}>DIVIDEND RECEIVED</span>
                  <span style={{ color: C.green, fontWeight: 800 }}>+{CURRENCY_SYMBOLS[tradeCurrency] || ""}{(parseFloat(f.price) || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
        {/* Price + currency — full width row */}
        <div style={{ marginBottom: 8 }}>
          <div style={LBL2}>{isBuy?"BUY":"SELL"} PRICE</div>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={f.price} onChange={e => set("price", e.target.value)} type="number" placeholder="0.00" style={{ ...SML, flex: 1, minWidth: 0 }} />
            <select value={tradeCurrency} onChange={e => setTradeCurrency(e.target.value)}
              style={{ ...SML, width: 88, padding: "9px 8px", fontSize: 13, background: C.surfaceHigh, cursor: "pointer", flexShrink: 0 }}>
              {Object.keys(CURRENCY_SYMBOLS).map(cur => (
                <option key={cur} value={cur}>{cur}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Units / Date */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <div><div style={LBL2}>UNITS</div><input value={f.units} onChange={e => set("units", e.target.value)} type="number" placeholder="0" style={SML} /></div>
          <div><div style={LBL2}>DATE</div><input value={f.date} onChange={e => set("date", e.target.value)} type="date" style={{ ...SML, colorScheme: "dark", textAlign: "left" }} /></div>
        </div>

        {tradeCurrency !== "USD" && (
          <div style={{ fontSize: 10, color: C.text3, fontFamily: FONT, fontWeight: 300, marginBottom: 10, fontStyle: "italic" }}>
            Entered in {CURRENCY_NAMES[tradeCurrency] || tradeCurrency} — will be converted to USD using the exchange rate on {f.date}.
          </div>
        )}

        {/* Fees */}
        <div style={{ marginBottom: 10 }}>
          <div style={LBL2}>BROKERAGE FEE <span style={{ color: C.labelDim }}>(optional, same currency as above)</span></div>
          <input value={f.fees} onChange={e => set("fees", e.target.value)} type="number" placeholder="0.00" style={{ ...SML, width: "50%" }} />
        </div>

        {/* Summary pill */}
        {subtotal > 0 && (
          <div style={{ background: isBuy?"rgba(0,255,157,0.06)":"rgba(245,166,35,0.06)", border: `1px solid ${isBuy?"rgba(0,255,157,0.15)":"rgba(245,166,35,0.15)"}`, borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 12, marginBottom: fees>0?4:0 }}>
              <span style={{ color: C.labelMute }}>SUBTOTAL</span>
              <span style={{ color: C.textSoft }}>{CURRENCY_SYMBOLS[tradeCurrency] || ""}{subtotal.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
            </div>
            {fees > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: C.labelMute }}>FEES</span>
              <span style={{ color: C.red }}>+{CURRENCY_SYMBOLS[tradeCurrency] || ""}{fees.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
            </div>}
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 13, borderTop: fees>0?"1px solid rgba(255,255,255,0.06)":"none", paddingTop: fees>0?4:0 }}>
              <span style={{ color: C.labelMute }}>{isBuy?"TOTAL COST":"NET PROCEEDS"}</span>
              <span style={{ color: accent, fontWeight: 800 }}>{CURRENCY_SYMBOLS[tradeCurrency] || ""}{total.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
            </div>
          </div>
        )}
          </>
        )}

        {/* Brokerage */}
        <div style={{ marginBottom: 12 }}>
          <div style={LBL2}>BROKERAGE <span style={{ color: C.labelDim }}>(optional)</span></div>
          <input
            value={f.brokerage}
            onChange={e => set("brokerage", e.target.value)}
            list="brokerage-suggestions"
            placeholder="e.g. Robinhood, IBKR, CommSec..."
            style={SML}
          />
          <datalist id="brokerage-suggestions">
            {knownBrokerages.map(b => <option key={b} value={b} />)}
          </datalist>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 14 }}>
          <div style={LBL2}>NOTES <span style={{ color: C.labelDim }}>(optional)</span></div>
          <textarea value={f.notes} onChange={e => set("notes", e.target.value)} rows={2} placeholder={tradeType === "dividend" ? "e.g. Quarterly dividend" : isBuy?"Why I bought this dip...":"Why I'm taking profit / cutting loss..."} style={{ ...SML, resize: "none", width: "100%" }} />
        </div>

        {convertError && <div style={{ fontSize: 11, color: C.red, fontFamily: FONT, fontWeight: 300, marginBottom: 10 }}>{convertError}</div>}

        <button onClick={handleSave} disabled={converting}
          style={{ width: "100%", background: C.surface, border: `1px solid ${C.borderHover}`, color: C.text1, borderRadius: 8, padding: "13px 0", fontSize: 12, fontFamily: FONT, fontWeight: 300, cursor: converting ? "default" : "pointer", letterSpacing: 0.5, opacity: converting ? 0.6 : 1 }}>
          {converting ? "Converting..." : tradeType === "dividend" ? "Log dividend" : `Log ${tradeType}`}
        </button>
      </div>
    </div>
  );
}

// ─── EDIT TRADE MODAL ────────────────────────────────────────────────────────
function EditTradeModal({ trade, portfolio, onSave, onClose }) {
  const [f, setF] = useState({
    price: trade.price,
    units: trade.units,
    fees: trade.fees || 0,
    date: trade.date,
    notes: trade.notes || "",
    brokerage: trade.brokerage || "",
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const subtotal = (parseFloat(f.price)||0) * (parseFloat(f.units)||0);
  const fees = parseFloat(f.fees)||0;
  const total = trade.type === "buy" ? subtotal + fees : subtotal - fees;
  const SML = { ...INP, padding: "9px 10px", fontSize: 16 };
  const LBL2 = { ...LBL, marginBottom: 3 };
  const accent = trade.type === "buy" ? C.accentBuy : C.accentSell;
  const knownBrokerages = [...new Set((portfolio || []).filter(t => t.brokerage).sort((a,b) => new Date(b.date)-new Date(a.date)).map(t => t.brokerage))];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 300 }}>
      <style>{`
        input[type="date"]::-webkit-date-and-time-value { text-align: left; }
      `}</style>
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
          <div><div style={LBL2}>DATE</div><input value={f.date} onChange={e => set("date", e.target.value)} type="date" style={{ ...SML, colorScheme: "dark", textAlign: "left" }} /></div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={LBL2}>BROKERAGE FEE</div>
          <input value={f.fees} onChange={e => set("fees", e.target.value)} type="number" style={{ ...SML, width: "50%" }} />
        </div>

        {/* Summary */}
        {subtotal > 0 && (
          <div style={{ background: `${accent}08`, border: `1px solid ${accent}20`, borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontFamily: "monospace", fontSize: 12, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: C.labelMute }}>{trade.type === "buy" ? "TOTAL COST" : "NET PROCEEDS"}</span>
            <span style={{ color: accent, fontWeight: 800 }}>{fmtUSD(total)}</span>
          </div>
        )}

        <div style={{ marginBottom: 10 }}>
          <div style={LBL2}>BROKERAGE <span style={{ color: C.labelDim }}>(where this trade was placed, optional)</span></div>
          <input value={f.brokerage} onChange={e => set("brokerage", e.target.value)} list="brokerage-suggestions-edit" placeholder="e.g. Robinhood, IBKR, CommSec..." style={SML} />
          <datalist id="brokerage-suggestions-edit">
            {knownBrokerages.map(b => <option key={b} value={b} />)}
          </datalist>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={LBL2}>NOTES</div>
          <textarea value={f.notes} onChange={e => set("notes", e.target.value)} rows={2} style={{ ...SML, resize: "none", width: "100%" }} />
        </div>

        <button onClick={() => onSave({ ...trade, price: parseFloat(f.price)||0, units: parseFloat(f.units)||0, fees: parseFloat(f.fees)||0, date: f.date, notes: f.notes, brokerage: f.brokerage || "", total })}
          style={{ width: "100%", background: C.surface, border: `1px solid ${C.borderHover}`, color: C.text1, borderRadius: 8, padding: "13px 0", fontSize: 12, fontFamily: FONT, fontWeight: 300, cursor: "pointer" }}>
          Save changes
        </button>
      </div>
    </div>
  );
}

// ─── INSIGHTS TAB ────────────────────────────────────────────────────────────
function InsightsTab({ portfolio, watchlist, positionSummaries, period, setPeriod, spyPeriodData, getLivePrice, cashAccounts, priceHistoryBySymbol, priceHistoryLoading, benchmarkData, selectedBenchmark, setSelectedBenchmark }) {

  // Period days mapping
  const periodDays = { daily: 1, weekly: 7, monthly: 30 };
  const days = periodDays[period];

  // Look up a symbol's price N days ago, walking backward up to 5 days to cover
  // weekends/holidays when the market was closed (same approach used for the
  // Portfolio tab's historical P&L chart).
  const getPriceDaysAgo = (sym, daysAgo) => {
    const hist = priceHistoryBySymbol?.[sym];
    if (!hist) return null;
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    for (let i = 0; i < 6; i++) {
      const dateStr = d.toISOString().slice(0, 10);
      if (hist[dateStr] != null) return hist[dateStr];
      d.setDate(d.getDate() - 1);
    }
    return null;
  };

  const hasHistory = priceHistoryBySymbol && Object.keys(priceHistoryBySymbol).length > 0;

  // Per-position period change — units held now valued at (price now) vs (price N days ago),
  // plus any dividends actually paid within the selected period (a real cash gain, distinct
  // from price movement, so it's added on top rather than baked into the price-based figure).
  // Falls back to all-time unrealised P&L for a symbol if no historical price is available yet,
  // so the page still shows sensible numbers while history is loading rather than zeroing out.
  const cutoffDateStr = (() => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10); })();
  const periodPerformers = positionSummaries.map(({ sym, pos }) => {
    const priceNow = getLivePrice ? getLivePrice(sym) : null;
    const priceAgo = getPriceDaysAgo(sym, days);
    const dividendsInPeriod = portfolio.filter(t => t.symbol === sym && t.type === "dividend" && t.date >= cutoffDateStr).reduce((s, t) => s + (t.amount || 0), 0);
    if (priceAgo != null && priceNow != null && pos.unitsHeld > 0) {
      const valueNow = priceNow * pos.unitsHeld;
      const valueAgo = priceAgo * pos.unitsHeld;
      const periodPnl = valueNow - valueAgo + dividendsInPeriod;
      const periodPct = valueAgo > 0 ? (periodPnl / valueAgo) * 100 : 0;
      return { sym, pct: periodPct, pnl: periodPnl };
    }
    // No historical price yet — fall back to all-time figures rather than showing nothing
    return { sym, pct: pos.unrealisedPct, pnl: pos.unrealisedPnl + dividendsInPeriod };
  });

  // Cash accounts: interest accrued specifically within the period (not all-time)
  const cashPeriodPerformers = (cashAccounts || []).map(a => {
    const calcNow = calcCashValue(a);
    const startDate = new Date(a.startDate);
    const daysRunningNow = Math.max(0, Math.floor((new Date() - startDate) / (1000*60*60*24)));
    const daysRunningAgo = Math.max(0, daysRunningNow - days);
    const rate = (a.rate || 0) / 100;
    const valueAgo = a.principal * Math.pow(1 + rate/365, daysRunningAgo);
    const periodInterest = calcNow.currentValue - valueAgo;
    const periodPct = valueAgo > 0 ? (periodInterest / valueAgo) * 100 : 0;
    return { sym: a.institution, pct: periodPct, pnl: periodInterest };
  });

  // Overall period P&L — real change in value over the selected window, not all-time P&L
  const totalPeriodPnl = periodPerformers.reduce((s, p) => s + p.pnl, 0) + cashPeriodPerformers.reduce((s, p) => s + p.pnl, 0);
  const periodValueAgoTotal = positionSummaries.reduce((s, {sym, pos}) => {
    const priceAgo = getPriceDaysAgo(sym, days);
    return s + (priceAgo != null ? priceAgo * pos.unitsHeld : pos.costBasis);
  }, 0) + (cashAccounts || []).reduce((s, a) => {
    const startDate = new Date(a.startDate);
    const daysRunningNow = Math.max(0, Math.floor((new Date() - startDate) / (1000*60*60*24)));
    const daysRunningAgo = Math.max(0, daysRunningNow - days);
    const rate = (a.rate || 0) / 100;
    return s + a.principal * Math.pow(1 + rate/365, daysRunningAgo);
  }, 0);
  const totalPeriodPnlPct = periodValueAgoTotal > 0 ? (totalPeriodPnl / periodValueAgoTotal) * 100 : 0;

  // Filter trades within period
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const periodTrades = portfolio.filter(t => t.date >= cutoffStr);

  // Overall P&L — includes cash interest as "growth"
  const cashTotalValue = (cashAccounts || []).reduce((s, a) => s + calcCashValue(a).currentValue, 0);
  const cashTotalPrincipal = (cashAccounts || []).reduce((s, a) => s + a.principal, 0);
  const totalInvested = positionSummaries.reduce((s, {pos}) => s + pos.costBasis, 0) + cashTotalPrincipal;
  const totalValue = positionSummaries.reduce((s, {pos}) => s + pos.currentValue, 0) + cashTotalValue;
  const totalPnl = totalPeriodPnl;
  const totalPnlPct = totalPeriodPnlPct;

  // Best / worst performer — now reflects the selected period's actual change, not all-time
  const performers = [
    ...periodPerformers,
    ...cashPeriodPerformers,
  ].sort((a, b) => b.pct - a.pct);
  const best = performers[0] || null;
  const worst = performers[performers.length - 1] || null;

  // Win rate — now reflects how many holdings were up over the selected period specifically
  const totalHoldings = positionSummaries.length + (cashAccounts?.length || 0);
  const winners = periodPerformers.filter(p => p.pnl > 0).length + cashPeriodPerformers.filter(p => p.pnl > 0).length;
  const winRate = totalHoldings > 0 ? (winners / totalHoldings) * 100 : 0;

  // Asset class breakdown — include cash
  const assetClasses = {};
  if (cashAccounts && cashAccounts.length > 0) {
    const cashVal = cashAccounts.reduce((s, a) => s + calcCashValue(a).currentValue, 0);
    const cashCost = cashAccounts.reduce((s, a) => s + a.principal, 0);
    assetClasses["cash"] = {
      pnl: cashVal - cashCost,
      value: cashVal,
      cost: cashCost,
      assets: cashAccounts.map(a => {
        const c = calcCashValue(a);
        return { sym: a.institution, pct: (c.accruedInterest / a.principal) * 100, pnl: c.accruedInterest };
      }),
    };
  }
  positionSummaries.forEach(({sym, pos}) => {
    const asset = watchlist.find(a => a.symbol === sym);
    const type = asset?.type || "stock";
    if (!assetClasses[type]) assetClasses[type] = { pnl: 0, value: 0, cost: 0, assets: [] };
    assetClasses[type].pnl += pos.unrealisedPnl;
    assetClasses[type].value += pos.currentValue;
    assetClasses[type].cost += pos.costBasis;
    assetClasses[type].assets.push({ sym, pct: pos.unrealisedPct, pnl: pos.unrealisedPnl });
  });

  const classColors = { crypto: C.amber, stock: C.blue, etf: C.green, cash: "#a8e6cf", commodity: "#fbbf24" };
  const classLabels = { crypto: "Crypto", stock: "Stocks", etf: "ETFs", cash: "Cash", commodity: "Commodities" };

  // S&P period return matching current toggle
  const BENCHMARK_LABELS = { SPY: "S&P 500", QQQ: "Nasdaq 100", BTC: "Bitcoin", GLD: "Gold" };
  const benchmarkLabel = BENCHMARK_LABELS[selectedBenchmark] || selectedBenchmark;
  const spyChange = benchmarkData?.[selectedBenchmark]?.[period] ?? null;

  // Bar chart data for asset classes
  const barData = Object.entries(assetClasses).map(([type, data]) => ({
    name: classLabels[type] || type,
    pct: data.cost > 0 ? parseFloat(((data.pnl / data.cost) * 100).toFixed(2)) : 0,
    color: classColors[type] || C.blue,
  }));

  // Add benchmarks to bar chart
  if (spyChange !== null) barData.push({ name: benchmarkLabel, pct: spyChange, color: C.text3, isBenchmark: true });

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
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {["daily","weekly","monthly"].map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ flex: 1, background: period===p?C.surfaceHigh:"transparent", border: `1px solid ${period===p?C.borderHover:C.border}`, color: period===p?C.text1:C.text3, borderRadius: 6, padding: "8px 0", fontSize: 11, fontFamily: FONT, fontWeight: period===p?500:300, cursor: "pointer", letterSpacing: 0.3, textTransform: "capitalize" }}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>
      {priceHistoryLoading && !hasHistory && (
        <div style={{ fontSize: 10, color: C.text3, fontFamily: FONT, fontWeight: 300, fontStyle: "italic", marginBottom: 12 }}>
          Loading historical prices — figures below will refine once ready
        </div>
      )}

      {positionSummaries.length === 0 && cashAccounts.length === 0 ? (
        <div style={{ textAlign: "center", color: C.text3, fontFamily: FONT, fontWeight: 300, fontSize: 13, padding: "60px 0" }}>
          No portfolio data yet<br/><span style={{ fontSize: 11, opacity: 0.6 }}>Add trades to see insights</span>
        </div>
      ) : (
        <>
          {/* Overall P&L */}
          <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 10 }}>{period.toUpperCase()} P&L</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 28, color: totalPnl >= 0 ? C.green : C.red, letterSpacing: -1 }}>
                  {totalPnl >= 0 ? "+" : ""}{fmtUSD(totalPnl)}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: totalPnl >= 0 ? "rgba(61,220,132,0.7)" : "rgba(255,107,107,0.7)", marginTop: 3 }}>
                  {totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(2)}% this {period === "daily" ? "day" : period === "weekly" ? "week" : "month"}
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

          {/* Ranked performance list */}
          {(() => {
            const [rankView, setRankView] = React.useState("pct");

            // Build ranked list — all assets + cash + S&P benchmark, all sorted together
            const allItems = [
              ...periodPerformers.map(p => {
                const asset = watchlist.find(a => a.symbol === p.sym);
                return { sym: p.sym, type: asset?.type || "stock", pct: p.pct, pnl: p.pnl, isBenchmark: false };
              }),
              ...cashPeriodPerformers.map(p => ({ sym: p.sym, type: "cash", pct: p.pct, pnl: p.pnl, isBenchmark: false })),
              ...(spyChange !== null ? [{ sym: benchmarkLabel, type: "index", pct: spyChange, pnl: null, isBenchmark: true }] : []),
            ];
            const ranked = allItems.sort((a, b) => rankView === "pct" ? b.pct - a.pct : b.pnl - a.pnl);

            return (
              <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
                {/* Header + toggle */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2 }}>PERFORMANCE RANKING</div>
                  <div style={{ display: "flex", background: C.surfaceHigh, borderRadius: 6, padding: 2, border: `1px solid ${C.border}` }}>
                    {[["pct", "%"], ["pnl", "$"]].map(([v, label]) => (
                      <button key={v} onClick={e => { e.stopPropagation(); setRankView(v); }}
                        style={{ background: rankView===v?C.borderHover:"transparent", border: "none", color: rankView===v?C.text1:C.text3, borderRadius: 4, padding: "3px 10px", fontSize: 11, fontFamily: MONO, cursor: "pointer", letterSpacing: 1, transition: "all 0.15s" }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ranked rows */}
                {ranked.map((item, i) => {
                  const isUp = item.pct >= 0;
                  const typeColor = { crypto: C.amber, stock: C.blue, etf: C.green, benchmark: C.text3, cash: "#a8e6cf", commodity: "#fbbf24" };
                  return (
                    <div key={item.sym} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < ranked.length - 1 ? `1px solid ${C.border}` : "none" }}>
                      {/* Rank number */}
                      <div style={{ width: 18, fontSize: 10, color: C.text3, fontFamily: MONO, textAlign: "center", flexShrink: 0 }}>
                        {i + 1}
                      </div>

                      {/* Asset logo or benchmark icon */}
                      {item.isBenchmark
                        ? <div style={{ width: 32, height: 32, borderRadius: 8, background: C.surfaceHigh, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: C.text3, fontFamily: MONO, flexShrink: 0 }}>{selectedBenchmark}</div>
                        : item.type === "cash"
                          ? <div style={{ width: 32, height: 32, borderRadius: 8, background: C.greenDim, border: `1px solid ${C.greenBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>💰</div>
                          : <AssetLogo symbol={item.sym} size={32} />
                      }

                      {/* Name + type tag */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: FONT, fontWeight: 400, fontSize: 14, color: item.isBenchmark ? C.text3 : C.text1 }}>{item.sym}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                          <span style={{ fontSize: 9, color: typeColor[item.type] || C.text3, fontFamily: MONO, letterSpacing: 1 }}>
                            {item.isBenchmark ? "BENCHMARK" : item.type.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Performance value */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 16, color: isUp ? C.green : C.red, letterSpacing: -0.3 }}>
                          {rankView === "pct"
                            ? `${isUp ? "+" : ""}${item.pct.toFixed(2)}%`
                            : item.pnl !== null ? `${item.pnl >= 0 ? "+" : ""}${fmtUSD(item.pnl)}` : "—"
                          }
                        </div>
                        {rankView === "pct" && item.pnl !== null && (
                          <div style={{ fontSize: 10, color: isUp ? "rgba(61,220,132,0.6)" : "rgba(255,107,107,0.6)", fontFamily: MONO, marginTop: 1 }}>
                            {item.pnl >= 0 ? "+" : ""}{fmtUSD(item.pnl)}
                          </div>
                        )}
                        {rankView === "pnl" && (
                          <div style={{ fontSize: 10, color: C.text3, fontFamily: MONO, marginTop: 1 }}>
                            {item.pct >= 0 ? "+" : ""}{item.pct.toFixed(2)}%
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* vs Benchmark */}
          {spyChange !== null && (
            <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2 }}>VS BENCHMARK · {period.toUpperCase()}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {Object.keys(BENCHMARK_LABELS).map(b => (
                    <button key={b} onClick={() => setSelectedBenchmark(b)}
                      style={{ background: selectedBenchmark===b?C.surfaceHigh:"transparent", border:`1px solid ${selectedBenchmark===b?C.borderHover:C.border}`, color:selectedBenchmark===b?C.text1:C.text3, borderRadius:4, padding:"3px 8px", fontSize:9, fontFamily:MONO, fontWeight:300, cursor:"pointer", letterSpacing:0.5 }}>
                      {b}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 4 }}>YOUR PORTFOLIO</div>
                  <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 22, color: totalPnlPct >= 0 ? C.green : C.red, letterSpacing: -0.5 }}>
                    {totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 4 }}>{benchmarkLabel.toUpperCase()} ({period.toUpperCase()})</div>
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
                      {beating ? "↑" : "↓"} {Math.abs(diff).toFixed(2)}% {beating ? "ahead of" : "behind"} {benchmarkLabel}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Dividend Calendar & Income Forecast */}
          {(() => {
            const allDividends = portfolio.filter(t => t.type === "dividend");
            if (allDividends.length === 0) return null;

            const today = new Date();
            const twelveMonthsAgo = new Date(today);
            twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

            // Trailing 12-month income, grouped by month
            const monthBuckets = {};
            for (let i = 11; i >= 0; i--) {
              const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
              const key = d.toISOString().slice(0, 7); // YYYY-MM
              monthBuckets[key] = 0;
            }
            allDividends.forEach(div => {
              const divDate = new Date(div.date);
              if (divDate >= twelveMonthsAgo) {
                const key = div.date.slice(0, 7);
                if (monthBuckets[key] !== undefined) monthBuckets[key] += div.amount || 0;
              }
            });
            const trailing12moTotal = Object.values(monthBuckets).reduce((s, v) => s + v, 0);

            // Income by position, trailing 12 months
            const incomeBySymbol = {};
            allDividends.forEach(div => {
              if (new Date(div.date) >= twelveMonthsAgo) {
                incomeBySymbol[div.symbol] = (incomeBySymbol[div.symbol] || 0) + (div.amount || 0);
              }
            });
            const topIncomeSymbols = Object.entries(incomeBySymbol).sort((a, b) => b[1] - a[1]);

            // Forecast next 12 months
            const { forecast, frequencies } = forecastDividends(allDividends, 12);
            const forecastTotal = forecast.reduce((s, f) => s + f.amount, 0);
            const forecastByMonth = {};
            for (let i = 0; i < 12; i++) {
              const d = new Date(today.getFullYear(), today.getMonth() + i + 1, 1);
              const key = d.toISOString().slice(0, 7);
              forecastByMonth[key] = 0;
            }
            forecast.forEach(f => {
              const key = f.date.slice(0, 7);
              if (forecastByMonth[key] !== undefined) forecastByMonth[key] += f.amount;
            });

            const monthChartData = Object.entries(monthBuckets).map(([key, val]) => ({
              month: new Date(key + "-01").toLocaleDateString("en-US", { month: "short" }),
              amount: parseFloat(val.toFixed(2)),
            }));
            const forecastChartData = Object.entries(forecastByMonth).map(([key, val]) => ({
              month: new Date(key + "-01").toLocaleDateString("en-US", { month: "short" }),
              amount: parseFloat(val.toFixed(2)),
            }));

            const upcomingForecast = forecast
              .filter(f => new Date(f.date) >= today)
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .slice(0, 8);

            return (
              <>
                {/* Trailing 12mo income */}
                <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
                  <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 10 }}>DIVIDEND INCOME · LAST 12 MONTHS</div>
                  <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 26, color: C.green, letterSpacing: -0.5, marginBottom: 14 }}>
                    {fmtUSD(trailing12moTotal)}
                  </div>
                  <ResponsiveContainer width="100%" height={80}>
                    <BarChart data={monthChartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                      <XAxis dataKey="month" tick={{ fontSize: 8, fill: C.text3, fontFamily: MONO }} axisLine={false} tickLine={false} interval={1} />
                      <Bar dataKey="amount" radius={[2, 2, 0, 0]} fill={C.green} fillOpacity={0.75} />
                      <Tooltip
                        contentStyle={{ background: C.surfaceHigh, border: `1px solid ${C.borderHover}`, borderRadius: 6, padding: "4px 8px" }}
                        labelStyle={{ color: C.text3, fontSize: 9, fontFamily: MONO }}
                        itemStyle={{ color: C.green, fontSize: 11, fontFamily: MONO }}
                        formatter={v => [fmtUSD(v), "Received"]}
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Income by position */}
                {topIncomeSymbols.length > 0 && (
                  <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
                    <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 12 }}>INCOME BY POSITION · LAST 12 MONTHS</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {topIncomeSymbols.map(([sym, amount]) => (
                        <div key={sym} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <AssetLogo symbol={sym} size={24} />
                            <span style={{ fontFamily: FONT, fontWeight: 300, fontSize: 13, color: C.text1 }}>{sym}</span>
                            {frequencies[sym]?.label && (
                              <span style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 0.5 }}>{frequencies[sym].label}</span>
                            )}
                          </div>
                          <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: 13, color: C.green }}>+{fmtUSD(amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Forecast */}
                {forecast.length > 0 && (
                  <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
                    <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 10 }}>FORECASTED INCOME · NEXT 12 MONTHS</div>
                    <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 26, color: C.text1, letterSpacing: -0.5, marginBottom: 4 }}>
                      {fmtUSD(forecastTotal)}
                    </div>
                    <div style={{ fontSize: 10, color: C.text3, fontFamily: FONT, fontWeight: 300, fontStyle: "italic", marginBottom: 14 }}>
                      Estimate based on each position's historical payment pattern — not guaranteed
                    </div>
                    <ResponsiveContainer width="100%" height={80}>
                      <BarChart data={forecastChartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                        <XAxis dataKey="month" tick={{ fontSize: 8, fill: C.text3, fontFamily: MONO }} axisLine={false} tickLine={false} interval={1} />
                        <Bar dataKey="amount" radius={[2, 2, 0, 0]} fill={C.text2} fillOpacity={0.6} />
                        <Tooltip
                          contentStyle={{ background: C.surfaceHigh, border: `1px solid ${C.borderHover}`, borderRadius: 6, padding: "4px 8px" }}
                          labelStyle={{ color: C.text3, fontSize: 9, fontFamily: MONO }}
                          itemStyle={{ color: C.text1, fontSize: 11, fontFamily: MONO }}
                          formatter={v => [fmtUSD(v), "Forecast"]}
                          cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        />
                      </BarChart>
                    </ResponsiveContainer>

                    {upcomingForecast.length > 0 && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 10 }}>NEXT PAYMENTS</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                          {upcomingForecast.map((f, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontFamily: MONO, fontSize: 10, color: C.text3 }}>{new Date(f.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                                <span style={{ fontFamily: FONT, fontWeight: 300, fontSize: 12, color: C.text2 }}>{f.symbol}</span>
                              </div>
                              <span style={{ fontFamily: FONT, fontWeight: 300, fontSize: 12, color: C.text2 }}>~{fmtUSD(f.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}

// ─── CASH HELPERS ────────────────────────────────────────────────────────────
// ─── PROPERTY CALCULATION ENGINE ───────────────────────────────────────────────
// Amortization: figures out today's loan balance given the original principal,
// rate, repayment amount/frequency, and how much time has passed since the loan
// started. Each payment period, interest accrues on the current balance, and
// whatever's left of the payment after interest reduces the principal.
function calcPropertyValue(property) {
  const purchasePrice = property.purchasePrice || 0;
  const currentValue = property.currentValue || purchasePrice;
  const originalLoan = property.loanPrincipal || 0;
  const rate = (property.interestRate || 0) / 100;
  const repayment = property.repaymentAmount || 0;
  const freq = property.repaymentFrequency || "monthly"; // weekly | fortnightly | monthly
  const periodsPerYear = freq === "weekly" ? 52 : freq === "fortnightly" ? 26 : 12;
  const startDate = new Date(property.loanStartDate || property.purchaseDate || Date.now());
  const today = new Date();
  const daysElapsed = Math.max(0, Math.floor((today - startDate) / (1000 * 60 * 60 * 24)));
  const periodsElapsed = Math.floor(daysElapsed / (365 / periodsPerYear));

  // Walk the amortization schedule forward period-by-period to find today's balance.
  // (A closed-form formula exists, but the iterative walk is simpler to verify and
  // naturally floors the balance at 0 if the loan would already be paid off.)
  let balance = originalLoan;
  if (originalLoan > 0 && repayment > 0) {
    const periodRate = rate / periodsPerYear;
    for (let i = 0; i < periodsElapsed && balance > 0; i++) {
      const interestThisPeriod = balance * periodRate;
      const principalThisPeriod = Math.max(0, repayment - interestThisPeriod);
      balance = Math.max(0, balance - principalThisPeriod);
    }
  } else if (originalLoan > 0 && repayment === 0) {
    // No repayment entered yet — balance stays at original principal (interest-only view)
    balance = originalLoan;
  }

  const loanPrincipalOwing = balance;
  const netEquity = currentValue - loanPrincipalOwing;
  const totalCapitalGain = currentValue - purchasePrice;

  // Project forward from today's balance to estimate the loan completion date —
  // continue the same period-by-period amortization walk until the balance hits zero.
  let estimatedPayoffDate = null;
  let payoffNeverHappens = false;
  if (originalLoan > 0 && repayment > 0 && loanPrincipalOwing > 0) {
    const periodRate = rate / periodsPerYear;
    const minViablePayment = loanPrincipalOwing * periodRate;
    if (repayment <= minViablePayment) {
      // Repayment doesn't even cover the interest accruing — balance would grow forever, not shrink
      payoffNeverHappens = true;
    } else {
      let projBalance = loanPrincipalOwing;
      let periodsToPayoff = 0;
      const maxPeriods = periodsPerYear * 100; // 100-year safety cap, prevents any runaway loop
      while (projBalance > 0 && periodsToPayoff < maxPeriods) {
        const interestThisPeriod = projBalance * periodRate;
        const principalThisPeriod = Math.max(0, repayment - interestThisPeriod);
        projBalance = Math.max(0, projBalance - principalThisPeriod);
        periodsToPayoff++;
      }
      const daysToPayoff = Math.round(periodsToPayoff * (365 / periodsPerYear));
      estimatedPayoffDate = new Date(today.getTime() + daysToPayoff * 24 * 60 * 60 * 1000);
    }
  }

  // Daily cash flow — weekly figures divided down to a daily rate, matching how
  // cash interest accrues continuously rather than only on payment dates.
  const weeklyRent = property.weeklyRent || 0;
  const weeklyCosts = property.weeklyCosts || 0;
  const dailyInterestCost = (loanPrincipalOwing * rate) / 365;
  const dailyRent = weeklyRent / 7;
  const dailyCosts = weeklyCosts / 7;
  const dailyNetCashFlow = dailyRent - dailyCosts - dailyInterestCost;
  const weeklyNetCashFlow = dailyNetCashFlow * 7;
  const annualNetCashFlow = dailyNetCashFlow * 365;

  // Accrued net cash flow since the property was added — this is what folds into realised P&L
  const propertyAddedDate = new Date(property.dateAdded || property.purchaseDate || Date.now());
  const daysSinceAdded = Math.max(0, Math.floor((today - propertyAddedDate) / (1000 * 60 * 60 * 24)));
  const accruedNetCashFlow = dailyNetCashFlow * daysSinceAdded;

  return {
    currentValue, purchasePrice, loanPrincipalOwing, netEquity, totalCapitalGain,
    dailyRent, dailyCosts, dailyInterestCost, dailyNetCashFlow,
    weeklyNetCashFlow, annualNetCashFlow, accruedNetCashFlow,
    daysSinceAdded, periodsElapsed, estimatedPayoffDate, payoffNeverHappens,
  };
}


function calcCashValue(account) {
  const principal = account.principal || 0;
  const rate = (account.rate || 0) / 100;
  const startDate = new Date(account.startDate);
  const today = new Date();
  const days = Math.max(0, Math.floor((today - startDate) / (1000 * 60 * 60 * 24)));
  const currentValue = principal * Math.pow(1 + rate / 365, days);
  const accruedInterest = currentValue - principal;
  const dailyEarn = principal * (rate / 365);
  const annualEarn = principal * rate;
  return { currentValue, accruedInterest, dailyEarn, annualEarn, days };
}

// ─── CASH MODAL ───────────────────────────────────────────────────────────────
function CashModal({ account, onSave, onClose }) {
  const isTopUp = account && typeof account === "object" && account.topUpFor;
  const blank = { institution: "", accountType: "Savings", principal: "", rate: "", startDate: new Date().toISOString().slice(0,10), notes: "" };
  const [f, setF] = useState(() => {
    if (isTopUp) return {
      ...blank,
      institution: account.topUpFor,
      // Pre-fill with the existing account's current rate/type, so topping up an
      // account defaults to keeping the same rate unless deliberately changed —
      // leaving this blank previously caused the rate to silently reset to 0%.
      rate: account.existingRate != null ? account.existingRate.toString() : "",
      accountType: account.existingAccountType || "Savings",
    };
    if (account && account !== "new") return { ...account, principal: account.principal.toString(), rate: account.rate.toString() };
    return blank;
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const SML = { ...INP, padding: "9px 10px", fontSize: 16 };
  const LBL2 = { ...LBL, marginBottom: 3 };

  const preview = f.principal && f.rate && f.startDate ? calcCashValue({
    principal: parseFloat(f.principal),
    rate: parseFloat(f.rate),
    startDate: f.startDate,
  }) : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 300 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: "14px 14px 0 0", padding: "20px 18px 32px", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: FONT, fontWeight: 400, fontSize: 15, color: C.text1 }}>
            {isTopUp ? `Add to ${account.topUpFor}` : (account && account !== "new" ? "Edit Cash Account" : "Add Cash Account")}
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.text3, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={LBL2}>INSTITUTION</div>
            <input value={f.institution} onChange={e => set("institution", e.target.value)} placeholder="ING, Macquarie, CBA..." style={SML} disabled={isTopUp} readOnly={isTopUp} />
            {isTopUp ? (
              <div style={{ fontSize: 10, color: C.green, fontFamily: FONT, fontWeight: 300, marginTop: 5, fontStyle: "italic" }}>
                This amount will be added to your existing {account.topUpFor} balance.
              </div>
            ) : (!account || account === "new") ? (
              <div style={{ fontSize: 10, color: C.text3, fontFamily: FONT, fontWeight: 300, marginTop: 5, fontStyle: "italic" }}>
                Adding to an existing institution name will combine the balance into that account.
              </div>
            ) : null}
          </div>
          <div>
            <div style={LBL2}>ACCOUNT TYPE</div>
            <select value={f.accountType} onChange={e => set("accountType", e.target.value)}
              style={{ ...SML, background: C.surfaceHigh }}>
              {["Savings", "Term Deposit", "Cash Management", "High Interest", "Other"].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={LBL2}>INTEREST RATE (% P.A.)</div>
            <input value={f.rate} onChange={e => set("rate", e.target.value)} type="number" placeholder="5.50" style={SML} />
          </div>
          <div>
            <div style={LBL2}>PRINCIPAL ($)</div>
            <input value={f.principal} onChange={e => set("principal", e.target.value)} type="number" placeholder="10000" style={SML} />
          </div>
          <div>
            <div style={LBL2}>START DATE</div>
            <input value={f.startDate} onChange={e => set("startDate", e.target.value)} type="date" style={{ ...SML, colorScheme: "dark" }} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={LBL2}>NOTES (optional)</div>
          <input value={f.notes} onChange={e => set("notes", e.target.value)} placeholder="e.g. Matures Dec 2025" style={SML} />
        </div>

        {/* Live preview */}
        {preview && (
          <div style={{ background: C.surfaceHigh, border: `1px solid ${C.borderHover}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 10 }}>PREVIEW</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                ["Accrued so far", `+${fmtUSD(preview.accruedInterest)}`],
                ["Daily earn", `+${fmtUSD(preview.dailyEarn)}`],
                ["Annual earn", `+${fmtUSD(preview.annualEarn)}`],
                ["Days running", `${preview.days} days`],
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 2 }}>{l.toUpperCase()}</div>
                  <div style={{ fontFamily: FONT, fontWeight: 400, fontSize: 13, color: C.green }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {f.rate === "" && (
          <div style={{ fontSize: 11, color: C.red, fontFamily: FONT, fontWeight: 300, marginBottom: 10, lineHeight: 1.4 }}>
            Interest rate is empty — this would save as 0%. Enter the rate to continue.
          </div>
        )}

        <button onClick={() => { if (f.rate === "") return; onSave({ ...f, id: account?.id || Date.now(), principal: parseFloat(f.principal) || 0, rate: parseFloat(f.rate) || 0 }); }}
          disabled={f.rate === ""}
          style={{ width: "100%", background: C.surfaceHigh, border: `1px solid ${C.borderHover}`, color: C.text1, borderRadius: 8, padding: "13px 0", fontSize: 12, fontFamily: FONT, fontWeight: 300, cursor: f.rate === "" ? "default" : "pointer", opacity: f.rate === "" ? 0.5 : 1 }}>
          {isTopUp ? "Add to balance" : (account && account !== "new" ? "Save changes" : "Add account")}
        </button>
      </div>
    </div>
  );
}

// ─── PROPERTY MODAL ─────────────────────────────────────────────────────────────
function PropertyModal({ property, onSave, onClose }) {
  const blank = {
    name: "", purchasePrice: "", currentValue: "", purchaseDate: new Date().toISOString().slice(0,10),
    loanPrincipal: "", interestRate: "", repaymentAmount: "", repaymentFrequency: "monthly", loanStartDate: new Date().toISOString().slice(0,10),
    weeklyRent: "", weeklyCosts: "", notes: "",
  };
  const [f, setF] = useState(() => {
    if (property && property !== "new") {
      return {
        ...blank, ...property,
        purchasePrice: property.purchasePrice?.toString() ?? "",
        currentValue: property.currentValue?.toString() ?? "",
        loanPrincipal: property.loanPrincipal?.toString() ?? "",
        interestRate: property.interestRate?.toString() ?? "",
        repaymentAmount: property.repaymentAmount?.toString() ?? "",
        weeklyRent: property.weeklyRent?.toString() ?? "",
        weeklyCosts: property.weeklyCosts?.toString() ?? "",
      };
    }
    return blank;
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const SML = { ...INP, padding: "9px 10px", fontSize: 16 };
  const LBL2 = { ...LBL, marginBottom: 3 };
  const hasLoan = parseFloat(f.loanPrincipal) > 0;

  const preview = f.currentValue ? calcPropertyValue({
    purchasePrice: parseFloat(f.purchasePrice) || 0,
    currentValue: parseFloat(f.currentValue) || 0,
    loanPrincipal: parseFloat(f.loanPrincipal) || 0,
    interestRate: parseFloat(f.interestRate) || 0,
    repaymentAmount: parseFloat(f.repaymentAmount) || 0,
    repaymentFrequency: f.repaymentFrequency,
    loanStartDate: f.loanStartDate,
    purchaseDate: f.purchaseDate,
    dateAdded: property?.dateAdded || f.purchaseDate,
    weeklyRent: parseFloat(f.weeklyRent) || 0,
    weeklyCosts: parseFloat(f.weeklyCosts) || 0,
  }) : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 300 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: "14px 14px 0 0", padding: "20px 18px 32px", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: FONT, fontWeight: 400, fontSize: 15, color: C.text1 }}>
            {property && property !== "new" ? "Edit Property" : "Add Property"}
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.text3, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={LBL2}>PROPERTY NAME</div>
          <input value={f.name} onChange={e => set("name", e.target.value)} placeholder="123 Smith St" style={SML} />
        </div>

        <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 8 }}>VALUE & PURCHASE</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div>
            <div style={LBL2}>PURCHASE PRICE ($)</div>
            <input value={f.purchasePrice} onChange={e => set("purchasePrice", e.target.value)} type="number" placeholder="650000" style={SML} />
          </div>
          <div>
            <div style={LBL2}>CURRENT VALUE ($)</div>
            <input value={f.currentValue} onChange={e => set("currentValue", e.target.value)} type="number" placeholder="720000" style={SML} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={LBL2}>PURCHASE DATE</div>
            <input value={f.purchaseDate} onChange={e => set("purchaseDate", e.target.value)} type="date" style={{ ...SML, colorScheme: "dark" }} />
          </div>
        </div>

        <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 8 }}>LOAN (leave blank if paid off)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div>
            <div style={LBL2}>LOAN PRINCIPAL ($)</div>
            <input value={f.loanPrincipal} onChange={e => set("loanPrincipal", e.target.value)} type="number" placeholder="0" style={SML} />
          </div>
          <div>
            <div style={LBL2}>INTEREST RATE (% P.A.)</div>
            <input value={f.interestRate} onChange={e => set("interestRate", e.target.value)} type="number" placeholder="6.20" style={SML} />
          </div>
          <div>
            <div style={LBL2}>REPAYMENT AMOUNT ($)</div>
            <input value={f.repaymentAmount} onChange={e => set("repaymentAmount", e.target.value)} type="number" placeholder="2400" style={SML} />
          </div>
          <div>
            <div style={LBL2}>FREQUENCY</div>
            <select value={f.repaymentFrequency} onChange={e => set("repaymentFrequency", e.target.value)} style={{ ...SML, background: C.surfaceHigh }}>
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={LBL2}>LOAN START DATE</div>
            <input value={f.loanStartDate} onChange={e => set("loanStartDate", e.target.value)} type="date" style={{ ...SML, colorScheme: "dark" }} />
          </div>
        </div>

        <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 8 }}>RENTAL INCOME</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 4 }}>
          <div>
            <div style={LBL2}>WEEKLY RENT ($)</div>
            <input value={f.weeklyRent} onChange={e => set("weeklyRent", e.target.value)} type="number" placeholder="650" style={SML} />
          </div>
          <div>
            <div style={LBL2}>WEEKLY COSTS ($)</div>
            <input value={f.weeklyCosts} onChange={e => set("weeklyCosts", e.target.value)} type="number" placeholder="80" style={SML} />
          </div>
        </div>
        <div style={{ fontSize: 10, color: C.labelDim, fontFamily: FONT, fontWeight: 300, marginBottom: 12 }}>Costs: rates, strata, insurance, maintenance, etc.</div>

        <div style={{ marginBottom: 12 }}>
          <div style={LBL2}>NOTES (optional)</div>
          <input value={f.notes} onChange={e => set("notes", e.target.value)} placeholder="e.g. Tenant lease renews March" style={SML} />
        </div>

        {/* Live preview */}
        {preview && (
          <div style={{ background: C.surfaceHigh, border: `1px solid ${C.borderHover}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 10 }}>PREVIEW</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                ["Net equity", fmtUSD(preview.netEquity)],
                ["Loan owing", fmtUSD(preview.loanPrincipalOwing)],
                ["Weekly cash flow", `${preview.weeklyNetCashFlow>=0?"+":""}${fmtUSD(preview.weeklyNetCashFlow)}`],
                ["Annual cash flow", `${preview.annualNetCashFlow>=0?"+":""}${fmtUSD(preview.annualNetCashFlow)}`],
                ...((parseFloat(f.loanPrincipal) || 0) > 0 ? [["Est. payoff date", preview.payoffNeverHappens
                  ? "Won't pay off at this rate"
                  : preview.estimatedPayoffDate
                    ? preview.estimatedPayoffDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })
                    : "—"]] : []),
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 2 }}>{l.toUpperCase()}</div>
                  <div style={{ fontFamily: FONT, fontWeight: 400, fontSize: 13, color: l === "Est. payoff date" && preview.payoffNeverHappens ? C.red : (l.includes("cash flow") ? (preview.weeklyNetCashFlow>=0?C.green:C.red) : C.text1) }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => onSave({
          ...f, id: property?.id || Date.now(), dateAdded: property?.dateAdded || new Date().toISOString().slice(0,10),
          purchasePrice: parseFloat(f.purchasePrice) || 0, currentValue: parseFloat(f.currentValue) || 0,
          loanPrincipal: parseFloat(f.loanPrincipal) || 0, interestRate: parseFloat(f.interestRate) || 0,
          repaymentAmount: parseFloat(f.repaymentAmount) || 0, weeklyRent: parseFloat(f.weeklyRent) || 0, weeklyCosts: parseFloat(f.weeklyCosts) || 0,
        })}
          style={{ width: "100%", background: C.surfaceHigh, border: `1px solid ${C.borderHover}`, color: C.text1, borderRadius: 8, padding: "13px 0", fontSize: 12, fontFamily: FONT, fontWeight: 300, cursor: "pointer" }}>
          {property && property !== "new" ? "Save changes" : "Add property"}
        </button>
      </div>
    </div>
  );
}

// ─── CASH CARD ────────────────────────────────────────────────────────────────
function CashCard({ account, onEdit, onDelete, onAddCash }) {
  const [open, setOpen] = useState(false);
  const calc = calcCashValue(account);

  // Build 30-day P&L sparkline data
  const sparkData = Array.from({ length: 31 }, (_, i) => {
    const d = new Date(account.startDate);
    d.setDate(d.getDate() + i);
    const days = i;
    const val = account.principal * Math.pow(1 + (account.rate / 100) / 365, days);
    return { day: i, interest: parseFloat((val - account.principal).toFixed(4)) };
  });

  return (
    <div onClick={() => setOpen(!open)}
      style={{ background: open ? C.surfaceHigh : C.surface, border: `1px solid ${open ? C.borderAccent : C.borderHover}`, borderRadius: 12, padding: "18px 20px", marginBottom: 10, cursor: "pointer", borderLeft: open ? `2px solid ${C.green}` : `1px solid ${C.borderHover}`, transition: "all 0.2s" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: C.greenDim, border: `1px solid ${C.greenBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            💰
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 15, color: C.text1 }}>{account.institution}</div>
            <div style={{ fontSize: 11, color: C.text3, fontFamily: FONT, fontWeight: 300, marginTop: 1 }}>{account.accountType} · {account.rate}% p.a.</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: FONT, fontWeight: 400, fontSize: 18, color: C.text1 }}>{fmtUSD(calc.currentValue)}</div>
          <div style={{ fontSize: 12, color: C.green, fontFamily: MONO, marginTop: 2 }}>
            +{account.principal > 0 ? ((calc.accruedInterest / account.principal) * 100).toFixed(2) : "0.00"}%
          </div>
          <div style={{ fontSize: 10, color: C.green, fontFamily: MONO, marginTop: 1, opacity: 0.8 }}>+{fmtUSD(calc.accruedInterest)}</div>
        </div>
      </div>

      {/* Key stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 14 }}>
        {[
          ["Principal", fmtUSD(account.principal)],
          ["Daily earn", `+${fmtUSD(calc.dailyEarn)}`],
          ["Annual", `+${fmtUSD(calc.annualEarn)}`],
        ].map(([l, v]) => (
          <div key={l}>
            <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 3, textTransform: "uppercase" }}>{l}</div>
            <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 13, color: l === "Principal" ? C.text2 : C.green }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 16 }} onClick={e => e.stopPropagation()}>

          {/* Interest sparkline */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 6 }}>30-DAY INTEREST ACCRUAL</div>
            <ResponsiveContainer width="100%" height={70}>
              <AreaChart data={sparkData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.green} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="interest" stroke={C.green} strokeWidth={1.5} fill="url(#cashGrad)" dot={false} />
                <Tooltip
                  contentStyle={{ background: C.surfaceHigh, border: `1px solid ${C.borderHover}`, borderRadius: 6, padding: "4px 8px" }}
                  labelStyle={{ display: "none" }}
                  itemStyle={{ color: C.green, fontSize: 11, fontFamily: MONO }}
                  formatter={v => [`+${fmtUSD(v)}`, "Interest"]}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Extended stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[
              ["Start date", account.startDate],
              ["Days running", `${calc.days} days`],
              ["Total interest", `+${fmtUSD(calc.accruedInterest)}`],
              ["Monthly earn", `+${fmtUSD(calc.dailyEarn * 30)}`],
            ].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 2, textTransform: "uppercase" }}>{l}</div>
                <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 13, color: C.text2 }}>{v}</div>
              </div>
            ))}
          </div>

          {account.notes && (
            <div style={{ fontSize: 11, color: C.text3, fontFamily: FONT, fontWeight: 300, fontStyle: "italic", marginBottom: 12 }}>{account.notes}</div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onAddCash(account)} style={{ flex: 1, background: "transparent", border: `1px solid ${C.greenBorder}`, color: C.green, borderRadius: 6, padding: "8px 0", fontSize: 11, fontFamily: MONO, cursor: "pointer", letterSpacing: 1.5 }}>+ Add cash</button>
            <button onClick={() => onEdit(account)} style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, color: C.text2, borderRadius: 6, padding: "8px 0", fontSize: 11, fontFamily: MONO, cursor: "pointer", letterSpacing: 1.5 }}>Edit</button>
            <button onClick={() => onDelete(account.id)} style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, color: "rgba(248,113,113,0.4)", borderRadius: 6, padding: "8px 0", fontSize: 11, fontFamily: MONO, cursor: "pointer", letterSpacing: 1.5 }}>Remove</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PROPERTY CARD ──────────────────────────────────────────────────────────────
function PropertyCard({ property, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const calc = calcPropertyValue(property);
  const hasLoan = (property.loanPrincipal || 0) > 0;
  const cashFlowPositive = calc.weeklyNetCashFlow >= 0;

  return (
    <div onClick={() => setOpen(!open)}
      style={{ background: open ? C.surfaceHigh : C.surface, border: `1px solid ${open ? C.borderAccent : C.borderHover}`, borderRadius: 12, padding: "18px 20px", marginBottom: 10, cursor: "pointer", borderLeft: open ? `2px solid ${C.green}` : `1px solid ${C.borderHover}`, transition: "all 0.2s" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: C.greenDim, border: `1px solid ${C.greenBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            🏠
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 15, color: C.text1 }}>{property.name}</div>
            <div style={{ fontSize: 11, color: C.text3, fontFamily: FONT, fontWeight: 300, marginTop: 1 }}>
              {hasLoan ? `${fmtUSD(calc.loanPrincipalOwing)} owing` : "Paid off"}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: FONT, fontWeight: 400, fontSize: 18, color: C.text1 }}>{fmtUSD(calc.netEquity)}</div>
          <div style={{ fontSize: 11, color: C.text3, fontFamily: MONO, marginTop: 1 }}>net equity</div>
          <div style={{ fontSize: 11, color: cashFlowPositive ? C.green : C.red, fontFamily: MONO, marginTop: 3 }}>
            {cashFlowPositive ? "+" : ""}{fmtUSD(calc.weeklyNetCashFlow)}/wk
          </div>
        </div>
      </div>

      {/* Key stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 14 }}>
        {[
          ["Current value", fmtUSD(calc.currentValue)],
          ["Capital gain", `${calc.totalCapitalGain>=0?"+":""}${fmtUSD(calc.totalCapitalGain)}`],
          ["Weekly rent", fmtUSD(property.weeklyRent || 0)],
        ].map(([l, v]) => (
          <div key={l}>
            <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 3, textTransform: "uppercase" }}>{l}</div>
            <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 13, color: l === "Capital gain" ? (calc.totalCapitalGain>=0?C.green:C.red) : C.text2 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 16 }} onClick={e => e.stopPropagation()}>

          {/* Cash flow breakdown */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 10 }}>WEEKLY CASH FLOW</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 12 }}>
                <span style={{ color: C.text3 }}>Rental income</span>
                <span style={{ color: C.green }}>+{fmtUSD(property.weeklyRent || 0)}</span>
              </div>
              {hasLoan && (
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 12 }}>
                  <span style={{ color: C.text3 }}>Loan interest</span>
                  <span style={{ color: C.red }}>-{fmtUSD(calc.dailyInterestCost * 7)}</span>
                </div>
              )}
              {(property.weeklyCosts || 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 12 }}>
                  <span style={{ color: C.text3 }}>Running costs</span>
                  <span style={{ color: C.red }}>-{fmtUSD(property.weeklyCosts)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 13, borderTop: `1px solid ${C.border}`, paddingTop: 6, marginTop: 2 }}>
                <span style={{ color: C.text2 }}>Net</span>
                <span style={{ color: cashFlowPositive ? C.green : C.red, fontWeight: 700 }}>{cashFlowPositive?"+":""}{fmtUSD(calc.weeklyNetCashFlow)}</span>
              </div>
            </div>
          </div>

          {/* Extended stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[
              ["Purchase price", fmtUSD(calc.purchasePrice)],
              ["Purchase date", property.purchaseDate],
              ...(hasLoan ? [
                ["Loan owing", fmtUSD(calc.loanPrincipalOwing)],
                ["Interest rate", `${property.interestRate}% p.a.`],
                ["Est. payoff date", calc.payoffNeverHappens
                  ? "Won't pay off at this rate"
                  : calc.estimatedPayoffDate
                    ? calc.estimatedPayoffDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })
                    : "—"],
              ] : []),
              ["Accrued P&L since added", `${calc.accruedNetCashFlow>=0?"+":""}${fmtUSD(calc.accruedNetCashFlow)}`],
              ["Annual cash flow", `${calc.annualNetCashFlow>=0?"+":""}${fmtUSD(calc.annualNetCashFlow)}`],
            ].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 2, textTransform: "uppercase" }}>{l}</div>
                <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 13, color: l === "Est. payoff date" && calc.payoffNeverHappens ? C.red : C.text2 }}>{v}</div>
              </div>
            ))}
          </div>

          {property.notes && (
            <div style={{ fontSize: 11, color: C.text3, fontFamily: FONT, fontWeight: 300, fontStyle: "italic", marginBottom: 12 }}>{property.notes}</div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onEdit(property)} style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, color: C.text2, borderRadius: 6, padding: "8px 0", fontSize: 11, fontFamily: MONO, cursor: "pointer", letterSpacing: 1.5 }}>Edit</button>
            <button onClick={() => onDelete(property.id)} style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, color: "rgba(248,113,113,0.4)", borderRadius: 6, padding: "8px 0", fontSize: 11, fontFamily: MONO, cursor: "pointer", letterSpacing: 1.5 }}>Remove</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ANALYTICS CARD ──────────────────────────────────────────────────────────
function AnalyticsCard({ donutData, chartData, hasChart, showToggle, lineColor, isUp, total, chartData0, truePnl, totalCostBasisNow, pnlHistory, pnlHistoryLoading }) {
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
            <div style={{ fontSize: 12, fontFamily: FONT, fontWeight: 400, color: lineColor, opacity: 0.7 }}>
              since first trade
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

      {/* P&L chart — real daily unrealised P&L over the last 90 days, from actual historical prices */}
      {view === "chart" && hasChart && (() => {
        const pnlData = pnlHistory || [];
        // Keep the final bar exactly in sync with the live truePnl figure shown above the chart —
        // pnlHistory's last point uses end-of-day historical close, truePnl uses live current price
        if (pnlData.length > 0) pnlData[pnlData.length - 1] = { ...pnlData[pnlData.length - 1], pnl: parseFloat(truePnl.toFixed(2)) };
        const finalPnl = truePnl;
        const pnlColor = finalPnl >= 0 ? C.green : C.red;

        if (pnlHistoryLoading && pnlData.length === 0) {
          return (
            <div style={{ height: 90, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 10, color: C.text3, fontFamily: MONO }}>loading price history...</span>
            </div>
          );
        }

        return (
          <div>
            {/* Big P&L number */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
              <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 32, color: pnlColor, letterSpacing: -1 }}>
                {finalPnl >= 0 ? "+" : ""}{fmtUSD(finalPnl)}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: pnlColor, opacity: 0.7 }}>
                {totalCostBasisNow > 0 ? ((truePnl / totalCostBasisNow) * 100).toFixed(2) : "0.00"}%
              </div>
            </div>
            {pnlData.length > 0 ? (
              <>
                <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 6 }}>LAST 90 DAYS</div>
                <ResponsiveContainer width="100%" height={90}>
                  <BarChart data={pnlData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <XAxis dataKey="date" hide />
                    <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                      {pnlData.map((entry, i) => (
                        <Cell key={i} fill={entry.pnl >= 0 ? C.green : C.red} fillOpacity={0.75} />
                      ))}
                    </Bar>
                    <Tooltip
                      contentStyle={{ background: C.surfaceHigh, border: `1px solid ${C.borderHover}`, borderRadius: 6, padding: "4px 8px" }}
                      labelStyle={{ color: C.text3, fontSize: 9, fontFamily: MONO }}
                      itemStyle={{ fontSize: 11, fontFamily: MONO }}
                      formatter={v => [<span style={{ color: v >= 0 ? C.green : C.red }}>{`${v >= 0 ? "+" : ""}${fmtUSD(v)}`}</span>, "P&L"]}
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div style={{ textAlign: "center", color: C.text3, fontFamily: FONT, fontWeight: 300, fontSize: 12, padding: "20px 0", fontStyle: "italic" }}>
                Price history unavailable right now
              </div>
            )}
          </div>
        );
      })()}

      {view === "chart" && !hasChart && (
        <div style={{ textAlign: "center", color: C.text3, fontFamily: FONT, fontWeight: 300, fontSize: 12, padding: "20px 0", fontStyle: "italic" }}>
          Log trades to see your P&L chart
        </div>
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
// Same cost-basis/units-held math as calcPosition, but "as of" an arbitrary past date —
// used to build the real daily P&L history chart instead of the old linear-interpolation fake.
function calcPositionAsOf(trades, priceOnDate) {
  const tradesUpTo = trades; // caller pre-filters to trades on or before the target date
  const buys = tradesUpTo.filter(t => t.type === "buy");
  const sells = tradesUpTo.filter(t => t.type === "sell");
  const totalBuyUnits = buys.reduce((s,t) => s+t.units, 0);
  const totalSellUnits = sells.reduce((s,t) => s+t.units, 0);
  const unitsHeld = totalBuyUnits - totalSellUnits;
  if (unitsHeld <= 0) return { unitsHeld: 0, costBasis: 0, currentValue: 0, unrealisedPnl: 0 };
  const totalCostWithFees = buys.reduce((s,t) => s+(t.price*t.units)+(t.fees||0), 0);
  const totalBuyUnitsForAvg = totalBuyUnits || 1;
  const avgBuyPrice = buys.reduce((s,t) => s+t.price*t.units, 0) / totalBuyUnitsForAvg;
  const totalFeesOnBuys = buys.reduce((s,t) => s+(t.fees||0), 0);
  const costBasis = avgBuyPrice * unitsHeld + (unitsHeld/totalBuyUnitsForAvg)*totalFeesOnBuys;
  const currentValue = (priceOnDate != null ? priceOnDate : avgBuyPrice) * unitsHeld;
  const unrealisedPnl = currentValue - costBasis;
  return { unitsHeld, costBasis, currentValue, unrealisedPnl };
}

// ─── DIVIDEND FORECASTING ───────────────────────────────────────────────────
// Detects a position's typical payment interval from its dividend history (quarterly,
// monthly, semi-annual, annual, or irregular), then projects the next 12 months forward
// using the most recent payment amount as the estimate. This is a simple heuristic, not
// a guarantee — real dividends can be cut, raised, or paused, so it's framed as a forecast.
function detectDividendFrequency(dates) {
  if (dates.length < 2) return null;
  const sorted = [...dates].sort((a, b) => new Date(a) - new Date(b));
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push((new Date(sorted[i]) - new Date(sorted[i - 1])) / (1000 * 60 * 60 * 24));
  }
  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  if (avgGap <= 45) return { label: "Monthly", days: 30 };
  if (avgGap <= 135) return { label: "Quarterly", days: 91 };
  if (avgGap <= 270) return { label: "Semi-annual", days: 182 };
  if (avgGap <= 450) return { label: "Annual", days: 365 };
  return { label: "Irregular", days: null };
}

function forecastDividends(allDividends, months = 12) {
  // Group by symbol
  const bySymbol = {};
  allDividends.forEach(d => {
    if (!bySymbol[d.symbol]) bySymbol[d.symbol] = [];
    bySymbol[d.symbol].push(d);
  });

  const forecast = []; // [{ date, symbol, amount, projected: true }]
  const frequencies = {}; // { symbol: { label, days } }

  Object.entries(bySymbol).forEach(([symbol, divs]) => {
    const dates = divs.map(d => d.date);
    const freq = detectDividendFrequency(dates);
    frequencies[symbol] = freq;
    if (!freq || !freq.days) return; // irregular or insufficient history — can't project

    const sorted = [...divs].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastAmount = sorted[0].amount;
    const lastDate = new Date(sorted[0].date);
    const horizon = new Date();
    horizon.setMonth(horizon.getMonth() + months);

    let nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + freq.days);
    while (nextDate <= horizon) {
      forecast.push({ date: nextDate.toISOString().slice(0, 10), symbol, amount: lastAmount, projected: true });
      nextDate = new Date(nextDate);
      nextDate.setDate(nextDate.getDate() + freq.days);
    }
  });

  return { forecast, frequencies };
}

function calcPosition(trades, currentPrice) {
  const buys = trades.filter(t => t.type === "buy");
  const sells = trades.filter(t => t.type === "sell");
  const dividends = trades.filter(t => t.type === "dividend");
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
  // Realised P&L: for each sell, profit = (sellPrice - avgBuyPrice) * units - fees.
  // Dividends are pure cash gain (no cost-basis adjustment, since DRIP/reinvestment isn't tracked) —
  // they're realised the moment they're paid, same treatment as cash interest elsewhere in the app.
  const totalDividends = dividends.reduce((s,t) => s + (t.amount || 0), 0);
  const realisedPnl = sells.reduce((s,t) => s + (t.price - avgBuyPrice)*t.units - (t.fees||0), 0) + totalDividends;
  return { unitsHeld, avgBuyPrice, breakEven, currentValue, costBasis, unrealisedPnl, unrealisedPct, realisedPnl, totalBuyUnits, totalSellUnits, totalDividends };
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
  const hasDividends = trades.some(t => t.type === "dividend");

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

      {(hasSells || hasDividends) && (
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5 }}>REALISED</span>
            <span style={{ fontSize: 12, fontFamily: FONT, fontWeight: 300, color: pos.realisedPnl>=0?C.green:C.red }}>{pos.realisedPnl>=0?"+":""}{fmtUSD(pos.realisedPnl)}</span>
          </div>
          {hasDividends && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1.5 }}>DIVIDENDS</span>
              <span style={{ fontSize: 12, fontFamily: FONT, fontWeight: 300, color: C.green }}>+{fmtUSD(pos.totalDividends)}</span>
            </div>
          )}
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

          {/* Trade log tabs + log trade */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {["summary","trades"].map(v => (
                <button key={v} onClick={() => setView(v)} style={{ background: view===v?C.surface:"transparent", border:`1px solid ${view===v?C.borderHover:C.border}`, color:view===v?C.text1:C.text3, borderRadius:4, padding:"4px 14px", fontSize:10, fontFamily:FONT, fontWeight:300, cursor:"pointer", letterSpacing:0.3 }}>
                  {v.charAt(0).toUpperCase()+v.slice(1)}
                </button>
              ))}
            </div>
            <button onClick={() => onAddTrade(symbol)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.text3, borderRadius: 4, padding: "4px 14px", fontSize: 10, fontFamily: FONT, fontWeight: 300, cursor: "pointer", letterSpacing: 0.3 }}>
              + Trade
            </button>
          </div>

          {view === "trades" && (
            <div>
              {trades.sort((a,b) => new Date(b.date)-new Date(a.date)).map((t,i) => {
                if (t.type === "dividend") {
                  return (
                    <div key={t.id} style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 9, fontFamily: MONO, color: C.green, letterSpacing: 1.5, textTransform: "uppercase" }}>Dividend</span>
                          <span style={{ fontFamily: MONO, fontSize: 10, color: C.text3 }}>{t.date}</span>
                        </div>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button onClick={() => onDelete(t.id)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: "rgba(248,113,113,0.4)", borderRadius: 4, padding: "3px 7px", fontSize: 10, fontFamily: MONO, cursor: "pointer" }}>✕</button>
                        </div>
                      </div>
                      <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 14, color: C.green }}>+{fmtUSD(t.amount)}</div>
                      {t.originalCurrency && t.originalCurrency !== "USD" && (
                        <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 10, color: C.text3, marginTop: 2 }}>
                          Paid {CURRENCY_SYMBOLS[t.originalCurrency] || t.originalCurrency + " "}{Number(t.originalAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t.originalCurrency}
                        </div>
                      )}
                      {t.brokerage && (
                        <div style={{ fontSize: 10, color: C.text3, marginTop: 4, fontFamily: MONO, letterSpacing: 0.5 }}>via {t.brokerage}</div>
                      )}
                      {t.notes && <div style={{ fontSize: 11, color: C.text3, marginTop: 6, fontFamily: FONT, fontWeight: 300, fontStyle: "italic" }}>{t.notes}</div>}
                    </div>
                  );
                }
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
                  {t.brokerage && (
                    <div style={{ fontSize: 10, color: C.text3, marginTop: 6, fontFamily: MONO, letterSpacing: 0.5 }}>via {t.brokerage}</div>
                  )}
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
    { sig: { label: "STRONG BUY", color: C.sigStrongBuy, bg: C.sigStrongBuyBg }, rule: "RSI < 30 + 20%+ below 52W high" },
    { sig: { label: "BUY DIP",    color: C.sigDip,        bg: C.sigDipBg },       rule: "RSI < 40 + 10–20% below 52W high" },
    { sig: { label: "WATCHING",   color: C.sigWatch,      bg: C.sigWatchBg },     rule: "Some weakness — monitor entry" },
    { sig: { label: "WAIT",       color: C.sigWait,       bg: C.sigWaitBg },      rule: "Near highs, no dip yet" },
    { sig: { label: "AVOID",      color: C.sigAvoid,      bg: C.sigAvoidBg },     rule: "Overbought / greed territory" },
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
  // ── Auth session — gates the entire app behind login. Starts as "loading" (null +
  // sessionChecked false) so we don't flash the login screen for an instant before
  // Supabase has had a chance to report an existing session from a previous visit.
  const [session, setSession] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Guarantee the splash screen is visible for a deliberate minimum stretch of time,
  // rather than disappearing the instant the real check resolves — on a fast
  // connection the real check can finish in well under the fade-in's own duration,
  // which made the animation feel like it never actually got to play.
  const [minSplashTimeElapsed, setMinSplashTimeElapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMinSplashTimeElapsed(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // If we've arrived here via an email confirmation (or OAuth) redirect, Supabase
    // attaches auth info to the URL as a hash fragment (e.g. #access_token=...). In
    // that case, wait for onAuthStateChange to report the session rather than trusting
    // getSession()'s immediate result — getSession() can resolve "no session" a few
    // milliseconds before Supabase finishes parsing that hash and creating the session,
    // which is exactly what was causing confirmation links to land back on the login
    // screen instead of logging the person in.
    const arrivingFromAuthRedirect = window.location.hash.includes("access_token") || window.location.hash.includes("type=signup") || window.location.hash.includes("type=recovery");

    if (!arrivingFromAuthRedirect) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setSessionChecked(true);
      });
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSessionChecked(true);
      // Clean the hash out of the URL once we've consumed it, so refreshing the page
      // or sharing the URL doesn't carry stale auth tokens around in the address bar
      if (window.location.hash.includes("access_token")) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    });

    // Safety net: if we were waiting on an auth redirect but nothing arrives within
    // a few seconds (e.g. an expired or already-used link), stop waiting and show
    // the login screen rather than leaving the person stuck on a loading state forever.
    let fallbackTimer;
    if (arrivingFromAuthRedirect) {
      fallbackTimer = setTimeout(() => setSessionChecked(true), 4000);
    }

    return () => {
      listener.subscription.unsubscribe();
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  const [onboarded, setOnboarded] = useState(() => {
    try { return localStorage.getItem("accrue_onboarded") === "true"; } catch { return false; }
  });

  const completeOnboarding = () => {
    try { localStorage.setItem("accrue_onboarded", "true"); } catch {}
    setOnboarded(true);
    if (session?.user?.id) pushPreferencesToSupabase(session.user.id, { theme, displayCurrency, selectedBenchmark, onboarded: true });
  };

  // Lightweight splash shown on every cold start for returning users (already onboarded)
  // Initialised once per page load — doesn't re-trigger on internal state changes
  const [showReturningSplash, setShowReturningSplash] = useState(() => {
    try { return localStorage.getItem("accrue_onboarded") === "true"; } catch { return false; }
  });

  const [navOpen, setNavOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  // ── Theme (dark default; light is a full alternate palette, same component tree)
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("accrue_theme") || "dark"; } catch { return "dark"; }
  });

  // Keep the mutable C object and its derived tokens (INP/LBL) in sync with the live
  // theme on every render — same approach as setDisplayCurrencyGlobals above, since C
  // is referenced directly (not passed as a prop) by every component in this file.
  applyTheme(theme);
  refreshDerivedTokens();

  const setThemeDirect = (next) => {
    setTheme(next);
    try { localStorage.setItem("accrue_theme", next); } catch {}
    if (session?.user?.id) pushPreferencesToSupabase(session.user.id, { theme: next, displayCurrency, selectedBenchmark, onboarded });
  };

  // Keep the iOS status bar tint and body background in sync when the theme changes
  // mid-session (not just on reload — index.html handles that part separately)
  useEffect(() => {
    const bg = theme === "light" ? "#eceae5" : theme === "cyberpunk" ? "#0a0014" : "#070c09";
    try {
      const meta = document.getElementById("theme-color-meta") || document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", bg);
      document.body.style.background = bg;
    } catch (e) {}
  }, [theme]);

  // ── Display currency (USD is always source of truth; this only affects display)
  const [displayCurrency, setDisplayCurrency] = useState(() => {
    try { return localStorage.getItem("accrue_currency") || "USD"; } catch { return "USD"; }
  });
  const [fxRates, setFxRates] = useState({});
  const [fxLoaded, setFxLoaded] = useState(false);

  // Keep the module-level fmtUSD engine in sync with state on every render
  setDisplayCurrencyGlobals(displayCurrency, fxRates);

  const changeDisplayCurrency = (currency) => {
    setDisplayCurrency(currency);
    try { localStorage.setItem("accrue_currency", currency); } catch {}
    if (session?.user?.id) pushPreferencesToSupabase(session.user.id, { theme, displayCurrency: currency, selectedBenchmark, onboarded });
  };
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);

  // Fetch FX rates once on load, and refresh every 12 hours while app is open
  useEffect(() => {
    const fetchFx = async () => {
      try {
        const res = await fetch(apiUrl("/api/fx-rates"));
        const data = await res.json();
        if (data?.rates) setFxRates(data.rates);
      } catch {}
      setFxLoaded(true);
    };
    fetchFx();
    const interval = setInterval(fetchFx, 12 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  const restartOnboarding = () => {
    try { localStorage.removeItem("accrue_onboarded"); } catch {}
    setOnboarded(false);
    if (session?.user?.id) pushPreferencesToSupabase(session.user.id, { theme, displayCurrency, selectedBenchmark, onboarded: false });
  };

  const [tab, setTab] = useState("watchlist");
  const [watchlist, setWatchlist] = useState(DEFAULT_WATCHLIST);
  const [portfolio, setPortfolio] = useState(DEFAULT_PORTFOLIO);
  // Last-known price per symbol, retained even if an asset is removed from the
  // watchlist — so portfolio positions never lose their price (and drop to $0)
  // just because they're no longer being watched.
  const [priceMap, setPriceMap] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [watchModal, setWatchModal] = useState(null);
  const [tradeModal, setTradeModal] = useState(null); // null | { defaultType, symbol? }
  const [searchModal, setSearchModal] = useState(false);
  const [editTradeModal, setEditTradeModal] = useState(null); // null | trade object
  const [filterSig, setFilterSig] = useState("all");
  // Selected period for the watchlist % display: day | week | month | year | all
  const [watchPeriod, setWatchPeriod] = useState("day");
  const [showLegend, setShowLegend] = useState(false);
  const [liveStatus, setLiveStatus] = useState("idle"); // idle | fetching | ok | error
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fearGreedData, setFearGreedData] = useState(null); // { value, label }
  const [insightsPeriod, setInsightsPeriod] = useState("weekly"); // daily | weekly | monthly
  const [spyPeriodData, setSpyPeriodData] = useState({}); // { daily, weekly, monthly } each { pct } — kept for backward compat with existing spyChange references
  const [benchmarkData, setBenchmarkData] = useState({}); // { SPY: {...}, QQQ: {...}, BTC: {...} }
  const [selectedBenchmark, setSelectedBenchmark] = useState(() => {
    try { return localStorage.getItem("accrue_benchmark") || "SPY"; } catch { return "SPY"; }
  });

  // Load preferences from Supabase once the session is known. If no remote row exists
  // yet (first sync for this account), migrate up whatever's currently in local state —
  // which itself was already initialised from localStorage above, so this naturally
  // carries over a returning user's existing theme/currency/benchmark/onboarding choices.
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  useEffect(() => {
    if (!sessionChecked || !session) return;
    (async () => {
      const userId = session.user.id;
      const remotePrefs = await fetchPreferencesFromSupabase(userId);
      if (remotePrefs) {
        setTheme(remotePrefs.theme);
        setDisplayCurrency(remotePrefs.displayCurrency);
        setSelectedBenchmark(remotePrefs.selectedBenchmark);
        setOnboarded(remotePrefs.onboarded);
        try {
          localStorage.setItem("accrue_theme", remotePrefs.theme);
          localStorage.setItem("accrue_currency", remotePrefs.displayCurrency);
          localStorage.setItem("accrue_benchmark", remotePrefs.selectedBenchmark);
          localStorage.setItem("accrue_onboarded", remotePrefs.onboarded ? "true" : "false");
        } catch {}
      } else {
        // No remote row yet — push up the current (locally-derived) state once
        await pushPreferencesToSupabase(userId, { theme, displayCurrency, selectedBenchmark, onboarded });
      }
      setPrefsLoaded(true);
    })();
  }, [sessionChecked, session]);

  const [pnlHistory, setPnlHistory] = useState([]); // [{ date, pnl }] — real daily unrealised P&L, last 90 days
  const [pnlHistoryLoading, setPnlHistoryLoading] = useState(false);
  const [priceHistoryBySymbol, setPriceHistoryBySymbol] = useState({}); // { SYM: { "YYYY-MM-DD": price } } — feeds Insights period comparisons
  const [cashAccounts, setCashAccounts] = useState([]);
  const [cashLoaded, setCashLoaded] = useState(false);
  const [cashModal, setCashModal] = useState(null); // null | account object | "new"
  const [properties, setProperties] = useState([]);
  const [propertiesLoaded, setPropertiesLoaded] = useState(false);
  const [propertyModal, setPropertyModal] = useState(null); // null | property object | "new"
  const [alerts, setAlerts] = useState([]);
  const [alertsLoaded, setAlertsLoaded] = useState(false);
  const [alertModal, setAlertModal] = useState(null); // null | { symbol, currentPrice }
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);
  const [stockFearGreed, setStockFearGreed] = useState(null); // { score, rating, previousClose, previousWeek, previousMonth }
  const [vixData, setVixData] = useState(null); // { value, changePct, level, label }

  // ── Live price refresh
  const refreshPrices = async (wl) => {
    const list = wl || watchlist;
    // Include portfolio holdings, not just watchlist items, so a position that
    // isn't on the watchlist still gets a live price.
    const portfolioSymbols = portfolio.map(t => (t.symbol || "").toUpperCase().trim()).filter(Boolean);
    const symbols = [...new Set([...list.map(a => a.symbol), ...portfolioSymbols])];
    if (!symbols.length) return;
    setLiveStatus("fetching");

    // Fetch prices + Crypto Fear & Greed + Stock Fear & Greed + VIX in parallel
    const [prices, fgRes, stockFgRes, vixRes] = await Promise.all([
      fetchLivePrices(symbols),
      fetch("https://api.alternative.me/fng/?limit=1").then(r => r.json()).catch(() => null),
      fetch(apiUrl("/api/stock-sentiment")).then(r => r.json()).catch(() => null),
      fetch(apiUrl("/api/vix")).then(r => r.json()).catch(() => null),
    ]);

    if (stockFgRes && !stockFgRes.error) setStockFearGreed(stockFgRes);
    if (vixRes && !vixRes.error) setVixData(vixRes);

    if (Object.keys(prices).length > 0) {
      // Cache every fetched price by symbol so portfolio positions can read a
      // last-known price even after an asset leaves the watchlist.
      setPriceMap(prev => {
        const next = { ...prev };
        for (const [sym, p] of Object.entries(prices)) {
          if (p && p.price) next[sym] = p.price;
        }
        return next;
      });
      // Apply live prices
      setWatchlist(prev => prev.map(a => {
        const p = prices[a.symbol];
        if (!p) return a;
        // Auto-apply Fear & Greed to crypto assets
        const fg = fgRes?.data?.[0]?.value ? parseInt(fgRes.data[0].value) : a.fearGreed;
        // Auto-apply CNN stock Fear & Greed to stock/etf assets
        const stockFg = (stockFgRes && !stockFgRes.error) ? stockFgRes.score : a.fearGreed;
        const isEquity = a.type === "stock" || a.type === "etf";
        return {
          ...a,
          currentPrice: p.price,
          change24h: p.change24h,
          // Technical indicators now come live from /api/prices on every refresh
          // (previously these were only set once at add-time and never updated,
          // and rsi was hardcoded to 50). Guarded so a transient/missing value
          // never overwrites a good one back to zero.
          ...(p.high52w ? { high52w: p.high52w } : {}),
          ...(p.low52w ? { low52w: p.low52w } : {}),
          ...(p.ma200 ? { ma200: p.ma200 } : {}),
          ...(p.rsi ? { rsi: p.rsi } : {}),
          ...(p.periods ? { periods: p.periods } : {}),
          ...(a.type === "crypto" ? { fearGreed: fg } : {}),
          ...(isEquity ? { fearGreed: stockFg } : {}),
        };
      }));
      setLastUpdated(new Date());
      setLiveStatus("ok");
    } else {
      setLiveStatus("error");
    }

    // Check price alerts
    if (Object.keys(prices).length > 0) {
      setAlerts(prev => {
        const triggered = [];
        const updated = prev.map(alert => {
          const price = prices[alert.symbol]?.price;
          if (!price || alert.triggered) return alert;
          const hit = alert.direction === "below" ? price <= alert.target : price >= alert.target;
          if (hit) {
            triggered.push(alert);
            // Browser notification
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(`Accrue Alert: ${alert.symbol}`, {
                body: `${alert.symbol} is ${alert.direction} $${alert.target} — now $${price.toFixed(2)}`,
                icon: "/icon-192.png",
              });
            }
            return { ...alert, triggered: true };
          }
          return alert;
        });
        if (triggered.length > 0) setTriggeredAlerts(t => [...t, ...triggered]);
        return updated;
      });
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
    // Request notification permission for alerts
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    refreshPrices(watchlist);
    const interval = setInterval(() => refreshPrices(), 60000);
    return () => clearInterval(interval);
  }, [loaded]);

  useEffect(() => {
    if (!sessionChecked || !session) return; // wait until we actually know who's logged in
    (async () => {
      const userId = session.user.id;
      const localWatchlist = await load("pf_watchlist_v3", null);
      const remoteWatchlist = await fetchWatchlistFromSupabase(userId);

      if (remoteWatchlist !== null && remoteWatchlist.length > 0) {
        // Supabase already has data for this account — that's the source of truth now
        setWatchlist(remoteWatchlist);
      } else if (localWatchlist && localWatchlist.length > 0) {
        // First time this account has synced, but there's existing local data from
        // before accounts existed — migrate it up to Supabase once, then use it
        const migrated = [];
        for (const asset of localWatchlist) {
          const newId = await pushWatchlistItemToSupabase(userId, asset);
          migrated.push({ ...asset, id: newId || asset.id, _synced: !!newId });
        }
        setWatchlist(migrated);
      } else {
        setWatchlist(DEFAULT_WATCHLIST);
      }

      const localPortfolio = await load("pf_portfolio_v4", null);
      const remotePortfolio = await fetchTradesFromSupabase(userId);

      if (remotePortfolio !== null && remotePortfolio.length > 0) {
        setPortfolio(remotePortfolio);
      } else if (localPortfolio && localPortfolio.length > 0) {
        const migratedTrades = [];
        for (const trade of localPortfolio) {
          const newId = await pushTradeToSupabase(userId, trade);
          migratedTrades.push({ ...trade, id: newId || trade.id, _synced: !!newId });
        }
        setPortfolio(migratedTrades);
      } else {
        setPortfolio(DEFAULT_PORTFOLIO);
      }

      setLoaded(true);
    })();
  }, [sessionChecked, session]);
  useEffect(() => { if (loaded) save("pf_watchlist_v3", watchlist); }, [watchlist, loaded]);

  // Fetch benchmark period returns for insights — generalized so any symbol can be
  // compared against, not just SPY. Reuses the same period-return math for each.
  useEffect(() => {
    if (tab !== "insights") return;
    const calcPeriodReturn = (points, daysBack) => {
      if (points.length < 2) return null;
      if (daysBack === 1) {
        const start = points[points.length - 2].v;
        const end = points[points.length - 1].v;
        return parseFloat((((end - start) / start) * 100).toFixed(2));
      }
      const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;
      const periodPoints = points.filter(p => p.t >= cutoff);
      if (periodPoints.length < 2) return null;
      const start = periodPoints[0].v;
      const end = periodPoints[periodPoints.length - 1].v;
      return parseFloat((((end - start) / start) * 100).toFixed(2));
    };

    const fetchBenchmarkPeriods = async (symbol) => {
      try {
        const res = await fetch(apiUrl("/api/sparkline"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol }),
        });
        const data = await res.json();
        const points = data.points || [];
        if (points.length < 2) return null;
        return {
          daily: calcPeriodReturn(points, 1),
          weekly: calcPeriodReturn(points, 7),
          monthly: calcPeriodReturn(points, 30),
        };
      } catch {
        return null;
      }
    };

    const fetchAll = async () => {
      const [spy, qqq, btc, gld] = await Promise.all([
        fetchBenchmarkPeriods("SPY"),
        fetchBenchmarkPeriods("QQQ"),
        fetchBenchmarkPeriods("BTC-USD"),
        fetchBenchmarkPeriods("GLD"),
      ]);
      setSpyPeriodData(spy || {});
      setBenchmarkData({ SPY: spy, QQQ: qqq, BTC: btc, GLD: gld });
    };
    fetchAll();
  }, [tab]);
  useEffect(() => { if (loaded) save("pf_portfolio_v4", portfolio); }, [portfolio, loaded]);

  // Build real day-by-day P&L history (last 90 days) for the Portfolio chart and
  // the Insights tab's period-over-period metrics — both need real historical prices
  // instead of the current-only snapshot positionSummaries provides.
  useEffect(() => {
    if ((tab !== "portfolio" && tab !== "insights") || portfolio.length === 0) return;
    const fetchPnlHistory = async () => {
      setPnlHistoryLoading(true);
      try {
        const symbols = [...new Set(portfolio.map(t => t.symbol))];
        // Fetch 3 months of daily price history per symbol (covers the 90-day window with margin)
        const histories = await Promise.all(symbols.map(async (sym) => {
          try {
            const res = await fetch(apiUrl("/api/sparkline"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ symbol: sym, range: "3mo" }),
            });
            const data = await res.json();
            return { symbol: sym, points: data.points || [] };
          } catch {
            return { symbol: sym, points: [] };
          }
        }));

        // Build a lookup: symbol -> { "YYYY-MM-DD": closePrice }
        const priceBySymbolDate = {};
        histories.forEach(({ symbol, points }) => {
          priceBySymbolDate[symbol] = {};
          points.forEach(p => {
            const dateStr = new Date(p.t).toISOString().slice(0, 10);
            priceBySymbolDate[symbol][dateStr] = p.v;
          });
        });
        setPriceHistoryBySymbol(priceBySymbolDate);

        // Walk the last 90 calendar days, computing real unrealised P&L across all positions
        const today = new Date();
        const days = 90;
        const series = [];
        let lastKnownPrice = {}; // carries forward over weekends/holidays when a symbol has no price that day

        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().slice(0, 10);

          let totalPnl = 0;
          symbols.forEach(sym => {
            const tradesUpToDate = portfolio.filter(t => t.symbol === sym && t.date <= dateStr);
            if (tradesUpToDate.length === 0) return;
            const priceToday = priceBySymbolDate[sym]?.[dateStr];
            if (priceToday != null) lastKnownPrice[sym] = priceToday;
            const usePrice = lastKnownPrice[sym];
            const pos = calcPositionAsOf(tradesUpToDate, usePrice);
            totalPnl += pos.unrealisedPnl;
          });

          series.push({ date: dateStr.slice(5), pnl: parseFloat(totalPnl.toFixed(2)) });
        }

        setPnlHistory(series);
      } catch (e) {
        setPnlHistory([]);
      }
      setPnlHistoryLoading(false);
    };
    fetchPnlHistory();
  }, [tab, portfolio]);

  // Load alerts
  useEffect(() => {
    if (!sessionChecked || !session) return;
    (async () => {
      const userId = session.user.id;
      const localAlerts = await load("pf_alerts_v1", null);
      const remoteAlerts = await fetchAlertsFromSupabase(userId);

      if (remoteAlerts !== null && remoteAlerts.length > 0) {
        setAlerts(remoteAlerts);
      } else if (localAlerts && localAlerts.length > 0) {
        const migrated = [];
        for (const alert of localAlerts) {
          const newId = await pushAlertToSupabase(userId, alert);
          migrated.push({ ...alert, id: newId || alert.id, _synced: !!newId });
        }
        setAlerts(migrated);
      } else {
        setAlerts([]);
      }
      setAlertsLoaded(true);
    })();
  }, [sessionChecked, session]);
  useEffect(() => { if (alertsLoaded) save("pf_alerts_v1", alerts); }, [alerts, alertsLoaded]);

  // Load cash accounts
  useEffect(() => {
    if (!sessionChecked || !session) return;
    (async () => {
      const userId = session.user.id;
      const localCash = await load("pf_cash_v1", null);
      const remoteCash = await fetchCashAccountsFromSupabase(userId);

      if (remoteCash !== null && remoteCash.length > 0) {
        setCashAccounts(remoteCash);
      } else if (localCash && localCash.length > 0) {
        const migrated = [];
        for (const account of localCash) {
          const newId = await pushCashAccountToSupabase(userId, account);
          migrated.push({ ...account, id: newId || account.id, _synced: !!newId });
        }
        setCashAccounts(migrated);
      } else {
        setCashAccounts([]);
      }
      setCashLoaded(true);
    })();
  }, [sessionChecked, session]);
  useEffect(() => { if (cashLoaded) save("pf_cash_v1", cashAccounts); }, [cashAccounts, cashLoaded]);

  // Load properties
  useEffect(() => {
    if (!sessionChecked || !session) return;
    (async () => {
      const userId = session.user.id;
      const localProperties = await load("pf_properties_v1", null);
      const remoteProperties = await fetchPropertiesFromSupabase(userId);

      if (remoteProperties !== null && remoteProperties.length > 0) {
        setProperties(remoteProperties);
      } else if (localProperties && localProperties.length > 0) {
        const migrated = [];
        for (const property of localProperties) {
          const newId = await pushPropertyToSupabase(userId, property);
          migrated.push({ ...property, id: newId || property.id, _synced: !!newId });
        }
        setProperties(migrated);
      } else {
        setProperties([]);
      }
      setPropertiesLoaded(true);
    })();
  }, [sessionChecked, session]);
  useEffect(() => { if (propertiesLoaded) save("pf_properties_v1", properties); }, [properties, propertiesLoaded]);

  const saveWatch = async (form) => {
    if (watchModal?.asset) {
      const updated = { ...form, id: watchModal.asset.id, _synced: watchModal.asset._synced };
      setWatchlist(w => w.map(x => x.id === watchModal.asset.id ? updated : x));
      if (session?.user?.id) {
        const realId = await pushWatchlistItemToSupabase(session.user.id, updated);
        if (realId) setWatchlist(w => w.map(x => x.id === updated.id ? { ...x, id: realId, _synced: true } : x));
      }
    } else {
      const tempId = Date.now();
      const newAsset = { ...form, id: tempId, _synced: false };
      setWatchlist(w => [...w, newAsset]);
      if (session?.user?.id) {
        const realId = await pushWatchlistItemToSupabase(session.user.id, newAsset);
        if (realId) setWatchlist(w => w.map(x => x.id === tempId ? { ...x, id: realId, _synced: true } : x));
      }
    }
    setWatchModal(null);
  };

  // Group trades by symbol
  // Normalise symbols to uppercase to prevent duplicate positions
  const positions = portfolio.reduce((acc, t) => { const sym = (t.symbol||"").toUpperCase().trim(); if (!acc[sym]) acc[sym]=[]; acc[sym].push({...t, symbol: sym}); return acc; }, {});

  // Portfolio summary using live prices. Falls back to the cached last-known
  // price (priceMap) so removing an asset from the watchlist no longer zeroes
  // out its portfolio position.
  const getLivePrice = (sym) => {
    const a = watchlist.find(x => x.symbol === sym);
    return a?.currentPrice || priceMap[sym] || 0;
  };
  const positionSummaries = Object.entries(positions).map(([sym, trades]) => ({ sym, trades, pos: calcPosition(trades, getLivePrice(sym)) }));

  // Cash totals
  const totalCashPrincipal = cashAccounts.reduce((s, a) => s + (a.principal || 0), 0);
  const totalCashValue = cashAccounts.reduce((s, a) => s + calcCashValue(a).currentValue, 0);
  const totalCashInterest = Math.max(0, totalCashValue - totalCashPrincipal);

  // Cost basis & current value — includes cash (principal counts as "basis", current value includes accrued interest)
  const totalCostBasis = positionSummaries.reduce((s,{pos}) => s+pos.costBasis, 0) + totalCashPrincipal;
  const totalCurrentValue = positionSummaries.reduce((s,{pos}) => s+pos.currentValue, 0) + totalCashValue;

  const totalUnrealisedPnl = positionSummaries.reduce((s,{pos}) => s+pos.unrealisedPnl, 0);
  // Cash interest is treated as realised gain — it's locked in daily compounding, not subject to market risk like an open position
  const totalRealisedPnl = positionSummaries.reduce((s,{pos}) => s+pos.realisedPnl, 0) + totalCashInterest;
  const totalPnl = totalUnrealisedPnl + totalRealisedPnl;
  const totalPnlPct = totalCostBasis > 0 ? (totalPnl/totalCostBasis)*100 : 0;

  const filterMap = {
    all: watchlist,
    crypto: watchlist.filter(a => a.type === "crypto"),
    etf: watchlist.filter(a => a.type === "etf"),
    stock: watchlist.filter(a => a.type === "stock"),
    commodity: watchlist.filter(a => a.type === "commodity"),
  };
  const filteredWatch = filterMap[filterSig] || watchlist;
  const buyableCount = watchlist.filter(a => ["strong-buy","dip"].includes(calcSignal(a).signal)).length;

  // Auth gate — show nothing meaningful until we know whether there's a session,
  // then the login/signup screen if there isn't one, before any app data loads.
  if (!sessionChecked || !minSplashTimeElapsed) {
    // We don't know the account's theme yet (that lives in Supabase, tied to a
    // session we haven't resolved), but we can use whatever was last cached in
    // local storage as a very-likely-correct approximation, rather than always
    // showing a fixed dark screen that flashes jarringly against a light/cyberpunk
    // theme before the real app takes over.
    let cachedTheme = "dark";
    try { cachedTheme = localStorage.getItem("accrue_theme") || "dark"; } catch {}
    const splashBg = cachedTheme === "light" ? "#eceae5" : cachedTheme === "cyberpunk" ? "#0a0014" : "#07090c";
    const splashText = cachedTheme === "light" ? "rgba(28,29,27,0.55)" : cachedTheme === "cyberpunk" ? "rgba(0,240,255,0.6)" : "rgba(240,245,242,0.35)";
    return (
      <div style={{ minHeight: "100vh", background: splashBg, display: "flex", alignItems: "center", justifyContent: "center", animation: "splashFadeIn 0.5s ease" }}>
        <style>{`@keyframes splashFadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
        <div style={{ fontFamily: FONT, fontWeight: 100, color: splashText, fontSize: 18, letterSpacing: 8, animation: "splashFadeIn 0.7s ease" }}>accrue</div>
      </div>
    );
  }
  if (!session) return <AuthScreen onAuthed={(s) => setSession(s)} />;

  if (!loaded || !minSplashTimeElapsed) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", animation: "splashFadeIn 0.5s ease" }}>
      <style>{`@keyframes splashFadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
      <div style={{ fontFamily: FONT, fontWeight: 100, color: C.text3, fontSize: 18, letterSpacing: 8, animation: "splashFadeIn 0.7s ease" }}>accrue</div>
    </div>
  );

  return (
    <>
      {!onboarded && <OnboardingScreen onComplete={completeOnboarding} />}
      {onboarded && <div className={theme === "cyberpunk" ? "accrue-cyberpunk" : ""} style={{ minHeight: "100vh", position: "relative", background: theme === "light" ? C.bg : theme === "cyberpunk" ? "linear-gradient(160deg, #1a0030 0%, #0a0014 45%, #150a28 100%)" : "linear-gradient(180deg, #090b0e 0%, #08090a 100%)", backgroundSize: theme === "cyberpunk" ? "200% 200%" : undefined, color: C.text1, fontFamily: FONT, fontWeight: 300, padding: "env(safe-area-inset-top, 28px) 20px calc(env(safe-area-inset-bottom, 0px) + 80px) 20px" }}>
      {theme === "cyberpunk" && (
        <style>{`
          /* ── Borders run thicker across the board. Setting border-width alone is safe:
             CSS only renders a border when border-style is also set to something visible,
             so elements with no border at all (border: none, the vast majority) are
             completely unaffected — their border-style stays "none" regardless. ── */
          .accrue-cyberpunk * {
            border-width: 2px !important;
          }

          /* ── Slowly drifting background gradient instead of a static one. Animates
             background-position across an oversized gradient — pure CSS, no JS, and
             since it's a background property it never affects layout or content flow. ── */
          .accrue-cyberpunk {
            animation: cyberDrift 18s ease-in-out infinite;
          }
          @keyframes cyberDrift {
            0%   { background-position: 0% 0%; }
            50%  { background-position: 100% 100%; }
            100% { background-position: 0% 0%; }
          }

          /* ── Neon glow on every piece of text in the app, not just headlines — every
             number, label, and letter gets a bloom. Text-shadow occupies zero layout
             space (it paints outside the text's box without changing line height, width,
             or position), so applying it universally still can't cause overlap, reflow,
             or any layout shift — it's purely a paint-time glow on top of existing text. ── */
          .accrue-cyberpunk * {
            text-shadow: 0 0 6px currentColor, 0 0 14px currentColor;
          }

          /* ── Soft outer glow on every card/button border, on top of the existing
             border color — box-shadow renders outside the box and never affects layout,
             sibling positioning, or click targets (since "outside" the box doesn't mean
             "on top of" neighboring elements at normal spacing). ── */
          .accrue-cyberpunk [style*="border"] {
            box-shadow: 0 0 6px rgba(0,240,255,0.15), 0 0 14px rgba(255,0,200,0.08);
          }

          /* ── Scanline overlay — classic CRT/cyberpunk texture. A fixed, full-screen
             pseudo-element layered on top via z-index, with pointer-events: none so it
             can never intercept taps or clicks on the real UI underneath it. Decorative
             only — it isn't part of the DOM layout flow (position: fixed removes it from
             flow entirely), so it cannot push, resize, or shift any real content. ── */
          .accrue-cyberpunk::before {
            content: "";
            position: fixed;
            inset: 0;
            background: repeating-linear-gradient(
              0deg,
              rgba(0,240,255,0.025) 0px,
              rgba(0,240,255,0.025) 1px,
              transparent 1px,
              transparent 3px
            );
            pointer-events: none;
            z-index: 600;
            mix-blend-mode: screen;
          }

          /* ── Broken-lamp flicker on the wordmark — irregular opacity drops layered with
             a chromatic-aberration glitch, mimicking a failing fluorescent tube rather
             than a smooth periodic pulse. Runs on a short 2.4s cycle with several uneven
             flicker points rather than one predictable beat, then settles "on" most of
             the time so it reads as occasional failure, not constant strobing. Scoped to
             the wordmark's own class only — transform/opacity/text-shadow are all
             paint/compositing properties, none of which affect layout or other elements. ── */
          .accrue-letter-cyber {
            animation: cyberLamp 2.4s infinite;
          }
          @keyframes cyberLamp {
            0%   { opacity: 1;    text-shadow: none; transform: translateX(0); }
            4%   { opacity: 0.2;  text-shadow: -2px 0 #ff0a6c, 2px 0 #00f0ff; transform: translateX(-1px); }
            6%   { opacity: 1;    text-shadow: none; transform: translateX(0); }
            9%   { opacity: 0.3;  text-shadow: 2px 0 #ff0a6c, -2px 0 #00f0ff; transform: translateX(1px); }
            11%  { opacity: 1;    text-shadow: none; transform: translateX(0); }
            12%  { opacity: 0.15; text-shadow: -1px 0 #ff0a6c, 1px 0 #00f0ff; transform: translateX(-1px); }
            14%  { opacity: 1;    text-shadow: none; transform: translateX(0); }
            45%  { opacity: 1;    text-shadow: none; transform: translateX(0); }
            47%  { opacity: 0.25; text-shadow: 2px 0 #00f0ff, -2px 0 #ff0a6c; transform: translateX(1px); }
            49%  { opacity: 1;    text-shadow: none; transform: translateX(0); }
            50%  { opacity: 0.4;  text-shadow: -2px 0 #00f0ff, 2px 0 #ff0a6c; transform: translateX(-1px); }
            52%  { opacity: 1;    text-shadow: none; transform: translateX(0); }
            85%  { opacity: 1;    text-shadow: none; transform: translateX(0); }
            87%  { opacity: 0.2;  text-shadow: -2px 0 #ff0a6c, 2px 0 #00f0ff; transform: translateX(1px); }
            88%  { opacity: 0.6;  text-shadow: 1px 0 #00f0ff, -1px 0 #ff0a6c; transform: translateX(-1px); }
            90%  { opacity: 0.15; text-shadow: -2px 0 #ff0a6c, 2px 0 #00f0ff; transform: translateX(0); }
            92%  { opacity: 1;    text-shadow: none; transform: translateX(0); }
            100% { opacity: 1;    text-shadow: none; transform: translateX(0); }
          }

          /* ── Animated gradient text on the wordmark itself, replacing the flat color
             with a shifting magenta-to-cyan sweep. background-clip: text is well
             supported and purely a paint-time effect — it doesn't change the element's
             box model, so surrounding layout is unaffected. ── */
          .accrue-wordmark-cyber {
            background: linear-gradient(90deg, #ff0a6c, #00f0ff, #00ff9d, #ff0a6c);
            background-size: 300% 100%;
            -webkit-background-clip: text;
            background-clip: text;
            animation: cyberTextSweep 5s linear infinite;
          }
          .accrue-wordmark-cyber .accrue-letter-cyber {
            color: transparent !important;
            -webkit-text-fill-color: transparent;
          }
          @keyframes cyberTextSweep {
            0%   { background-position: 0% 50%; }
            100% { background-position: 300% 50%; }
          }
        `}</style>
      )}
      {/* ── ACCRUE HEADER ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Hamburger menu */}
            <button onClick={() => setNavOpen(true)} style={{ background: "transparent", border: "none", color: C.text2, cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }} aria-label="Open menu">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <line x1="2" y1="5" x2="18" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="2" y1="15" x2="18" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            {/* ACCRUE wordmark — letter fade */}
            <div className={theme === "cyberpunk" ? "accrue-wordmark-cyber" : ""} style={{ display: "flex", alignItems: "center", gap: 0, lineHeight: 1 }}>
              {[
                ["A", 1.0],
                ["C", 0.92],
                ["C", 0.84],
                ["R", 0.76],
                ["U", 0.68],
                ["E", 0.60],
              ].map(([letter, opacity], i) => (
                <span key={i} className={theme === "cyberpunk" ? "accrue-letter-cyber" : ""} style={{
                  fontSize: 26,
                  fontWeight: 200,
                  letterSpacing: 6,
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                  color: C.text1,
                  opacity: opacity,
                  display: "inline-block",
                }}>{letter}</span>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Currency toggle */}
            <div style={{ position: "relative" }}>
              <button onClick={() => setCurrencyPickerOpen(o => !o)}
                style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.text2, borderRadius: 6, padding: "7px 10px", fontSize: 11, fontFamily: MONO, fontWeight: 500, cursor: "pointer", marginTop: 2, letterSpacing: 1 }}>
                {displayCurrency}
              </button>
              {currencyPickerOpen && (
                <>
                  <div onClick={() => setCurrencyPickerOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 350 }} />
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: C.surfaceHigh, border: `1px solid ${C.borderHover}`, borderRadius: 8, padding: 4, zIndex: 351, minWidth: 160, maxHeight: 280, overflowY: "auto" }}>
                    {Object.keys(CURRENCY_SYMBOLS).map(cur => (
                      <button key={cur} onClick={() => { changeDisplayCurrency(cur); setCurrencyPickerOpen(false); }}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: cur === displayCurrency ? "rgba(255,255,255,0.06)" : "transparent", border: "none", borderRadius: 6, padding: "8px 10px", cursor: "pointer", textAlign: "left" }}>
                        <span style={{ fontSize: 12, fontFamily: FONT, fontWeight: 300, color: cur === displayCurrency ? C.text1 : C.text2 }}>{cur} <span style={{ color: C.text3, fontSize: 10 }}>{CURRENCY_NAMES[cur]}</span></span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Refresh + live status */}
            <button onClick={() => refreshPrices()} disabled={liveStatus==="fetching"}
              style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.text3, borderRadius: 6, padding: "7px 10px", fontSize: 13, fontFamily: FONT, cursor: liveStatus==="fetching"?"default":"pointer", display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
              <span style={{ display: "inline-block", animation: liveStatus==="fetching"?"spin 1s linear infinite":"none" }}>↻</span>
              <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
            </button>
          </div>
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

          <div style={{ display:"flex", gap:6, marginBottom:18, overflowX:"auto", paddingBottom:4, WebkitOverflowScrolling:"touch", scrollbarWidth:"none" }}>
            {[["all","All"],["crypto","Crypto"],["etf","ETF"],["stock","Stocks"],["commodity","Commodities"]].map(([f,l]) => (
              <button key={f} onClick={() => setFilterSig(f)} style={{ background: filterSig===f?C.surface:"transparent", border:`1px solid ${filterSig===f?C.borderHover:C.border}`, color:filterSig===f?C.text1:C.text3, borderRadius:4, padding:"4px 12px", fontSize:10, fontFamily:FONT, fontWeight:300, cursor:"pointer", whiteSpace:"nowrap", letterSpacing:0.3 }}>{l}</button>
            ))}
          </div>

          {/* Period toggle — controls which return is shown on each card's % */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:18 }}>
            <span style={{ fontSize:9, color:C.text3, fontFamily:MONO, letterSpacing:2, flexShrink:0 }}>RETURN</span>
            <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4, WebkitOverflowScrolling:"touch", scrollbarWidth:"none" }}>
              {[["day","1D"],["week","1W"],["month","1M"],["year","1Y"],["all","All"]].map(([p,l]) => (
                <button key={p} onClick={() => setWatchPeriod(p)} style={{ background: watchPeriod===p?C.surface:"transparent", border:`1px solid ${watchPeriod===p?C.borderHover:C.border}`, color:watchPeriod===p?C.text1:C.text3, borderRadius:4, padding:"4px 12px", fontSize:10, fontFamily:MONO, cursor:"pointer", whiteSpace:"nowrap", letterSpacing:0.5 }}>{l}</button>
              ))}
            </div>
          </div>

          {/* Combined Fear & Greed card — crypto + stocks + VIX side by side */}
          {(fearGreedData || stockFearGreed || vixData) && (() => {
            const getColor = v => v <= 25 ? C.red : v <= 45 ? C.amber : v <= 55 ? C.text3 : v <= 75 ? "rgba(74,222,128,0.6)" : C.green;
            // VIX uses the same direct framing — high volatility (panic) red, low (complacent) green
            const vixColor = l => l === "panic" ? C.red : l === "elevated" ? C.amber : l === "calm" ? "rgba(74,222,128,0.6)" : C.green;

            const cols = [
              fearGreedData && { key: "crypto", label: "CRYPTO", value: fearGreedData.value, sub: fearGreedData.label, color: getColor(fearGreedData.value) },
              stockFearGreed && { key: "stocks", label: "STOCKS", value: stockFearGreed.score, sub: (stockFearGreed.rating || "").replace(/\b\w/g, c => c.toUpperCase()) || "—", color: getColor(stockFearGreed.score) },
              vixData && { key: "vix", label: "VOLATILITY", value: vixData.value, sub: vixData.label, color: vixColor(vixData.level) },
            ].filter(Boolean);

            return (
              <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 12, textAlign: "center" }}>MARKET SENTIMENT</div>
                <div style={{ display: "flex", gap: 0 }}>
                  {cols.map((col, i) => (
                    <React.Fragment key={col.key}>
                      {i > 0 && <div style={{ width: 1, background: C.border, margin: "2px 10px" }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 1, marginBottom: 3 }}>{col.label}</div>
                        <div style={{ fontSize: 18, fontWeight: 500, fontFamily: FONT, color: col.color, letterSpacing: -0.5, lineHeight: 1.1 }}>{col.value}</div>
                        <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, marginTop: 2 }}>{col.sub}</div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })()}

          {filteredWatch.length === 0
            ? <div style={{ textAlign:"center", color:C.text3, fontFamily:FONT, fontWeight:300, fontSize:13, padding:"40px 0" }}>No assets match filter</div>
            : filteredWatch.map(a => <WatchCard key={a.id} asset={a} period={watchPeriod}
                onDelete={id => {
                  setWatchlist(w => w.filter(x => x.id !== id));
                  if (session?.user?.id) deleteWatchlistItemFromSupabase(session.user.id, id);
                }}
                onNotesUpdate={(id, note) => {
                  setWatchlist(w => w.map(x => x.id === id ? {...x, notes: note} : x));
                  const asset = watchlist.find(x => x.id === id);
                  if (session?.user?.id && asset) pushWatchlistItemToSupabase(session.user.id, { ...asset, notes: note });
                }}
                onThesisUpdate={(id, thesis) => {
                  setWatchlist(w => w.map(x => x.id === id ? {...x, thesis} : x));
                  const asset = watchlist.find(x => x.id === id);
                  if (session?.user?.id && asset) pushWatchlistItemToSupabase(session.user.id, { ...asset, thesis });
                }}
                onAlert={(asset) => setAlertModal({ symbol: asset.symbol, currentPrice: asset.currentPrice })} alertCount={alerts.filter(al => al.symbol === a.symbol && !al.triggered).length} onLogTrade={(sym) => setTradeModal({ defaultType: "buy", symbol: sym })} />)
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
                  if (portfolio.length === 0 && cashAccounts.length === 0) return null;

                  const COLORS = [C.green, C.blue, C.amber, "#c77dff", "#f87171", "#67e8f9", "#a8e6cf"];

                  // Build combined list of holdings: positions + cash accounts
                  const holdings = [
                    ...positionSummaries.map(({sym, pos}) => ({ name: sym, value: pos.currentValue })),
                    ...cashAccounts.map(a => ({ name: a.institution, value: calcCashValue(a).currentValue })),
                  ];

                  const total = holdings.reduce((s, h) => s + h.value, 0) || 1;

                  const donutData = holdings.length > 1
                    ? holdings.map((h, i) => ({
                        name: h.name,
                        value: parseFloat(((h.value / total) * 100).toFixed(1)),
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

                  const positionsCostBasis = positionSummaries.reduce((s,{pos}) => s+pos.costBasis, 0);

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
                      truePnl={totalUnrealisedPnl}
                      totalCostBasisNow={positionsCostBasis}
                      pnlHistory={pnlHistory}
                      pnlHistoryLoading={pnlHistoryLoading}
                    />
                  );
                })()}

                {positionSummaries.map(({sym, trades}) => (
                  <PositionCard key={sym} trades={trades} currentPrice={getLivePrice(sym)}
                    onDelete={id => {
                      setPortfolio(p => p.filter(x => x.id !== id));
                      if (session?.user?.id) deleteTradeFromSupabase(session.user.id, id);
                    }}
                    onAddTrade={(sym) => setTradeModal({ defaultType:"buy", symbol:sym })}
                    onEdit={(trade) => setEditTradeModal(trade)} />
                ))}
              </>
            )
          }
          {/* Cash accounts */}
          {cashAccounts.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 10, marginTop: 4 }}>CASH & INTEREST</div>
              {cashAccounts.map(a => (
                <CashCard key={a.id} account={a}
                  onEdit={a => setCashModal(a)}
                  onDelete={id => {
                    setCashAccounts(c => c.filter(x => x.id !== id));
                    if (session?.user?.id) deleteCashAccountFromSupabase(session.user.id, id);
                  }}
                  onAddCash={a => setCashModal({ topUpFor: a.institution, existingRate: a.rate, existingAccountType: a.accountType })}
                />
              ))}
            </div>
          )}

          {/* Investment properties */}
          {properties.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 9, color: C.text3, fontFamily: MONO, letterSpacing: 2, marginBottom: 10, marginTop: 4 }}>INVESTMENT PROPERTIES</div>
              {properties.map(p => (
                <PropertyCard key={p.id} property={p}
                  onEdit={p => setPropertyModal(p)}
                  onDelete={id => {
                    setProperties(ps => ps.filter(x => x.id !== id));
                    if (session?.user?.id) deletePropertyFromSupabase(session.user.id, id);
                  }}
                />
              ))}
            </div>
          )}

          <button onClick={() => setPropertyModal("new")} style={{ width: "100%", marginTop: 10, background:"transparent", border:`1px dashed ${C.border}`, color:C.text3, borderRadius:8, padding:"14px 0", fontSize:11, fontFamily:FONT, fontWeight:300, cursor:"pointer", letterSpacing:1 }}>+ Add property</button>

          <button onClick={() => setTradeModal({defaultType:"buy"})} style={{ width: "100%", marginTop: 10, background:"transparent", border:`1px dashed ${C.border}`, color:C.text3, borderRadius:8, padding:"14px 0", fontSize:11, fontFamily:FONT, fontWeight:300, cursor:"pointer", letterSpacing:1 }}>+ Log trade</button>
        </>
      )}

      {tab === "insights" && (
        <InsightsTab
          portfolio={portfolio}
          watchlist={watchlist}
          positionSummaries={positionSummaries}
          period={insightsPeriod}
          setPeriod={setInsightsPeriod}
          spyPeriodData={spyPeriodData}
          getLivePrice={getLivePrice}
          cashAccounts={cashAccounts}
          priceHistoryBySymbol={priceHistoryBySymbol}
          priceHistoryLoading={pnlHistoryLoading}
          benchmarkData={benchmarkData}
          selectedBenchmark={selectedBenchmark}
          setSelectedBenchmark={(b) => {
            setSelectedBenchmark(b);
            try { localStorage.setItem("accrue_benchmark", b); } catch {}
            if (session?.user?.id) pushPreferencesToSupabase(session.user.id, { theme, displayCurrency, selectedBenchmark: b, onboarded });
          }}
        />
      )}

      <div style={{ textAlign:"center", marginTop:32, fontSize:9, color:C.text3, fontFamily:MONO, letterSpacing:2, opacity:0.4 }}>
        {lastUpdated ? `Last sync ${lastUpdated.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}` : "Accrue"}
      </div>

      {/* Triggered alerts toast */}
      {triggeredAlerts.length > 0 && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 400, display: "flex", flexDirection: "column", gap: 8, width: "90%", maxWidth: 400 }}>
          {triggeredAlerts.slice(-3).map((a, i) => (
            <div key={a.id} style={{ background: C.surfaceHigh, border: `1px solid ${C.amber}55`, borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: C.text1, fontFamily: FONT, fontWeight: 400 }}>🔔 {a.symbol} alert triggered</div>
                <div style={{ fontSize: 11, color: C.text3, fontFamily: MONO, marginTop: 2 }}>{a.direction === "below" ? "↓" : "↑"} {fmtUSD(a.target)}</div>
              </div>
              <button onClick={() => setTriggeredAlerts(t => t.filter(x => x.id !== a.id))}
                style={{ background: "transparent", border: "none", color: C.text3, fontSize: 16, cursor: "pointer" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {watchModal !== null && <WatchModal asset={watchModal.asset} onSave={saveWatch} onClose={() => setWatchModal(null)} />}
      {searchModal && <AssetSearchModal onAdd={asset => {
        setWatchlist(w => [...w, { ...asset, _synced: false }]);
        if (session?.user?.id) {
          pushWatchlistItemToSupabase(session.user.id, asset).then(realId => {
            if (realId) setWatchlist(w => w.map(x => x.id === asset.id ? { ...x, id: realId, _synced: true } : x));
          });
        }
      }} onClose={() => setSearchModal(false)} />}
      {alertModal && <AlertModal symbol={alertModal.symbol} currentPrice={alertModal.currentPrice} alerts={alerts}
        onSave={alert => {
          const tempId = alert.id || Date.now();
          const newAlert = { ...alert, id: tempId, _synced: false };
          setAlerts(a => [...a, newAlert]);
          if (session?.user?.id) {
            pushAlertToSupabase(session.user.id, newAlert).then(realId => {
              if (realId) setAlerts(a => a.map(x => x.id === tempId ? { ...x, id: realId, _synced: true } : x));
            });
          }
        }}
        onDelete={id => {
          setAlerts(a => a.filter(x => x.id !== id));
          if (session?.user?.id) deleteAlertFromSupabase(session.user.id, id);
        }}
        onClose={() => setAlertModal(null)} />}
      {cashModal !== null && <CashModal account={cashModal} onSave={acc => {
        const isMergeCase = cashModal === "new" || (typeof cashModal === "object" && cashModal.topUpFor);
        if (isMergeCase) {
          // Check for existing account with same institution name (case-insensitive)
          setCashAccounts(c => {
            const existingIdx = c.findIndex(x => x.institution.trim().toLowerCase() === acc.institution.trim().toLowerCase());
            if (existingIdx !== -1) {
              // Merge: add new principal to existing, keep existing start date (don't reset compounding clock)
              const existing = c[existingIdx];
              const merged = {
                ...existing,
                principal: existing.principal + acc.principal,
                rate: acc.rate, // use latest rate in case it changed
                notes: acc.notes || existing.notes,
              };
              if (session?.user?.id) pushCashAccountToSupabase(session.user.id, merged);
              return c.map((x, i) => i === existingIdx ? merged : x);
            }
            const newAccount = { ...acc, _synced: false };
            if (session?.user?.id) {
              pushCashAccountToSupabase(session.user.id, newAccount).then(realId => {
                if (realId) setCashAccounts(cs => cs.map(x => x.id === newAccount.id ? { ...x, id: realId, _synced: true } : x));
              });
            }
            return [...c, newAccount];
          });
        } else {
          const updated = { ...acc, _synced: cashModal._synced };
          setCashAccounts(c => c.map(x => x.id === acc.id ? updated : x));
          if (session?.user?.id) pushCashAccountToSupabase(session.user.id, updated);
        }
        setCashModal(null);
      }} onClose={() => setCashModal(null)} />}
      {propertyModal !== null && <PropertyModal property={propertyModal} onSave={p => {
        if (propertyModal === "new") {
          const tempId = p.id || Date.now();
          const newProperty = { ...p, id: tempId, _synced: false };
          setProperties(ps => [...ps, newProperty]);
          if (session?.user?.id) {
            pushPropertyToSupabase(session.user.id, newProperty).then(realId => {
              if (realId) setProperties(ps => ps.map(x => x.id === tempId ? { ...x, id: realId, _synced: true } : x));
            });
          }
        } else {
          const updated = { ...p, _synced: propertyModal._synced };
          setProperties(ps => ps.map(x => x.id === p.id ? updated : x));
          if (session?.user?.id) pushPropertyToSupabase(session.user.id, updated);
        }
        setPropertyModal(null);
      }} onClose={() => setPropertyModal(null)} />}
      {editTradeModal && <EditTradeModal trade={editTradeModal} portfolio={portfolio} onSave={(updated) => {
        const withFlag = { ...updated, _synced: editTradeModal._synced };
        setPortfolio(p => p.map(t => t.id === withFlag.id ? withFlag : t));
        if (session?.user?.id) pushTradeToSupabase(session.user.id, withFlag);
        setEditTradeModal(null);
      }} onClose={() => setEditTradeModal(null)} />}
      {tradeModal !== null && <TradeModal watchlist={watchlist} portfolio={portfolio} defaultType={tradeModal.defaultType} defaultSymbol={tradeModal.symbol} onSave={trade => {
        const tempId = trade.id || Date.now();
        const newTrade = { ...trade, id: tempId, _synced: false };
        setPortfolio(p => [...p, newTrade]);
        if (session?.user?.id) {
          pushTradeToSupabase(session.user.id, newTrade).then(realId => {
            if (realId) setPortfolio(p => p.map(t => t.id === tempId ? { ...t, id: realId, _synced: true } : t));
          });
        }
        setTradeModal(null);
      }} onClose={() => setTradeModal(null)} onAddCash={() => setCashModal("new")} />}
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} tab={tab} setTab={setTab} alertCount={alerts.filter(al => !al.triggered).length} onRestartOnboarding={restartOnboarding} displayCurrency={displayCurrency} onOpenCurrencyPicker={() => setCurrencyPickerOpen(true)} onOpenAbout={() => setAboutOpen(true)} theme={theme} onSetTheme={setThemeDirect} onLogout={() => supabase.auth.signOut()} />
      {aboutOpen && <AboutScreen onClose={() => setAboutOpen(false)} />}
    </div>}
    </>
  );
}
