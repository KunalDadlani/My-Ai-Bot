/* ═══════════════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
   Dates relative to TODAY = 2026-03-09.
═══════════════════════════════════════════════════════════════════ */
export const TODAY = new Date("2026-03-09");

export const rel = (days) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

export const daysUntil = (s) => {
  if (!s) return null;
  return Math.round((new Date(s) - TODAY) / 86400000);
};

export const isOverdue = (s) => {
  const d = daysUntil(s);
  return d !== null && d < 0;
};

/* ── FX RATES (AED base) ──────────────────────────────────────── */
export const FX = { AED: 1, EUR: 3.93, GBP: 4.57, USD: 3.67, OMR: 9.53 };

/* ── FORMATTERS ─────────────────────────────────────────────────── */
export const fmtC = (n, c = "AED") => {
  if (!n) return "—";
  const sym = { AED: "AED", EUR: "€", GBP: "£", USD: "$", OMR: "OMR" }[c] || "";
  const s = sym === "AED" || sym === "OMR" ? sym + " " : sym;
  if (n >= 1000000) return `${s}${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `${s}${Math.round(n / 1000)}k`;
  return `${s}${n}`;
};

export const toAED = (n, c) => n * (FX[c] || 1);

export const sc = (p) =>
  p === "CRITICAL" ? "#C44A4A" :
  p === "HIGH" ? "#C4843A" :
  p === "MEDIUM" ? "#C9A84C" : "#4A9868";

export const ec = (t) =>
  ({ operating: "#C9A84C", venture: "#C45A5A", holdco: "#9A5AC4", personal: "#5AB88A" }[t] || "#7A8AA0");
