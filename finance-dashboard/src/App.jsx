import { useState, useRef, useEffect } from "react";
import { TODAY, daysUntil, isOverdue, FX, fmtC, toAED, sc, ec } from "./constants";
import STATE from "./state";
import { TEAM, buildSnapshot } from "./team";

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [personalOn, setPersonalOn] = useState(true);
  const [activeSpec, setActiveSpec] = useState(null);
  const [msgs, setMsgs] = useState({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [obligations, setObligations] = useState(STATE.obligations);
  const [decisions, setDecisions] = useState(STATE.decisions);
  const [showAddObl, setShowAddObl] = useState(false);
  const [showAddDec, setShowAddDec] = useState(false);
  const [newObl, setNewObl] = useState({ entity: "ss", class: "payment", priority: "MEDIUM", owner: "", description: "", amount: 0, currency: "AED", due: "", blocking: "" });
  const [newDec, setNewDec] = useState({ entity: "ab", title: "", amount: 0, currency: "GBP", decision_type: "investment", rationale: "", assumptions: "", downside: "", review_date: "" });
  const chatEnd = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading, activeSpec]);

  const visE = personalOn ? STATE.entities : STATE.entities.filter(e => e.type !== "personal");
  const openObl = obligations.filter(o => o.status !== "done");
  const critObl = openObl.filter(o => o.priority === "CRITICAL");
  const overdueObl = openObl.filter(o => isOverdue(o.due));
  const totalCash = visE.reduce((s, e) => s + toAED(e.cash, e.currency), 0);
  const totalBurn = visE.reduce((s, e) => s + toAED(e.monthly_burn, e.currency), 0);
  const totalRec = visE.reduce((s, e) => s + toAED(e.receivables, e.currency), 0);
  const totalPay = visE.reduce((s, e) => s + toAED(e.payables, e.currency), 0);
  const bbAED = STATE.config.beauty_bay_commitment_gbp * FX.GBP;
  const freeCash = totalCash - bbAED;
  const sp = TEAM[activeSpec];

  const send = async () => {
    if (!input.trim() || !activeSpec || loading) return;
    const sysPrompt = `You are ${sp.name}, ${sp.role} for ${STATE.owner.name}.\nBEHAVIORAL RULES: ${sp.rules.join(" | ")}\nRESPONSE FORMAT — use these labeled sections in every response: ${sp.format.join(" | ")}\n${buildSnapshot()}`;
    const userMsg = { role: "user", content: input };
    const prev = msgs[activeSpec] || [];
    const history = [...prev, userMsg];
    setMsgs(m => ({ ...m, [activeSpec]: history }));
    setInput(""); setLoading(true);
    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("Set VITE_ANTHROPIC_API_KEY in .env");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, system: sysPrompt, messages: history }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error.message);
      const reply = d.content?.find(c => c.type === "text")?.text || "No response.";
      setMsgs(m => ({ ...m, [activeSpec]: [...history, { role: "assistant", content: reply }] }));
    } catch (e) {
      setMsgs(m => ({ ...m, [activeSpec]: [...history, { role: "assistant", content: `Error: ${e.message}` }] }));
    }
    setLoading(false);
  };

  const INP = { width: "100%", padding: "6px 9px", borderRadius: 3, background: "#0D0E14", border: "1px solid #242630", color: "#E2D9C8", fontFamily: "'DM Mono',monospace", fontSize: 10.5, marginBottom: 5, boxSizing: "border-box" };
  const LBL = { fontFamily: "'DM Mono',monospace", fontSize: 6.5, color: "#5C5648", letterSpacing: ".16em", display: "block", marginBottom: 2 };
  const TABS = ["DASHBOARD", "ENTITIES", "TREASURY", "OBLIGATIONS", "DECISIONS", "TEAM"];

  return (<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=DM+Mono:wght@300;400;500&family=Crimson+Pro:ital,wght@0,300;0,400;1,300&display=swap');
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      :root{--bg:#060708;--bg2:#09090D;--bg3:#0D0E14;--bg4:#111318;--bd:#1C1E26;--bd2:#242630;--gold:#C9A84C;--tx:#E2D9C8;--tx2:#A09888;--tx3:#5C5648;--fd:'Cormorant Garamond',Georgia,serif;--fb:'Crimson Pro',Georgia,serif;--fm:'DM Mono',monospace}
      ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:var(--bd2);border-radius:2px}
      @keyframes fi{from{opacity:0}to{opacity:1}}
      @keyframes su{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
      @keyframes pd{0%,100%{opacity:.2;transform:scale(.55)}50%{opacity:1;transform:scale(1.1)}}
      @keyframes bl{0%,100%{opacity:.3}50%{opacity:1}}
      @keyframes pulse{0%,100%{opacity:.35}50%{opacity:1}}
      .fi{animation:fi .28s ease both}.su{animation:su .2s ease both}
      .rr:hover{background:var(--bg4)!important}
      .ht:hover{color:var(--tx)!important}
      .hs:hover{background:rgba(255,255,255,.014)!important}
      .hc:hover{background:rgba(201,168,76,.07)!important;color:var(--gold)!important;border-color:rgba(201,168,76,.2)!important}
      .hb:hover:not(:disabled){filter:brightness(1.1);transform:translateY(-1px)}
      textarea,input,select{font-family:'DM Mono',monospace}
      textarea{resize:none}
      textarea:focus,input:focus,select:focus{outline:none;box-shadow:0 0 0 1px rgba(201,168,76,.15)}
      .mbg{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:300;display:flex;align-items:center;justify-content:center}
      .mod{background:#0D0E14;border:1px solid #242630;border-radius:5px;padding:20px;width:400px;max-width:93vw;max-height:88vh;overflow-y:auto}
    `}</style>
    <div style={{ fontFamily: "var(--fb)", background: "var(--bg)", minHeight: "100vh", color: "var(--tx)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* TOPBAR */}
      <header style={{ height: 48, borderBottom: "1px solid var(--bd)", display: "flex", alignItems: "center", padding: "0 16px", background: "#07080B", position: "sticky", top: 0, zIndex: 100, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 200 }}>
          <div style={{ width: 24, height: 24, borderRadius: 3, background: "linear-gradient(135deg,#C9A84C,#5C3E0A)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--fd)", fontSize: 8.5, fontWeight: 700, color: "#050607", letterSpacing: ".1em" }}>GFC</div>
          <div>
            <div style={{ fontFamily: "var(--fd)", fontSize: 10, fontWeight: 600, letterSpacing: ".2em", color: "var(--gold)", lineHeight: 1 }}>GROUP FINANCE COMMAND</div>
            <div style={{ fontFamily: "var(--fm)", fontSize: 6, color: "var(--tx3)", letterSpacing: ".15em", marginTop: 1 }}>KUNAL MEHTA · {STATE.entities.length} ENTITIES · v3</div>
          </div>
        </div>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,var(--bd),transparent)", margin: "0 12px" }} />
        <nav style={{ display: "flex", gap: .5 }}>
          {TABS.map(t => {
            const k = t.toLowerCase();
            const badge = k === "obligations" && overdueObl.length > 0;
            return (<button key={t} className="ht" onClick={() => { setTab(k); if (k !== "team") setActiveSpec(null); }} style={{ padding: "3px 9px", borderRadius: 2, border: "none", cursor: "pointer", fontFamily: "var(--fm)", fontSize: 6.5, letterSpacing: ".11em", background: tab === k ? "rgba(201,168,76,.08)" : "transparent", color: tab === k ? "var(--gold)" : "var(--tx3)", borderBottom: tab === k ? "1px solid var(--gold)" : "1px solid transparent", transition: "all .15s", position: "relative" }}>
              {t}{badge && <span style={{ position: "absolute", top: 1, right: 2, width: 4.5, height: 4.5, borderRadius: "50%", background: "#C44A4A", animation: "pulse 1.5s infinite" }} />}
            </button>);
          })}
        </nav>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,var(--bd),transparent)", margin: "0 12px" }} />
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          <div onClick={() => setPersonalOn(p => !p)} style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer", padding: "1px 6px", borderRadius: 2, border: "1px solid var(--bd2)", background: personalOn ? "rgba(90,184,138,.05)" : "transparent" }}>
            <div style={{ width: 3.5, height: 3.5, borderRadius: "50%", background: personalOn ? "#5AB88A" : "var(--tx3)" }} />
            <span style={{ fontFamily: "var(--fm)", fontSize: 6, color: personalOn ? "#5AB88A" : "var(--tx3)", letterSpacing: ".1em" }}>PERSONAL</span>
          </div>
          <span style={{ fontFamily: "var(--fm)", fontSize: 6.5, color: "var(--tx3)" }}>{TODAY.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}</span>
        </div>
      </header>
      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "calc(100vh - 48px)" }}>
        {/* SIDEBAR */}
        <aside style={{ width: 188, minWidth: 188, background: "var(--bg2)", borderRight: "1px solid var(--bd)", display: "flex", flexDirection: "column", overflowY: "auto", flexShrink: 0 }}>
          <div style={{ padding: "9px 10px 6px", borderBottom: "1px solid var(--bd)" }}>
            <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, color: "var(--tx3)", letterSpacing: ".22em", marginBottom: 5 }}>GROUP · AED EQUIVALENT</div>
            {[
              { l: "LIQUID CASH", v: fmtC(totalCash, "AED"), c: "#4A9868" },
              { l: "COMMITTED", v: fmtC(bbAED, "AED"), c: "#C44A4A" },
              { l: "FREE CASH", v: freeCash > 0 ? fmtC(freeCash, "AED") : "NEGATIVE", c: freeCash > 0 ? "#C9A84C" : "#C44A4A" },
              { l: "RECEIVABLES", v: fmtC(totalRec, "AED"), c: "#C9A84C" },
              { l: "PAYABLES", v: fmtC(totalPay, "AED"), c: "#C4843A" },
              { l: "MONTHLY BURN", v: fmtC(totalBurn, "AED"), c: "#C45A5A" },
              { l: "RUNWAY", v: Math.round(totalCash / totalBurn) + "mo", c: "var(--tx2)" },
            ].map((k, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2.5px 0", borderBottom: "1px solid var(--bd)" }}>
                <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, color: "var(--tx3)", letterSpacing: ".08em" }}>{k.l}</div>
                <div style={{ fontFamily: "var(--fd)", fontSize: 12, color: k.c, fontWeight: 400 }}>{k.v}</div>
              </div>
            ))}
          </div>
          {STATE.issues.filter(i => i.severity === "CRITICAL").length > 0 && (
            <div style={{ padding: "7px 10px", borderBottom: "1px solid var(--bd)", background: "rgba(196,74,74,.025)" }}>
              <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, color: "#C44A4A", letterSpacing: ".2em", marginBottom: 4 }}>⚠ RED BOX — {STATE.issues.filter(i => i.severity === "CRITICAL").length} CRITICAL</div>
              {STATE.issues.filter(i => i.severity === "CRITICAL").map(i => (
                <div key={i.id} style={{ marginBottom: 3, paddingBottom: 3, borderBottom: "1px solid rgba(196,74,74,.08)" }}>
                  <div style={{ fontFamily: "var(--fm)", fontSize: 6, color: "#C44A4A", lineHeight: 1.4 }}>{i.label}</div>
                </div>
              ))}
              {overdueObl.length > 0 && <div style={{ fontFamily: "var(--fm)", fontSize: 6, color: "#C44A4A", marginTop: 3, animation: "bl 1.8s infinite" }}>{overdueObl.length} obligation{overdueObl.length > 1 ? "s" : ""} overdue</div>}
            </div>
          )}
          <div style={{ flex: 1, padding: "6px 0" }}>
            <div style={{ padding: "0 10px 4px", fontFamily: "var(--fm)", fontSize: 5.5, color: "var(--tx3)", letterSpacing: ".22em" }}>FINANCE TEAM</div>
            {Object.entries(TEAM).map(([id, t]) => (
              <div key={id} className="hs" onClick={() => { setActiveSpec(id); setTab("team"); }} style={{ padding: "4px 8px", cursor: "pointer", transition: "all .1s", borderLeft: activeSpec === id ? `2px solid ${t.color}` : "2px solid transparent", background: activeSpec === id ? "rgba(255,255,255,.012)" : "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${t.color}0F`, border: `1px solid ${activeSpec === id ? t.color + "3E" : t.color + "18"}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--fm)", fontSize: 5.5, color: t.color, flexShrink: 0 }}>{t.abbr}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--fd)", fontSize: 10, fontWeight: 500, color: activeSpec === id ? t.accent : "var(--tx)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                    <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, color: "var(--tx3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                  </div>
                  {msgs[id]?.length > 0 && <div style={{ width: 3, height: 3, borderRadius: "50%", background: t.color, flexShrink: 0 }} />}
                </div>
              </div>
            ))}
          </div>
        </aside>
        {/* MAIN */}
        <main style={{ flex: 1, overflowY: "auto", background: "var(--bg)" }}>
          {/* DASHBOARD */}
          {tab === "dashboard" && <div style={{ padding: 20, maxWidth: 980, margin: "0 auto" }} className="fi">
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "var(--fd)", fontSize: 24, fontWeight: 300, letterSpacing: ".03em", lineHeight: 1 }}>Group Finance Command</div>
              <div style={{ fontFamily: "var(--fm)", fontSize: 6.5, color: "var(--tx3)", letterSpacing: ".14em", marginTop: 3 }}>CONTROL LAYER · SINGLE SOURCE OF TRUTH · {TODAY.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}</div>
              <div style={{ height: 1, background: "linear-gradient(90deg,var(--gold),transparent)", marginTop: 6 }} />
            </div>
            {/* EUR alert */}
            <div style={{ padding: "8px 12px", background: "rgba(201,168,76,.04)", border: "1px solid rgba(201,168,76,.16)", borderRadius: 3, marginBottom: 12, display: "flex", gap: 9, alignItems: "center" }}>
              <div style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--gold)" }}>€</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--fm)", fontSize: 6, color: "var(--gold)", letterSpacing: ".12em", marginBottom: 1 }}>EUR €480,000 — FX MONITOR ACTIVE · NO TRIGGER DEFINED</div>
                <div style={{ fontFamily: "var(--fb)", fontSize: 11.5, color: "var(--tx)", lineHeight: 1.6 }}>AED equivalent ≈ {fmtC(480000 * FX.EUR, "AED")}. Holding = undocumented currency position. Define threshold and execute, or document the hold thesis.</div>
              </div>
              <div onClick={() => { setActiveSpec("trs"); setTab("team"); }} style={{ fontFamily: "var(--fm)", fontSize: 6, color: "var(--gold)", padding: "2px 7px", border: "1px solid rgba(201,168,76,.2)", borderRadius: 2, cursor: "pointer", whiteSpace: "nowrap" }}>→ TREASURY</div>
            </div>
            {/* Entity grid */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "var(--fm)", fontSize: 6.5, color: "var(--gold)", letterSpacing: ".16em", marginBottom: 7 }}>ENTITY MASTER — {visE.length} ENTITIES</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5 }}>
                {visE.map(e => (
                  <div key={e.id} className="rr" onClick={() => setTab("entities")} style={{ padding: "9px 10px", borderRadius: 3, background: "var(--bg3)", border: `1px solid ${e.status === "active" ? e.color + "18" : "var(--bd)"}`, cursor: "pointer", transition: "all .12s", opacity: e.status === "not_incorporated" || e.status === "development" ? .6 : 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
                      <div>
                        <div style={{ fontFamily: "var(--fd)", fontSize: 12, fontWeight: 500, color: e.color, lineHeight: 1.1 }}>{e.short}</div>
                        <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, color: "var(--tx3)", marginTop: 1.5 }}>{e.jurisdiction} · {e.currency} · {e.ownership}%</div>
                      </div>
                      <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, padding: "1px 4px", borderRadius: 2, background: ec(e.type) + "0E", color: ec(e.type), border: `1px solid ${ec(e.type)}1E` }}>{e.type.slice(0, 3).toUpperCase()}</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
                      {[{ l: "Cash", v: e.cash, c: e.currency, col: "#4A9868" }, { l: "Burn/mo", v: e.monthly_burn, c: e.currency, col: "#C45A5A" }].map((f, i) => (
                        <div key={i} style={{ background: "var(--bg4)", borderRadius: 2, padding: "2px 5px" }}>
                          <div style={{ fontFamily: "var(--fm)", fontSize: 5, color: "var(--tx3)" }}>{f.l}</div>
                          <div style={{ fontFamily: "var(--fm)", fontSize: 9, color: f.v > 0 ? f.col : "var(--tx3)" }}>{f.v > 0 ? fmtC(f.v, f.c) : "—"}</div>
                        </div>
                      ))}
                    </div>
                    {e.status === "blocked" && <div style={{ marginTop: 4, fontFamily: "var(--fm)", fontSize: 5.5, color: "#C44A4A", animation: "bl 1.6s infinite" }}>● BLOCKED</div>}
                    {e.status === "not_incorporated" && <div style={{ marginTop: 4, fontFamily: "var(--fm)", fontSize: 5.5, color: "#C4843A" }}>○ NOT INCORPORATED</div>}
                  </div>
                ))}
              </div>
            </div>
            {/* Open obligations preview */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontFamily: "var(--fm)", fontSize: 6.5, color: "var(--gold)", letterSpacing: ".16em" }}>
                  OPEN OBLIGATIONS — {openObl.length}
                  {overdueObl.length > 0 && <span style={{ color: "#C44A4A", marginLeft: 8, animation: "bl 1.5s infinite" }}>{overdueObl.length} OVERDUE</span>}
                </div>
                <div onClick={() => setTab("obligations")} style={{ fontFamily: "var(--fm)", fontSize: 6, color: "var(--tx3)", cursor: "pointer", padding: "1px 5px", border: "1px solid var(--bd2)", borderRadius: 2 }}>VIEW ALL →</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {[...openObl].sort((a, b) => { const p = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]; return p.indexOf(a.priority) - p.indexOf(b.priority) || (isOverdue(b.due) ? 1 : 0) - (isOverdue(a.due) ? 1 : 0); }).slice(0, 5).map(o => {
                  const du = daysUntil(o.due); const od = isOverdue(o.due);
                  return (<div key={o.id} style={{ padding: "6px 10px", borderRadius: 3, background: "var(--bg3)", border: `1px solid ${od ? "rgba(196,74,74,.2)" : sc(o.priority) + "12"}`, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 2.5, height: 2.5, borderRadius: "50%", background: od ? "#C44A4A" : sc(o.priority), flexShrink: 0, animation: o.priority === "CRITICAL" ? "pd 1.8s infinite" : "none" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "var(--fb)", fontSize: 11.5, lineHeight: 1.4 }}>{o.description.slice(0, 70)}{o.description.length > 70 ? "…" : ""}</div>
                      <div style={{ fontFamily: "var(--fm)", fontSize: 6, color: "var(--tx3)", marginTop: 1.5, display: "flex", gap: 7 }}>
                        <span style={{ color: ec(STATE.entities.find(e => e.id === o.entity)?.type || "operating") }}>{o.class.replace("_", " ")}</span>
                        <span>{STATE.entities.find(e => e.id === o.entity)?.short}</span>
                        <span>{fmtC(o.amount, o.currency)}</span>
                        {o.owner && <span>→{o.owner}</span>}
                        <span style={{ color: od ? "#C44A4A" : du !== null && du <= 3 ? "#C4843A" : "var(--tx3)" }}>{od ? `OVERDUE ${Math.abs(du)}d` : du !== null ? `${du}d` : ""}</span>
                      </div>
                    </div>
                    <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, padding: "1px 4px", borderRadius: 2, background: sc(o.priority) + "0E", color: sc(o.priority), border: `1px solid ${sc(o.priority)}1A` }}>{o.priority}</div>
                  </div>);
                })}
              </div>
            </div>
          </div>}
          {/* ENTITIES */}
          {tab === "entities" && <div style={{ padding: 20, maxWidth: 860, margin: "0 auto" }} className="fi">
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 300 }}>Entity Master</div>
              <div style={{ fontFamily: "var(--fm)", fontSize: 6.5, color: "var(--tx3)", letterSpacing: ".12em", marginTop: 2 }}>OWNERSHIP · CASH · AGING SCHEDULES · INTERCOMPANY · OBLIGATIONS</div>
              <div style={{ height: 1, background: "linear-gradient(90deg,var(--gold),transparent)", marginTop: 6 }} />
            </div>
            {visE.map(e => {
              const eObls = openObl.filter(o => o.entity === e.id);
              return (<div key={e.id} style={{ padding: "12px 14px", background: "var(--bg3)", border: `1px solid ${e.color}16`, borderRadius: 4, marginBottom: 7, opacity: e.status === "not_incorporated" || e.status === "development" ? .65 : 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 3, background: `${e.color}10`, border: `1px solid ${e.color}28`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--fm)", fontSize: 7, color: e.color, flexShrink: 0 }}>{e.id.toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
                      <div style={{ fontFamily: "var(--fd)", fontSize: 14.5, fontWeight: 500, color: e.color }}>{e.name}</div>
                      <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, padding: "1px 4px", borderRadius: 2, background: ec(e.type) + "0E", color: ec(e.type), border: `1px solid ${ec(e.type)}1E` }}>{e.type.toUpperCase()}</div>
                      <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, color: e.status === "active" ? "#4A9868" : e.status === "blocked" ? "#C44A4A" : e.status === "not_incorporated" ? "#C4843A" : "var(--tx3)" }}>{e.status.replace("_", " ").toUpperCase()}</div>
                      <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, color: "var(--tx3)" }}>{e.tax_regime} · {e.ownership}%</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 3, marginBottom: 7 }}>
                  {[{ l: "Cash", v: e.cash, col: "#4A9868" }, { l: "Debt", v: e.debt, col: "#C44A4A" }, { l: "Receivables", v: e.receivables, col: "#C9A84C" }, { l: "Payables", v: e.payables, col: "#C4843A" }, { l: "Burn/mo", v: e.monthly_burn, col: "#C45A5A" }].map((f, i) => (
                    <div key={i} style={{ background: "var(--bg4)", borderRadius: 2, padding: "3px 6px" }}>
                      <div style={{ fontFamily: "var(--fm)", fontSize: 5, color: "var(--tx3)" }}>{f.l}</div>
                      <div style={{ fontFamily: "var(--fm)", fontSize: 10, color: f.v > 0 ? f.col : "var(--tx3)", marginTop: 1 }}>{f.v > 0 ? fmtC(f.v, e.currency) : "—"}</div>
                    </div>
                  ))}
                </div>
                {e.receivables > 0 && (<div style={{ marginBottom: 7 }}>
                  <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, color: "var(--tx3)", letterSpacing: ".14em", marginBottom: 3 }}>RECEIVABLES AGING</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 3 }}>
                    {[{ l: "0–30d", v: e.receivables_aging.d0_30, c: "#4A9868" }, { l: "31–60d", v: e.receivables_aging.d31_60, c: "#C9A84C" }, { l: "61–90d", v: e.receivables_aging.d61_90, c: "#C4843A" }, { l: "90d+", v: e.receivables_aging.d90p, c: "#C44A4A" }].map((b, i) => (
                      <div key={i} style={{ background: "var(--bg4)", borderRadius: 2, padding: "2.5px 6px", border: `1px solid ${b.v > 0 ? b.c + "22" : "var(--bd)"}` }}>
                        <div style={{ fontFamily: "var(--fm)", fontSize: 5, color: "var(--tx3)" }}>{b.l}</div>
                        <div style={{ fontFamily: "var(--fm)", fontSize: 10, color: b.v > 0 ? b.c : "var(--tx3)" }}>{b.v > 0 ? fmtC(b.v, e.currency) : "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>)}
                {e.payables > 0 && (<div style={{ marginBottom: 7 }}>
                  <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, color: "var(--tx3)", letterSpacing: ".14em", marginBottom: 3 }}>PAYABLES AGING</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
                    {[{ l: "0–7d", v: e.payables_aging.d0_7, c: "#C44A4A" }, { l: "8–30d", v: e.payables_aging.d8_30, c: "#C4843A" }, { l: "31–60d", v: e.payables_aging.d31_60, c: "#C9A84C" }].map((b, i) => (
                      <div key={i} style={{ background: "var(--bg4)", borderRadius: 2, padding: "2.5px 6px", border: `1px solid ${b.v > 0 ? b.c + "22" : "var(--bd)"}` }}>
                        <div style={{ fontFamily: "var(--fm)", fontSize: 5, color: "var(--tx3)" }}>{b.l}</div>
                        <div style={{ fontFamily: "var(--fm)", fontSize: 10, color: b.v > 0 ? b.c : "var(--tx3)" }}>{b.v > 0 ? fmtC(b.v, e.currency) : "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>)}
                {e.intercompany && <div style={{ fontFamily: "var(--fm)", fontSize: 6, color: "#C9A84C", padding: "3px 7px", background: "rgba(201,168,76,.05)", borderRadius: 2, marginBottom: 6 }}>INTERCOMPANY: {fmtC(e.intercompany.balance, "AED")} — {e.intercompany.direction.replace(/_/g, " ")} — UNRECONCILED</div>}
                {e.description && <div style={{ fontFamily: "var(--fb)", fontSize: 11, color: "var(--tx2)", lineHeight: 1.7, padding: "5px 8px", background: "var(--bg4)", borderRadius: 2, borderLeft: `2px solid ${e.color}30`, marginBottom: eObls.length ? 6 : 0 }}>{e.description}</div>}
                {eObls.length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{eObls.map(o => <div key={o.id} style={{ fontFamily: "var(--fm)", fontSize: 5.5, padding: "1px 5px", borderRadius: 2, background: sc(o.priority) + "0C", color: sc(o.priority), border: `1px solid ${sc(o.priority)}18` }}>{o.class.replace("_", " ")} · {fmtC(o.amount, o.currency)}</div>)}</div>}
              </div>);
            })}
          </div>}
          {/* TREASURY */}
          {tab === "treasury" && (() => {
            const totalLiquid = STATE.entities.reduce((s, e) => s + toAED(e.cash, e.currency), 0);
            const bbCommit = STATE.config.beauty_bay_commitment_gbp * FX.GBP;
            const freeC = totalLiquid - bbCommit;
            const runway = Math.round(freeC / totalBurn);
            const enbd = toAED(310000, "AED") + toAED(480000, "EUR") + toAED(47000, "USD") + toAED(220000, "AED");
            const bankConc = Math.round(enbd / totalLiquid * 100);
            const eurPct = Math.round(toAED(480000, "EUR") / totalLiquid * 100);
            return (<div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }} className="fi">
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 300 }}>Treasury</div>
                <div style={{ fontFamily: "var(--fm)", fontSize: 6.5, color: "var(--tx3)", letterSpacing: ".12em", marginTop: 2 }}>CASH POSITIONS · FREE VS COMMITTED · FX EXPOSURE · CONCENTRATION · RUNWAY</div>
                <div style={{ height: 1, background: "linear-gradient(90deg,var(--gold),transparent)", marginTop: 6 }} />
              </div>
              <div style={{ padding: "6px 12px", background: "var(--bg3)", border: "1px solid var(--bd)", borderRadius: 3, marginBottom: 10, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, color: "var(--tx3)", letterSpacing: ".18em" }}>FX → AED</div>
                {Object.entries(FX).map(([c, r]) => (
                  <div key={c} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--fm)", fontSize: 5, color: "var(--tx3)" }}>{c}</div>
                    <div style={{ fontFamily: "var(--fd)", fontSize: 12.5, color: "var(--gold)", fontWeight: 300, lineHeight: 1 }}>{r}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 12 }}>
                {STATE.accounts.filter(a => personalOn || STATE.entities.find(e => e.id === a.entity)?.type !== "personal").map(a => {
                  const ent = STATE.entities.find(e => e.id === a.entity);
                  const aed = toAED(a.balance, a.currency);
                  const pct = Math.round(aed / totalLiquid * 100);
                  return (<div key={a.id} style={{ padding: "8px 12px", background: "var(--bg3)", border: `1px solid ${a.flag ? "rgba(201,168,76,.18)" : "var(--bd)"}`, borderRadius: 3, marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "var(--fd)", fontSize: 13, fontWeight: 400 }}>{a.bank}</div>
                        <div style={{ fontFamily: "var(--fm)", fontSize: 6, color: "var(--tx3)", marginTop: 1 }}>{ent?.short} · {a.type} · {a.currency}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "var(--fm)", fontSize: 11.5, color: "#4A9868" }}>{fmtC(a.balance, a.currency)}</div>
                        <div style={{ fontFamily: "var(--fm)", fontSize: 6, color: "var(--tx3)" }}>≈ AED {Math.round(aed / 1000)}k</div>
                      </div>
                      {a.flag && <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, padding: "1px 5px", background: "rgba(201,168,76,.07)", color: "var(--gold)", border: "1px solid rgba(201,168,76,.18)", borderRadius: 2, animation: "bl 2s infinite" }}>{a.flag}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      <div style={{ flex: 1, height: 1.5, background: "var(--bd2)", borderRadius: 1, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#4A986822,#4A9868)", borderRadius: 1 }} /></div>
                      <div style={{ fontFamily: "var(--fm)", fontSize: 6, color: "var(--tx3)", minWidth: 26 }}>{pct}%</div>
                    </div>
                  </div>);
                })}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                <div style={{ padding: "9px 12px", background: "var(--bg3)", border: "1px solid var(--bd)", borderRadius: 3 }}>
                  <div style={{ fontFamily: "var(--fm)", fontSize: 6, color: "var(--gold)", letterSpacing: ".14em", marginBottom: 7 }}>FREE VS COMMITTED CASH</div>
                  {[
                    { l: "Total liquid", v: fmtC(totalLiquid, "AED"), c: "#4A9868" },
                    { l: "Beauty Bay committed", v: fmtC(bbCommit, "AED"), c: "#C44A4A" },
                    { l: "Free cash", v: fmtC(Math.max(freeC, 0), "AED"), c: freeC > 0 ? "#C9A84C" : "#C44A4A" },
                    { l: "BB as % of liquid", v: Math.round(bbCommit / totalLiquid * 100) + "%", c: "#C44A4A" },
                    { l: "Runway (free cash)", v: runway > 0 ? runway + "mo" : "NEGATIVE", c: runway > 6 ? "var(--tx2)" : runway > 2 ? "#C4843A" : "#C44A4A" },
                  ].map((r, i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2.5px 0", borderBottom: "1px solid var(--bd)" }}>
                    <div style={{ fontFamily: "var(--fm)", fontSize: 6, color: "var(--tx3)" }}>{r.l}</div>
                    <div style={{ fontFamily: "var(--fm)", fontSize: 10, color: r.c }}>{r.v}</div>
                  </div>))}
                </div>
                <div style={{ padding: "9px 12px", background: "var(--bg3)", border: "1px solid var(--bd)", borderRadius: 3 }}>
                  <div style={{ fontFamily: "var(--fm)", fontSize: 6, color: "var(--gold)", letterSpacing: ".14em", marginBottom: 7 }}>CONCENTRATION RISK</div>
                  {[
                    { l: "Emirates NBD exposure", v: bankConc + "%", c: bankConc > 55 ? "#C44A4A" : "#4A9868", warn: bankConc > 55 },
                    { l: "EUR currency exposure", v: eurPct + "%", c: "#C9A84C", warn: true },
                    { l: "Receivables vs liquid", v: Math.round(totalRec / totalLiquid * 100) + "%", c: totalRec / totalLiquid > 0.5 ? "#C4843A" : "var(--tx2)", warn: totalRec / totalLiquid > 0.5 },
                    { l: "Min cash breach — SS", v: STATE.entities.find(e => e.id === "ss")?.cash >= STATE.config.min_entity_cash.ss ? "OK" : "BREACH", c: STATE.entities.find(e => e.id === "ss")?.cash >= STATE.config.min_entity_cash.ss ? "#4A9868" : "#C44A4A", warn: false },
                    { l: "Mgmt accounts", v: "NOT PRODUCED", c: "#C44A4A", warn: true },
                  ].map((r, i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2.5px 0", borderBottom: "1px solid var(--bd)" }}>
                    <div style={{ fontFamily: "var(--fm)", fontSize: 6, color: "var(--tx3)" }}>{r.l}</div>
                    <div style={{ fontFamily: "var(--fm)", fontSize: 10, color: r.c }}>{r.v}{r.warn ? " ⚠" : ""}</div>
                  </div>))}
                </div>
              </div>
              <div style={{ padding: "9px 12px", background: "rgba(196,74,74,.03)", border: "1px solid rgba(196,74,74,.14)", borderRadius: 3 }}>
                <div style={{ fontFamily: "var(--fm)", fontSize: 6, color: "#C44A4A", letterSpacing: ".14em", marginBottom: 5 }}>LIQUIDITY STRESS — POST BEAUTY BAY DEPLOYMENT</div>
                <div style={{ fontFamily: "var(--fb)", fontSize: 12, color: "var(--tx)", lineHeight: 1.8 }}>
                  Beauty Bay £1.75M ≈ AED {Math.round(bbCommit / 1000)}k = <strong>{Math.round(bbCommit / totalLiquid * 100)}% of group liquid cash</strong>. Post-deployment free cash: <strong style={{ color: freeC > 0 ? "#C9A84C" : "#C44A4A" }}>{fmtC(Math.max(freeC, 0), "AED")}</strong>. Group runway post-deploy: <strong style={{ color: runway > 3 ? "var(--tx2)" : "#C44A4A" }}>{runway > 0 ? runway + " months" : "negative"}</strong> at current burn. Receivables {fmtC(totalRec, "AED")} not counted as free cash.
                </div>
              </div>
            </div>);
          })()}
          {/* OBLIGATIONS */}
          {tab === "obligations" && <div style={{ padding: 20, maxWidth: 840, margin: "0 auto" }} className="fi">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 300 }}>Obligations</div>
                <div style={{ fontFamily: "var(--fm)", fontSize: 6.5, color: "var(--tx3)", letterSpacing: ".12em", marginTop: 2 }}>LEGAL BLOCKERS · PAYMENTS · CONTROL ACTIONS · TREASURY DECISIONS</div>
                <div style={{ height: 1, background: "linear-gradient(90deg,var(--gold),transparent)", marginTop: 6 }} />
              </div>
              <button onClick={() => setShowAddObl(true)} style={{ padding: "3px 9px", borderRadius: 2, border: "1px solid rgba(201,168,76,.2)", background: "rgba(201,168,76,.04)", color: "var(--gold)", cursor: "pointer", fontFamily: "var(--fm)", fontSize: 6, letterSpacing: ".1em" }}>+ ADD</button>
            </div>
            {[
              { key: "legal_blocker", label: "LEGAL BLOCKERS", desc: "Documents, approvals, and structural prerequisites" },
              { key: "payment", label: "PAYMENTS", desc: "Cash due to counterparties" },
              { key: "treasury", label: "TREASURY", desc: "FX and liquidity decisions" },
              { key: "control_action", label: "CONTROL ACTIONS", desc: "Internal governance and reconciliation" },
            ].map(cls => {
              const items = obligations.filter(o => o.class === cls.key);
              if (!items.length) return null;
              const open = items.filter(o => o.status !== "done");
              return (<div key={cls.key} style={{ marginBottom: 14 }}>
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontFamily: "var(--fm)", fontSize: 6.5, color: "var(--gold)", letterSpacing: ".16em" }}>{cls.label} — {open.length} OPEN</div>
                  <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, color: "var(--tx3)", marginTop: 1 }}>{cls.desc}</div>
                </div>
                {items.sort((a, b) => { const p = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]; return p.indexOf(a.priority) - p.indexOf(b.priority); }).map(o => {
                  const du = daysUntil(o.due); const od = isOverdue(o.due) && o.status !== "done";
                  return (<div key={o.id} style={{ padding: "7px 10px", background: "var(--bg3)", border: `1px solid ${od ? "rgba(196,74,74,.2)" : sc(o.priority) + "0F"}`, borderRadius: 3, marginBottom: 3, opacity: o.status === "done" ? .38 : 1, transition: "opacity .18s" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <div onClick={() => setObligations(prev => prev.map(ob => ob.id === o.id ? { ...ob, status: ob.status === "done" ? "open" : "done" } : ob))} style={{ width: 12, height: 12, borderRadius: 2, border: `1px solid ${sc(o.priority) + "44"}`, background: o.status === "done" ? sc(o.priority) + "1A" : "transparent", cursor: "pointer", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {o.status === "done" && <div style={{ width: 4.5, height: 4.5, background: sc(o.priority), borderRadius: 1 }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "var(--fb)", fontSize: 12, lineHeight: 1.45, textDecoration: o.status === "done" ? "line-through" : "none", color: o.status === "done" ? "var(--tx3)" : "var(--tx)" }}>{o.description}</div>
                        <div style={{ fontFamily: "var(--fm)", fontSize: 6, color: "var(--tx3)", marginTop: 2, display: "flex", gap: 7, flexWrap: "wrap" }}>
                          <span>{STATE.entities.find(e => e.id === o.entity)?.short}</span>
                          <span>{fmtC(o.amount, o.currency)}</span>
                          {o.owner && <span style={{ color: "var(--tx2)" }}>→ {o.owner}</span>}
                          {o.due && <span style={{ color: od ? "#C44A4A" : du !== null && du <= 3 ? "#C4843A" : "var(--tx3)" }}>{od ? `OVERDUE ${Math.abs(du)}d` : du !== null ? `${du}d` : ""}</span>}
                          {o.status === "blocked" && <span style={{ color: "#C44A4A" }}>BLOCKED</span>}
                        </div>
                        {o.blocking && <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, color: "var(--tx3)", marginTop: 2 }}>Blocker: {o.blocking}</div>}
                      </div>
                      <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, padding: "1px 4px", borderRadius: 2, background: sc(o.priority) + "0C", color: sc(o.priority), border: `1px solid ${sc(o.priority)}18`, flexShrink: 0 }}>{o.priority}</div>
                    </div>
                  </div>);
                })}
              </div>);
            })}
          </div>}
          {/* DECISIONS */}
          {tab === "decisions" && <div style={{ padding: 20, maxWidth: 860, margin: "0 auto" }} className="fi">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 300 }}>Decisions + Ventures</div>
                <div style={{ fontFamily: "var(--fm)", fontSize: 6.5, color: "var(--tx3)", letterSpacing: ".12em", marginTop: 2 }}>WHAT WAS DECIDED · WHY · ASSUMPTIONS · DOWNSIDE · REVIEW · VENTURES WITH KILL CRITERIA</div>
                <div style={{ height: 1, background: "linear-gradient(90deg,var(--gold),transparent)", marginTop: 6 }} />
              </div>
              <button onClick={() => setShowAddDec(true)} style={{ padding: "3px 9px", borderRadius: 2, border: "1px solid rgba(201,168,76,.2)", background: "rgba(201,168,76,.04)", color: "var(--gold)", cursor: "pointer", fontFamily: "var(--fm)", fontSize: 6, letterSpacing: ".1em" }}>+ LOG DECISION</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "var(--fm)", fontSize: 6.5, color: "var(--gold)", letterSpacing: ".16em", marginBottom: 7 }}>VENTURE TRACKER — {STATE.ventures.length}</div>
              {STATE.ventures.map(v => {
                const ent = STATE.entities.find(e => e.id === v.entity);
                const nd = daysUntil(v.next_decision_date);
                return (<div key={v.id} style={{ padding: "11px 13px", background: "var(--bg3)", border: `1px solid ${ent?.color || "var(--bd)"}16`, borderRadius: 4, marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ flex: 1, marginRight: 10 }}>
                      <div style={{ fontFamily: "var(--fd)", fontSize: 14, fontWeight: 500, color: ent?.color || "var(--tx)" }}>{v.name}</div>
                      <div style={{ fontFamily: "var(--fb)", fontSize: 11, color: "var(--tx2)", marginTop: 1.5, lineHeight: 1.6 }}>{v.thesis}</div>
                    </div>
                    <div style={{ fontFamily: "var(--fm)", fontSize: 6, color: v.status === "blocked" ? "#C44A4A" : v.status === "evaluation" ? "#C4843A" : "var(--tx3)", padding: "1px 5px", border: "1px solid currentColor", borderRadius: 2, opacity: .7, flexShrink: 0 }}>{v.status.toUpperCase()}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 3, marginBottom: 7 }}>
                    {[
                      { l: "Committed", v: fmtC(v.capital_committed, v.currency) },
                      { l: "Deployed", v: v.capital_paid > 0 ? fmtC(v.capital_paid, v.currency) : "—" },
                      { l: "Ownership", v: v.ownership_pct ? v.ownership_pct + "%" : "TBD" },
                      { l: "MOIC base", v: v.moic_base ? v.moic_base + "x" : "TBD" },
                      { l: "MOIC bear", v: v.moic_bear !== null && v.moic_bear !== undefined ? v.moic_bear + "x" : "TBD" },
                    ].map((f, i) => (
                      <div key={i} style={{ background: "var(--bg4)", borderRadius: 2, padding: "2.5px 5px" }}>
                        <div style={{ fontFamily: "var(--fm)", fontSize: 5, color: "var(--tx3)" }}>{f.l}</div>
                        <div style={{ fontFamily: "var(--fm)", fontSize: 10, color: f.v === "0x" ? "#C44A4A" : "var(--tx)", marginTop: 1 }}>{f.v}</div>
                      </div>
                    ))}
                  </div>
                  {v.key_blockers?.length > 0 && (<div style={{ marginBottom: 6 }}>
                    <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, color: "#C44A4A", letterSpacing: ".12em", marginBottom: 3 }}>BLOCKERS</div>
                    {v.key_blockers.map((b, i) => <div key={i} style={{ fontFamily: "var(--fm)", fontSize: 6, color: "var(--tx3)", lineHeight: 1.5, borderBottom: "1px solid var(--bd)", padding: "1.5px 0" }}>· {b}</div>)}
                  </div>)}
                  {v.funding_milestones?.length > 0 && (<div style={{ marginBottom: 6 }}>
                    <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, color: "var(--tx3)", letterSpacing: ".12em", marginBottom: 3 }}>FUNDING MILESTONES</div>
                    <div style={{ display: "flex", flex: 1, gap: 3, flexWrap: "wrap" }}>
                      {v.funding_milestones.map((m, i) => { const du = daysUntil(m.due); const od = isOverdue(m.due); return (<div key={i} style={{ fontFamily: "var(--fm)", fontSize: 5.5, padding: "1px 5px", borderRadius: 2, background: m.status === "done" ? "rgba(74,152,104,.1)" : od ? "rgba(196,74,74,.08)" : "rgba(255,255,255,.03)", color: m.status === "done" ? "#4A9868" : od ? "#C44A4A" : "var(--tx3)", border: `1px solid ${m.status === "done" ? "rgba(74,152,104,.2)" : od ? "rgba(196,74,74,.2)" : "var(--bd2)"}` }}>{m.label}{m.due && <span style={{ marginLeft: 3, opacity: .6 }}>{od ? "OVERDUE" : `${du}d`}</span>}</div>); })}
                    </div>
                  </div>)}
                  <div style={{ fontFamily: "var(--fb)", fontSize: 11, color: "#C4843A", lineHeight: 1.65 }}>
                    <span style={{ fontFamily: "var(--fm)", fontSize: 5.5, color: "var(--tx3)" }}>KILL: </span>{v.kill_criteria}
                  </div>
                  {nd !== null && <div style={{ fontFamily: "var(--fm)", fontSize: 6, color: nd <= 3 ? "#C44A4A" : nd <= 7 ? "#C4843A" : "var(--tx3)", marginTop: 4 }}>Next decision: {nd}d → {v.next_decision_date}</div>}
                </div>);
              })}
            </div>
            <div style={{ fontFamily: "var(--fm)", fontSize: 6.5, color: "var(--gold)", letterSpacing: ".16em", marginBottom: 7 }}>DECISION LOG — {decisions.length}</div>
            {decisions.length === 0 && (<div style={{ padding: "24px", textAlign: "center", border: "1px dashed var(--bd2)", borderRadius: 4 }}>
              <div style={{ fontFamily: "var(--fd)", fontSize: 13, color: "var(--tx3)", fontWeight: 300 }}>No decisions logged</div>
              <div style={{ fontFamily: "var(--fm)", fontSize: 6.5, color: "var(--tx3)", marginTop: 3 }}>Every major capital decision should be logged here with rationale, assumptions, and review date.</div>
            </div>)}
            {decisions.map(d => {
              const rd = daysUntil(d.review_date);
              const ent = STATE.entities.find(e => e.id === d.entity);
              return (<div key={d.id} style={{ padding: "11px 13px", background: "var(--bg3)", border: "1px solid var(--bd2)", borderRadius: 4, marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <div style={{ fontFamily: "var(--fd)", fontSize: 14, fontWeight: 500 }}>{d.title}</div>
                    <div style={{ fontFamily: "var(--fm)", fontSize: 6, color: "var(--tx3)", marginTop: 2 }}>{d.date} · {ent?.short} · {fmtC(d.amount, d.currency)} · {d.decision_type}</div>
                  </div>
                  <div style={{ fontFamily: "var(--fm)", fontSize: 6, color: d.status === "under_review" ? "#C9A84C" : d.status === "validated" ? "#4A9868" : "#C44A4A", padding: "1px 5px", border: "1px solid currentColor", borderRadius: 2, opacity: .65, flexShrink: 0 }}>{d.status.replace("_", " ")}</div>
                </div>
                <div style={{ fontFamily: "var(--fb)", fontSize: 11.5, color: "var(--tx2)", lineHeight: 1.72, marginBottom: 6 }}>{d.rationale}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 6 }}>
                  <div style={{ padding: "5px 8px", background: "var(--bg4)", borderRadius: 2 }}>
                    <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, color: "#C9A84C", letterSpacing: ".12em", marginBottom: 3 }}>ASSUMPTIONS</div>
                    {(Array.isArray(d.assumptions) ? d.assumptions : d.assumptions.split(",").map(s => s.trim())).map((a, i) => <div key={i} style={{ fontFamily: "var(--fb)", fontSize: 11, color: "var(--tx2)", lineHeight: 1.55 }}>· {a}</div>)}
                  </div>
                  <div style={{ padding: "5px 8px", background: "var(--bg4)", borderRadius: 2 }}>
                    <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, color: "#C44A4A", letterSpacing: ".12em", marginBottom: 3 }}>DOWNSIDE / WHAT BREAKS THIS</div>
                    <div style={{ fontFamily: "var(--fb)", fontSize: 11, color: "var(--tx2)", lineHeight: 1.55 }}>{d.downside}</div>
                  </div>
                </div>
                {rd !== null && <div style={{ fontFamily: "var(--fm)", fontSize: 6, color: rd <= 0 ? "#C44A4A" : rd <= 7 ? "#C4843A" : "var(--tx3)" }}>Review: {rd <= 0 ? `OVERDUE ${Math.abs(rd)}d` : rd + "d"} → {d.review_date}</div>}
              </div>);
            })}
          </div>}
          {/* TEAM */}
          {tab === "team" && <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {!activeSpec ? (<div style={{ padding: 20 }} className="fi">
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 300 }}>Finance Team</div>
                <div style={{ height: 1, background: "linear-gradient(90deg,var(--gold),transparent)", marginTop: 7 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5 }}>
                {Object.entries(TEAM).map(([id, t]) => (
                  <div key={id} className="rr" onClick={() => setActiveSpec(id)} style={{ padding: "11px 10px", borderRadius: 3, cursor: "pointer", background: "var(--bg3)", border: `1px solid ${t.color}12`, transition: "all .15s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${t.color}0F`, border: `1px solid ${t.color}26`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--fm)", fontSize: 6, color: t.color }}>{t.abbr}</div>
                      <div>
                        <div style={{ fontFamily: "var(--fd)", fontSize: 12, fontWeight: 500, color: t.accent }}>{t.name}</div>
                        <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, color: "var(--tx3)" }}>{t.title}</div>
                      </div>
                    </div>
                    <div style={{ fontFamily: "var(--fb)", fontSize: 11, color: "var(--tx3)", lineHeight: 1.6 }}>{t.role.slice(0, 75)}…</div>
                    {msgs[id]?.length > 0 && <div style={{ fontFamily: "var(--fm)", fontSize: 6, color: "var(--tx3)", marginTop: 4 }}>{msgs[id].length} messages</div>}
                  </div>
                ))}
              </div>
            </div>) : (<div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ padding: "7px 14px", borderBottom: "1px solid var(--bd)", background: "var(--bg2)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${sp.color}0F`, border: `1px solid ${sp.color}2E`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--fm)", fontSize: 6, color: sp.color }}>{sp.abbr}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--fd)", fontSize: 12, fontWeight: 500, color: sp.accent }}>{sp.name}</div>
                  <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, color: "var(--tx3)" }}>{sp.title}</div>
                </div>
                <button onClick={() => setActiveSpec(null)} style={{ padding: "1px 7px", borderRadius: 2, border: "1px solid var(--bd2)", background: "transparent", color: "var(--tx3)", cursor: "pointer", fontFamily: "var(--fm)", fontSize: 5.5 }}>← TEAM</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                {(msgs[activeSpec] || []).length === 0 ? (<div style={{ margin: "auto", textAlign: "center", maxWidth: 360, padding: "20px 0" }} className="fi">
                  <div style={{ width: 42, height: 42, borderRadius: "50%", margin: "0 auto 10px", background: `${sp.color}0E`, border: `1px solid ${sp.color}26`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--fm)", fontSize: 9, color: sp.color }}>{sp.abbr}</div>
                  <div style={{ fontFamily: "var(--fd)", fontSize: 16, color: sp.accent, marginBottom: 2 }}>{sp.name}</div>
                  <div style={{ fontFamily: "var(--fm)", fontSize: 6, color: "var(--tx3)", letterSpacing: ".08em", marginBottom: 10 }}>{sp.title}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {(sp.starters || []).map((s, i) => (
                      <div key={i} className="hc" onClick={() => { setInput(s); inputRef.current?.focus(); }} style={{ padding: "4px 9px", borderRadius: 2, border: "1px solid var(--bd2)", background: "transparent", color: "var(--tx3)", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 11.5, textAlign: "left", transition: "all .11s" }}>{s}</div>
                    ))}
                  </div>
                </div>) : (msgs[activeSpec] || []).map((msg, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }} className="su">
                    <div style={{ maxWidth: "82%", padding: "8px 12px", borderRadius: 4, background: msg.role === "user" ? `${sp.color}0B` : "var(--bg3)", border: msg.role === "user" ? `1px solid ${sp.color}20` : "1px solid var(--bd)", fontFamily: "var(--fb)", fontSize: 12.5, color: "var(--tx)", lineHeight: 1.88, whiteSpace: "pre-wrap" }}>
                      {msg.role === "assistant" && <div style={{ fontFamily: "var(--fm)", fontSize: 5.5, color: sp.color, letterSpacing: ".15em", marginBottom: 4 }}>{sp.name.toUpperCase()}</div>}
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loading && <div style={{ display: "flex" }} className="fi"><div style={{ padding: "8px 12px", borderRadius: 4, background: "var(--bg3)", border: "1px solid var(--bd)" }}><div style={{ display: "flex", gap: 3 }}>{[0, 1, 2].map(j => <div key={j} style={{ width: 4, height: 4, borderRadius: "50%", background: sp.color, animation: `pd 1.2s ${j * .13}s infinite` }} />)}</div></div></div>}
                <div ref={chatEnd} />
              </div>
              <div style={{ padding: "8px 14px", borderTop: "1px solid var(--bd)", background: "var(--bg2)", flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 5, alignItems: "flex-end" }}>
                  <textarea ref={inputRef} rows={2} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={`Message ${sp.name}… (Enter to send)`} style={{ flex: 1, padding: "5px 9px", borderRadius: 3, background: "var(--bg3)", border: "1px solid var(--bd2)", color: "var(--tx)", fontSize: 12.5, lineHeight: 1.6 }} />
                  <button className="hb" onClick={send} disabled={loading || !input.trim()} style={{ padding: "5px 12px", borderRadius: 3, border: "none", cursor: "pointer", background: loading || !input.trim() ? "var(--bg4)" : `linear-gradient(135deg,${sp.color},${sp.color}99)`, color: loading || !input.trim() ? "var(--tx3)" : "#050607", fontFamily: "var(--fm)", fontSize: 7, transition: "all .12s", height: 44, minWidth: 46 }}>SEND</button>
                </div>
              </div>
            </div>)}
          </div>}
        </main>
      </div>
    </div>
    {/* ADD OBLIGATION MODAL */}
    {showAddObl && <div className="mbg" onClick={() => setShowAddObl(false)}><div className="mod" onClick={e => e.stopPropagation()}>
      <div style={{ fontFamily: "var(--fd)", fontSize: 16, color: "var(--gold)", marginBottom: 12, fontWeight: 300 }}>Add Obligation</div>
      <label style={LBL}>ENTITY</label>
      <select value={newObl.entity} onChange={e => setNewObl(p => ({ ...p, entity: e.target.value }))} style={INP}>{STATE.entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
      <label style={LBL}>CLASS</label>
      <select value={newObl.class} onChange={e => setNewObl(p => ({ ...p, class: e.target.value }))} style={INP}>{["legal_blocker", "payment", "treasury", "control_action"].map(t => <option key={t}>{t}</option>)}</select>
      <label style={LBL}>PRIORITY</label>
      <select value={newObl.priority} onChange={e => setNewObl(p => ({ ...p, priority: e.target.value }))} style={INP}>{["CRITICAL", "HIGH", "MEDIUM", "LOW"].map(p => <option key={p}>{p}</option>)}</select>
      <label style={LBL}>OWNER</label>
      <input value={newObl.owner} onChange={e => setNewObl(p => ({ ...p, owner: e.target.value }))} style={INP} />
      <label style={LBL}>DESCRIPTION</label>
      <textarea rows={2} value={newObl.description} onChange={e => setNewObl(p => ({ ...p, description: e.target.value }))} style={INP} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div><label style={LBL}>AMOUNT</label><input type="number" value={newObl.amount} onChange={e => setNewObl(p => ({ ...p, amount: +e.target.value }))} style={INP} /></div>
        <div><label style={LBL}>CURRENCY</label><input value={newObl.currency} onChange={e => setNewObl(p => ({ ...p, currency: e.target.value }))} style={INP} /></div>
      </div>
      <label style={LBL}>DUE DATE</label>
      <input type="date" value={newObl.due} onChange={e => setNewObl(p => ({ ...p, due: e.target.value }))} style={INP} />
      <label style={LBL}>BLOCKER (if any)</label>
      <input value={newObl.blocking} onChange={e => setNewObl(p => ({ ...p, blocking: e.target.value }))} style={INP} />
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <button onClick={() => { setObligations(prev => [...prev, { ...newObl, id: "o" + Date.now(), status: "open" }]); setShowAddObl(false); }} style={{ flex: 1, padding: "5px", borderRadius: 2, border: "none", background: "var(--gold)", color: "#050607", cursor: "pointer", fontFamily: "var(--fm)", fontSize: 6.5 }}>ADD</button>
        <button onClick={() => setShowAddObl(false)} style={{ flex: 1, padding: "5px", borderRadius: 2, border: "1px solid var(--bd2)", background: "transparent", color: "var(--tx3)", cursor: "pointer", fontFamily: "var(--fm)", fontSize: 6.5 }}>CANCEL</button>
      </div>
    </div></div>}
    {/* ADD DECISION MODAL */}
    {showAddDec && <div className="mbg" onClick={() => setShowAddDec(false)}><div className="mod" onClick={e => e.stopPropagation()}>
      <div style={{ fontFamily: "var(--fd)", fontSize: 16, color: "var(--gold)", marginBottom: 12, fontWeight: 300 }}>Log Decision</div>
      <label style={LBL}>ENTITY</label>
      <select value={newDec.entity} onChange={e => setNewDec(p => ({ ...p, entity: e.target.value }))} style={INP}>{STATE.entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
      <label style={LBL}>TITLE</label>
      <input value={newDec.title} onChange={e => setNewDec(p => ({ ...p, title: e.target.value }))} style={INP} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div><label style={LBL}>AMOUNT AT RISK</label><input type="number" value={newDec.amount} onChange={e => setNewDec(p => ({ ...p, amount: +e.target.value }))} style={INP} /></div>
        <div><label style={LBL}>CURRENCY</label><input value={newDec.currency} onChange={e => setNewDec(p => ({ ...p, currency: e.target.value }))} style={INP} /></div>
      </div>
      <label style={LBL}>TYPE</label>
      <select value={newDec.decision_type} onChange={e => setNewDec(p => ({ ...p, decision_type: e.target.value }))} style={INP}>{["investment", "disposal", "treasury", "structuring", "hiring", "other"].map(t => <option key={t}>{t}</option>)}</select>
      <label style={LBL}>RATIONALE</label>
      <textarea rows={2} value={newDec.rationale} onChange={e => setNewDec(p => ({ ...p, rationale: e.target.value }))} style={INP} />
      <label style={LBL}>KEY ASSUMPTIONS (comma-separated)</label>
      <input value={newDec.assumptions} onChange={e => setNewDec(p => ({ ...p, assumptions: e.target.value }))} style={INP} />
      <label style={LBL}>DOWNSIDE / WHAT WOULD PROVE THIS WRONG</label>
      <textarea rows={2} value={newDec.downside} onChange={e => setNewDec(p => ({ ...p, downside: e.target.value }))} style={INP} />
      <label style={LBL}>REVIEW DATE</label>
      <input type="date" value={newDec.review_date} onChange={e => setNewDec(p => ({ ...p, review_date: e.target.value }))} style={INP} />
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <button onClick={() => { setDecisions(prev => [...prev, { ...newDec, id: "d" + Date.now(), date: TODAY.toISOString().split("T")[0], assumptions: newDec.assumptions.split(",").map(s => s.trim()), status: "under_review", outcome: "" }]); setShowAddDec(false); }} style={{ flex: 1, padding: "5px", borderRadius: 2, border: "none", background: "var(--gold)", color: "#050607", cursor: "pointer", fontFamily: "var(--fm)", fontSize: 6.5 }}>LOG</button>
        <button onClick={() => setShowAddDec(false)} style={{ flex: 1, padding: "5px", borderRadius: 2, border: "1px solid var(--bd2)", background: "transparent", color: "var(--tx3)", cursor: "pointer", fontFamily: "var(--fm)", fontSize: 6.5 }}>CANCEL</button>
      </div>
    </div></div>}
  </>);
}
