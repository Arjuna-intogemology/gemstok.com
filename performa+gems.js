import { useState, useEffect, useMemo } from "react";

// ── READS FINTRACK+ DATA FROM LOCALSTORAGE ──
const loadEntries = () => {
  try {
    const saved = localStorage.getItem("cashflow_entries");
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
};

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const fmtShort = (n) => {
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + "K";
  return fmt(n);
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function PerformaPlus() {
  const [entries, setEntries] = useState([]);
  const [dark, setDark] = useState(true);
  const [period, setPeriod] = useState("30"); // days

  // ── PULL FROM FINTRACK+ ──
  const pull = () => setEntries(loadEntries());

  useEffect(() => { pull(); }, []);

  // ── FILTERED BY PERIOD ──
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - parseInt(period));

  const filtered = useMemo(() =>
    entries.filter(e => new Date(e.date) >= cutoff),
    [entries, period]
  );

  const all = useMemo(() =>
    entries,
    [entries]
  );

  // ── TOTALS ──
  const income  = filtered.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const expense = filtered.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const net     = income - expense;
  const margin  = income > 0 ? ((net / income) * 100).toFixed(1) : "0.0";

  // ── DAILY BALANCE TREND ──
  const dailyMap = {};
  filtered.forEach(e => {
    if (!dailyMap[e.date]) dailyMap[e.date] = { income: 0, expense: 0 };
    dailyMap[e.date][e.type] += e.amount;
  });

  const days = Object.keys(dailyMap).sort();
  let running = 0;
  const trendData = days.map(d => {
    running += dailyMap[d].income - dailyMap[d].expense;
    return { date: d, balance: running, income: dailyMap[d].income, expense: dailyMap[d].expense };
  });

  // ── CATEGORY BREAKDOWN ──
  const catMap = {};
  filtered.filter(e => e.type === "expense").forEach(e => {
    const key = e.category;
    if (!catMap[key]) catMap[key] = 0;
    catMap[key] += e.amount;
  });

  const expCats = [
    "Housing","Food","Transport","Health","Entertainment","Utilities","Other"
  ];

  const catData = Object.entries(catMap)
    .map(([k, v]) => ({ name: expCats[parseInt(k)] || "Other", amount: v }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // ── MONTHLY SUMMARY ──
  const monthMap = {};
  all.forEach(e => {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    if (!monthMap[key]) monthMap[key] = { income: 0, expense: 0, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
    monthMap[key][e.type] += e.amount;
  });

  const monthData = Object.entries(monthMap)
    .sort(([a],[b]) => a.localeCompare(b))
    .slice(-6)
    .map(([,v]) => v);

  // ── BEST DAY ──
  let bestDay = null, bestDayAmt = 0;
  Object.entries(dailyMap).forEach(([d, v]) => {
    const n = v.income - v.expense;
    if (n > bestDayAmt) { bestDayAmt = n; bestDay = d; }
  });

  // ── CHART HELPERS ──
  const maxBar = Math.max(...monthData.map(m => Math.max(m.income, m.expense)), 1);
  const maxTrend = Math.max(...trendData.map(t => Math.abs(t.balance)), 1);

  // ── THEME ──
  const c = dark ? {
    bg:         "#0d0d0d",
    surface:    "#161616",
    surfaceAlt: "#1e1e1e",
    border:     "#262626",
    text:       "#f0f0f0",
    textMid:    "#a0a0a0",
    textDim:    "#555",
    positive:   "#34c77b",
    negative:   "#e05555",
    accent:     "#f0f0f0",
    chartInc:   "#34c77b",
    chartExp:   "#e05555",
    chartLine:  "#4a9eff",
  } : {
    bg:         "#fafafa",
    surface:    "#ffffff",
    surfaceAlt: "#f4f4f4",
    border:     "#e8e8e8",
    text:       "#111111",
    textMid:    "#666666",
    textDim:    "#aaaaaa",
    positive:   "#1a8c50",
    negative:   "#c0392b",
    accent:     "#111111",
    chartInc:   "#1a8c50",
    chartExp:   "#c0392b",
    chartLine:  "#2563eb",
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@300;400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:${c.bg};}
    .app{min-height:100vh;background:${c.bg};font-family:'Geist',sans-serif;color:${c.text};padding:32px 20px 80px;transition:background .3s,color .3s;}
    .topbar{max-width:860px;margin:0 auto 36px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;}
    .brand{display:flex;flex-direction:column;gap:2px;}
    .brand-name{font-family:'Geist Mono',monospace;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:${c.textMid};}
    .brand-sub{font-size:22px;font-weight:600;color:${c.text};letter-spacing:-.02em;}
    .topbar-right{display:flex;align-items:center;gap:10px;}
    .period-group{display:flex;border:1px solid ${c.border};border-radius:8px;overflow:hidden;}
    .period-btn{padding:6px 14px;border:none;background:transparent;font-family:'Geist Mono',monospace;font-size:10px;letter-spacing:.08em;color:${c.textMid};cursor:pointer;transition:all .15s;border-right:1px solid ${c.border};}
    .period-btn:last-child{border-right:none;}
    .period-btn.active{background:${c.accent};color:${dark?"#0d0d0d":"#fafafa"};}
    .icon-btn{width:34px;height:34px;border:1px solid ${c.border};border-radius:8px;background:transparent;cursor:pointer;color:${c.textMid};display:flex;align-items:center;justify-content:center;transition:all .15s;font-size:14px;}
    .icon-btn:hover{border-color:${c.text};color:${c.text};}
    .pull-btn{padding:6px 14px;border:1px solid ${c.border};border-radius:8px;background:transparent;font-family:'Geist Mono',monospace;font-size:10px;letter-spacing:.08em;color:${c.textMid};cursor:pointer;transition:all .15s;}
    .pull-btn:hover{border-color:${c.text};color:${c.text};}
    .grid{max-width:860px;margin:0 auto;display:grid;gap:16px;}
    .g4{grid-template-columns:repeat(4,1fr);}
    .g2{grid-template-columns:repeat(2,1fr);}
    .g1{grid-template-columns:1fr;}
    .card{background:${c.surface};border:1px solid ${c.border};border-radius:14px;padding:22px 24px;transition:background .3s;}
    .card-label{font-family:'Geist Mono',monospace;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:${c.textMid};margin-bottom:10px;}
    .card-value{font-family:'Geist Mono',monospace;font-size:26px;font-weight:400;letter-spacing:-.02em;line-height:1;}
    .card-value.positive{color:${c.positive};}
    .card-value.negative{color:${c.negative};}
    .card-value.neutral{color:${c.text};}
    .card-sub{font-size:11px;color:${c.textDim};margin-top:6px;font-family:'Geist Mono',monospace;}
    .section-title{max-width:860px;margin:28px auto 12px;font-family:'Geist Mono',monospace;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:${c.textDim};}
    .bar-chart{display:flex;align-items:flex-end;gap:6px;height:120px;padding:0 4px;}
    .bar-group{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;}
    .bar-pair{display:flex;gap:2px;align-items:flex-end;width:100%;}
    .bar{flex:1;border-radius:3px 3px 0 0;min-height:2px;transition:height .3s;}
    .bar.inc{background:${c.chartInc};opacity:.8;}
    .bar.exp{background:${c.chartExp};opacity:.8;}
    .bar-label{font-family:'Geist Mono',monospace;font-size:8px;color:${c.textDim};text-align:center;white-space:nowrap;}
    .trend-chart{height:80px;position:relative;overflow:hidden;}
    .trend-svg{width:100%;height:100%;}
    .cat-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid ${c.border};}
    .cat-row:last-child{border-bottom:none;}
    .cat-name{font-size:13px;color:${c.text};flex:1;}
    .cat-bar-wrap{flex:2;height:4px;background:${c.border};border-radius:2px;overflow:hidden;}
    .cat-bar-fill{height:100%;background:${c.chartExp};border-radius:2px;opacity:.7;}
    .cat-amt{font-family:'Geist Mono',monospace;font-size:12px;color:${c.textMid};text-align:right;min-width:70px;}
    .empty-state{text-align:center;padding:60px 0;font-family:'Geist Mono',monospace;font-size:11px;color:${c.textDim};letter-spacing:.1em;text-transform:uppercase;line-height:2;}
    .legend{display:flex;gap:16px;margin-bottom:16px;}
    .legend-item{display:flex;align-items:center;gap:6px;font-family:'Geist Mono',monospace;font-size:9px;color:${c.textMid};letter-spacing:.08em;}
    .legend-dot{width:8px;height:8px;border-radius:2px;}
    @media(max-width:600px){.g4{grid-template-columns:repeat(2,1fr);}.g2{grid-template-columns:1fr;}.topbar{flex-direction:column;align-items:flex-start;}}
  `;

  const hasData = filtered.length > 0;

  // SVG trend line
  const trendPath = () => {
    if (trendData.length < 2) return "";
    const w = 100, h = 100;
    const pts = trendData.map((d, i) => {
      const x = (i / (trendData.length - 1)) * w;
      const y = h - ((d.balance + maxTrend) / (2 * maxTrend)) * h;
      return `${x},${y}`;
    });
    return `M ${pts.join(" L ")}`;
  };

  return (
    <>
      <style>{css}</style>
      <div className="app">

        {/* TOP BAR */}
        <div className="topbar">
          <div className="brand">
            <span className="brand-name">GemStok™ Ecosystem</span>
            <span className="brand-sub">Performa+</span>
          </div>
          <div className="topbar-right">
            <div className="period-group">
              {[["7","7D"],["30","30D"],["90","90D"],["365","1Y"]].map(([v,l]) => (
                <button key={v} className={`period-btn ${period===v?"active":""}`} onClick={() => setPeriod(v)}>{l}</button>
              ))}
            </div>
            <button className="pull-btn" onClick={pull}>⟳ SYNC</button>
            <button className="icon-btn" onClick={() => setDark(d => !d)}>
              {dark ? "☀" : "☾"}
            </button>
          </div>
        </div>

        {!hasData ? (
          <div className="empty-state">
            No data found.<br/>
            Open FinTrack+ and add entries first.<br/>
            Then hit SYNC.
          </div>
        ) : (
          <>
            {/* KPI ROW */}
            <div className={`grid g4`}>
              <div className="card">
                <div className="card-label">Total Income</div>
                <div className="card-value positive">{fmtShort(income)}</div>
                <div className="card-sub">Last {period} days</div>
              </div>
              <div className="card">
                <div className="card-label">Total Expense</div>
                <div className="card-value negative">{fmtShort(expense)}</div>
                <div className="card-sub">Last {period} days</div>
              </div>
              <div className="card">
                <div className="card-label">Net Position</div>
                <div className={`card-value ${net >= 0 ? "positive" : "negative"}`}>{fmtShort(net)}</div>
                <div className="card-sub">{net >= 0 ? "Surplus" : "Deficit"}</div>
              </div>
              <div className="card">
                <div className="card-label">Profit Margin</div>
                <div className={`card-value ${parseFloat(margin) >= 0 ? "positive" : "negative"}`}>{margin}%</div>
                <div className="card-sub">Net / Income</div>
              </div>
            </div>

            {/* BEST DAY */}
            {bestDay && (
              <div className={`grid g2`} style={{ marginTop: 16 }}>
                <div className="card">
                  <div className="card-label">Best Day</div>
                  <div className="card-value neutral">{bestDay}</div>
                  <div className="card-sub">+{fmt(bestDayAmt)} net</div>
                </div>
                <div className="card">
                  <div className="card-label">Transactions</div>
                  <div className="card-value neutral">{filtered.length}</div>
                  <div className="card-sub">{filtered.filter(e=>e.type==="income").length} income · {filtered.filter(e=>e.type==="expense").length} expense</div>
                </div>
              </div>
            )}

            {/* MONTHLY BAR CHART */}
            {monthData.length > 0 && (
              <>
                <div className="section-title">Monthly Overview</div>
                <div className="card">
                  <div className="legend">
                    <div className="legend-item"><div className="legend-dot" style={{background:c.chartInc}}></div>INCOME</div>
                    <div className="legend-item"><div className="legend-dot" style={{background:c.chartExp}}></div>EXPENSE</div>
                  </div>
                  <div className="bar-chart">
                    {monthData.map((m, i) => (
                      <div className="bar-group" key={i}>
                        <div className="bar-pair">
                          <div className="bar inc" style={{ height: `${(m.income / maxBar) * 100}px` }} title={`Income: ${fmt(m.income)}`} />
                          <div className="bar exp" style={{ height: `${(m.expense / maxBar) * 100}px` }} title={`Expense: ${fmt(m.expense)}`} />
                        </div>
                        <div className="bar-label">{m.label.slice(0,3)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* BALANCE TREND */}
            {trendData.length >= 2 && (
              <>
                <div className="section-title">Balance Trend</div>
                <div className="card">
                  <div className="trend-chart">
                    <svg className="trend-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={c.chartLine} stopOpacity="0.3"/>
                          <stop offset="100%" stopColor={c.chartLine} stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      <path
                        d={trendPath() + ` L 100,100 L 0,100 Z`}
                        fill="url(#tg)"
                      />
                      <path
                        d={trendPath()}
                        fill="none"
                        stroke={c.chartLine}
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                  </div>
                  <div className="card-sub" style={{marginTop:10}}>
                    Running balance over {trendData.length} days · Current: {net >= 0 ? "+" : ""}{fmt(net)}
                  </div>
                </div>
              </>
            )}

            {/* TOP EXPENSE CATEGORIES */}
            {catData.length > 0 && (
              <>
                <div className="section-title">Top Expense Categories</div>
                <div className="card">
                  {catData.map((cat, i) => (
                    <div className="cat-row" key={i}>
                      <div className="cat-name">{cat.name}</div>
                      <div className="cat-bar-wrap">
                        <div className="cat-bar-fill" style={{ width: `${(cat.amount / catData[0].amount) * 100}%` }} />
                      </div>
                      <div className="cat-amt">{fmt(cat.amount)}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

      </div>
    </>
  );
}