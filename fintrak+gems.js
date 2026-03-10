import { useState, useCallback } from "react";

const T = {
  en: {
    appTitle: "Cash Flow",
    income: "Income",
    expenses: "Expenses",
    net: "Net",
    tracker: "Tracker",
    calculator: "Calculator",
    all: "All",
    expense: "Expense",
    description: "Description",
    addEntry: "+ Add Entry",
    noEntries: "No entries",
    useInTracker: "↑ Use in Tracker",
    settings: "Settings",
    language: "Language",
    theme: "Theme",
    dark: "Dark",
    light: "Light",
    categories: {
      income: ["Salary", "Freelance", "Investment", "Rental", "Other Income"],
      expense: ["Housing", "Food", "Transport", "Health", "Entertainment", "Utilities", "Other"],
    },
  },
  si: {
    appTitle: "මුදල් ප්‍රවාහය",
    income: "ආදායම",
    expenses: "වියදම්",
    net: "ශුද්ධ",
    tracker: "ලුහුබැඳීම",
    calculator: "කැල්කියුලේටරය",
    all: "සියල්ල",
    expense: "වියදම",
    description: "විස්තරය",
    addEntry: "+ ඇතුළත් කරන්න",
    noEntries: "ඇතුළත් කිරීම් නැත",
    useInTracker: "↑ ලුහුබැඳීමේ භාවිත කරන්න",
    settings: "සැකසීම්",
    language: "භාෂාව",
    theme: "තේමාව",
    dark: "අඳුරු",
    light: "ආලෝකමත්",
    categories: {
      income: ["වැටුප", "නිදහස් කාර්ය", "ආයෝජන", "කුලිය", "වෙනත් ආදායම"],
      expense: ["නිවාස", "ආහාර", "ප්‍රවාහනය", "සෞඛ්‍යය", "විනෝදාස්වාදය", "උපයෝගිතා", "වෙනත්"],
    },
  },
};

const formatCurrency = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);

export default function CashFlowTracker() {
  const [lang, setLang] = useState("en");
  const [dark, setDark] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const t = T[lang];

  const [entries, setEntries] = useState(() => {
  const saved = localStorage.getItem("cashflow_entries");
  return saved ? JSON.parse(saved) : [];
});

  const [form, setForm] = useState({ type: "income", category: 0, label: "", amount: "", date: new Date().toISOString().slice(0, 10) });
  const [calcDisplay, setCalcDisplay] = useState("0");
  const [calcPrev, setCalcPrev] = useState(null);
  const [calcOp, setCalcOp] = useState(null);
  const [calcFresh, setCalcFresh] = useState(true);
  const [activeTab, setActiveTab] = useState("tracker");
  const [filter, setFilter] = useState("all");

  const totalIncome = entries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const totalExpense = entries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const net = totalIncome - totalExpense;
  const netClass = net > 0 ? "positive" : net < 0 ? "negative" : "zero";

  const filteredEntries = entries
    .filter(e => filter === "all" || e.type === filter)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const addEntry = () => {
    if (!form.label || !form.amount || isNaN(parseFloat(form.amount))) return;
    setEntries(prev => [...prev, { ...form, amount: parseFloat(form.amount), id: Date.now() }]);
    setForm(f => ({ ...f, label: "", amount: "" }));
  };

  const removeEntry = (id) => setEntries(prev => prev.filter(e => e.id !== id));

  const calcInput = useCallback((val) => {
    if (calcFresh) { setCalcDisplay(val === "." ? "0." : val); setCalcFresh(false); }
    else {
      if (val === "." && calcDisplay.includes(".")) return;
      setCalcDisplay(d => d === "0" && val !== "." ? val : d + val);
    }
  }, [calcDisplay, calcFresh]);

  const calcOpPress = useCallback((op) => {
    setCalcPrev(parseFloat(calcDisplay)); setCalcOp(op); setCalcFresh(true);
  }, [calcDisplay]);

  const calcEquals = useCallback(() => {
    if (calcOp === null || calcPrev === null) return;
    const curr = parseFloat(calcDisplay);
    let result;
    if (calcOp === "+") result = calcPrev + curr;
    else if (calcOp === "−") result = calcPrev - curr;
    else if (calcOp === "×") result = calcPrev * curr;
    else if (calcOp === "÷") result = curr === 0 ? "Error" : calcPrev / curr;
    const r = typeof result === "number" ? parseFloat(result.toFixed(8)).toString() : result;
    setCalcDisplay(r); setCalcOp(null); setCalcPrev(null); setCalcFresh(true);
  }, [calcOp, calcPrev, calcDisplay]);

  const calcClear = () => { setCalcDisplay("0"); setCalcOp(null); setCalcPrev(null); setCalcFresh(true); };
  const calcToggleSign = () => setCalcDisplay(d => d.startsWith("-") ? d.slice(1) : d === "0" ? d : "-" + d);
  const calcPercent = () => setCalcDisplay(d => String(parseFloat(d) / 100));
  const useCalcResult = () => setForm(f => ({ ...f, amount: calcDisplay === "Error" ? "" : calcDisplay }));

  const th = dark ? {
    bg: "#111110", surface: "#1c1b19", surfaceAlt: "#242320", border: "#2e2c29",
    borderStrong: "#3a3835", text: "#e8e4de", textMuted: "#6b6762",
    calcBg: "#0a0a09", calcBtn: "#1c1b19", calcBtnHover: "#28271f", calcBtnActive: "#323028",
    pill: "#242320", active: "#e8e4de", activeText: "#111110",
  } : {
    bg: "#f5f3ef", surface: "#faf9f7", surfaceAlt: "#f0ece6", border: "#e8e4de",
    borderStrong: "#d9d5cf", text: "#1a1814", textMuted: "#8c8880",
    calcBg: "#1a1814", calcBtn: "#faf9f7", calcBtnHover: "#f0ece6", calcBtnActive: "#e8e4de",
    pill: "#e8e4de", active: "#1a1814", activeText: "#f5f3ef",
  };

  const siFont = "'Noto Sans Sinhala', sans-serif";
  const enFont = "'DM Sans', sans-serif";
  const monoFont = "'DM Mono', monospace";
  const bodyFont = lang === "si" ? siFont : enFont;

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&family=Noto+Sans+Sinhala:wght@300;400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:${th.bg};transition:background .3s;}
    .app{min-height:100vh;background:${th.bg};font-family:${bodyFont};color:${th.text};display:flex;flex-direction:column;align-items:center;padding:40px 16px 80px;transition:background .3s,color .3s;}
    .hrow{width:100%;max-width:480px;display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:32px;}
    .htitle{font-family:${monoFont};font-size:13px;font-weight:400;letter-spacing:.12em;text-transform:uppercase;color:${th.textMuted};margin-bottom:4px;}
    .hperiod{font-size:22px;font-weight:300;color:${th.text};}
    .cogbtn{background:none;border:1px solid ${th.border};border-radius:8px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:${th.textMuted};transition:all .15s;flex-shrink:0;margin-top:2px;}
    .cogbtn:hover,.cogbtn.open{border-color:${th.text};color:${th.text};background:${th.surfaceAlt};}
    .spanel{width:100%;max-width:480px;background:${th.surface};border:1px solid ${th.border};border-radius:12px;padding:20px;margin-bottom:20px;animation:sd .2s ease;}
    @keyframes sd{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
    .stitle{font-family:${monoFont};font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${th.textMuted};margin-bottom:16px;}
    .srow{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid ${th.border};}
    .srow:last-child{border-bottom:none;padding-bottom:0;}
    .slabel{font-size:14px;color:${th.text};}
    .pill{display:flex;background:${th.pill};border:1px solid ${th.border};border-radius:20px;padding:3px;gap:2px;}
    .popt{padding:4px 14px;border-radius:16px;border:none;background:transparent;font-family:${bodyFont};font-size:11px;cursor:pointer;color:${th.textMuted};transition:all .2s;white-space:nowrap;}
    .popt.active{background:${th.active};color:${th.activeText};}
    .summary{width:100%;max-width:480px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:${th.borderStrong};border:1px solid ${th.borderStrong};border-radius:12px;overflow:hidden;margin-bottom:24px;}
    .scard{background:${th.surface};padding:18px 16px;display:flex;flex-direction:column;gap:4px;transition:background .3s;}
    .slb{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:${th.textMuted};font-family:${monoFont};}
    .val{font-family:${monoFont};font-size:14px;font-weight:500;}
    .val.income{color:#2d7a4f;}.val.expense{color:#b84444;}
    .val.net.positive{color:#2d7a4f;}.val.net.negative{color:#b84444;}.val.net.zero{color:${th.textMuted};}
    .tabs{width:100%;max-width:480px;display:flex;margin-bottom:20px;border-bottom:1px solid ${th.border};}
    .tab{font-family:${monoFont};font-size:11px;letter-spacing:.1em;text-transform:uppercase;padding:10px 20px;border:none;background:none;cursor:pointer;color:${th.textMuted};border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s;}
    .tab.active{color:${th.active};border-bottom-color:${th.active};}
    .panel{width:100%;max-width:480px;}
    .aform{background:${th.surface};border:1px solid ${th.border};border-radius:12px;padding:20px;margin-bottom:20px;display:flex;flex-direction:column;gap:12px;transition:background .3s;}
    .frow{display:flex;gap:8px;}
    .ttog{display:flex;border:1px solid ${th.border};border-radius:8px;overflow:hidden;}
    .tbtn{flex:1;padding:8px 12px;border:none;background:transparent;font-family:${bodyFont};font-size:${lang==="si"?"12px":"11px"};cursor:pointer;color:${th.textMuted};transition:all .15s;}
    .tbtn.active.income{background:${dark?"#1a3d2b":"#edf7f2"};color:#2d7a4f;}
    .tbtn.active.expense{background:${dark?"#3d1a1a":"#fdf0f0"};color:#b84444;}
    .inp{flex:1;padding:9px 12px;border:1px solid ${th.border};border-radius:8px;background:${dark?th.surfaceAlt:"white"};font-family:${bodyFont};font-size:14px;color:${th.text};outline:none;transition:border-color .15s,background .3s,color .3s;}
    .inp:focus{border-color:${th.text};}
    select.inp{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238c8880' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:28px;background-color:${dark?th.surfaceAlt:"white"};}
    select.inp option{background:${dark?"#242320":"white"};color:${th.text};}
    .abtn{width:100%;padding:10px;border:none;border-radius:8px;background:${th.active};color:${th.activeText};font-family:${bodyFont};font-size:${lang==="si"?"13px":"12px"};letter-spacing:${lang==="si"?"0":".1em"};cursor:pointer;transition:opacity .15s;}
    .abtn:hover{opacity:.75;}
    .filt{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;}
    .fbtn{font-family:${bodyFont};font-size:${lang==="si"?"11px":"10px"};padding:5px 12px;border-radius:20px;border:1px solid ${th.border};background:transparent;color:${th.textMuted};cursor:pointer;transition:all .15s;}
    .fbtn.active{background:${th.active};color:${th.activeText};border-color:${th.active};}
    .entries{display:flex;flex-direction:column;gap:2px;}
    .entry{display:flex;align-items:center;padding:12px 14px;background:${th.surface};border:1px solid ${th.border};border-radius:8px;gap:12px;transition:background .15s;}
    .entry:hover{background:${th.surfaceAlt};}
    .edot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
    .di{background:#2d7a4f;}.de{background:#b84444;}
    .einfo{flex:1;min-width:0;}
    .elabel{font-size:14px;color:${th.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .emeta{font-family:${monoFont};font-size:10px;color:${th.textMuted};margin-top:1px;}
    .eamt{font-family:${monoFont};font-size:14px;font-weight:500;flex-shrink:0;}
    .eamt.income{color:#2d7a4f;}.eamt.expense{color:#b84444;}
    .delbtn{background:none;border:none;cursor:pointer;color:${th.textMuted};font-size:16px;line-height:1;padding:2px 4px;transition:color .15s;flex-shrink:0;}
    .delbtn:hover{color:#b84444;}
    .empty{text-align:center;padding:40px 0;font-family:${monoFont};font-size:11px;color:${th.textMuted};letter-spacing:.1em;text-transform:uppercase;}
    .calc{background:${th.surface};border:1px solid ${th.border};border-radius:16px;overflow:hidden;}
    .cdisp{padding:28px 20px 16px;text-align:right;background:${th.calcBg};}
    .copind{font-family:${monoFont};font-size:11px;color:${th.textMuted};min-height:16px;margin-bottom:4px;}
    .cnum{font-family:${monoFont};font-size:36px;font-weight:300;color:#f5f3ef;letter-spacing:-.02em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .cubtn{display:block;width:calc(100% - 32px);margin:12px 16px 0;padding:8px;background:#2d7a4f;border:none;border-radius:6px;font-family:${bodyFont};font-size:${lang==="si"?"12px":"10px"};letter-spacing:${lang==="si"?"0":".1em"};color:white;cursor:pointer;transition:opacity .15s;}
    .cubtn:hover{opacity:.8;}
    .cgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:${th.borderStrong};border-top:1px solid ${th.border};margin-top:12px;}
    .cbtn{padding:18px 8px;border:none;background:${th.calcBtn};font-family:${monoFont};font-size:16px;cursor:pointer;color:${th.text};transition:background .1s;text-align:center;}
    .cbtn:hover{background:${th.calcBtnHover};}.cbtn:active{background:${th.calcBtnActive};}
    .cbtn.fn{color:${th.textMuted};font-size:13px;}
    .cbtn.op{color:#b84444;font-weight:500;}
    .cbtn.eq{background:${th.active};color:${th.activeText};font-weight:500;}
    .cbtn.eq:hover{opacity:.85;}
    .cbtn.z2{grid-column:span 2;}
  `;

  const cats = t.categories;

  const CogIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );

  return (
    <>
      <style>{css}</style>
      <div className="app">

        {/* HEADER */}
        <div className="hrow">
          <div>
            <div className="htitle">{t.appTitle}</div>
            <div className="hperiod">
              {new Date().toLocaleString(lang === "si" ? "si-LK" : "en-US", { month: "long", year: "numeric" })}
            </div>
          </div>
          <button className={`cogbtn ${settingsOpen ? "open" : ""}`} onClick={() => setSettingsOpen(o => !o)}>
            <CogIcon />
          </button>
        </div>

        {/* SETTINGS */}
        {settingsOpen && (
          <div className="spanel">
            <div className="stitle">{t.settings}</div>
            <div className="srow">
              <span className="slabel">{t.language}</span>
              <div className="pill">
                <button className={`popt ${lang === "en" ? "active" : ""}`} onClick={() => { setLang("en"); setForm(f => ({ ...f, category: 0 })); }}>English</button>
                <button className={`popt ${lang === "si" ? "active" : ""}`} onClick={() => { setLang("si"); setForm(f => ({ ...f, category: 0 })); }}>සිංහල</button>
              </div>
            </div>
            <div className="srow">
              <span className="slabel">{t.theme}</span>
              <div className="pill">
                <button className={`popt ${!dark ? "active" : ""}`} onClick={() => setDark(false)}>☀ {t.light}</button>
                <button className={`popt ${dark ? "active" : ""}`} onClick={() => setDark(true)}>☾ {t.dark}</button>
              </div>
            </div>
          </div>
        )}

        {/* SUMMARY */}
        <div className="summary">
          <div className="scard"><span className="slb">{t.income}</span><span className="val income">{formatCurrency(totalIncome)}</span></div>
          <div className="scard"><span className="slb">{t.expenses}</span><span className="val expense">{formatCurrency(totalExpense)}</span></div>
          <div className="scard"><span className="slb">{t.net}</span><span className={`val net ${netClass}`}>{formatCurrency(net)}</span></div>
        </div>

        {/* TABS */}
        <div className="tabs">
          <button className={`tab ${activeTab === "tracker" ? "active" : ""}`} onClick={() => setActiveTab("tracker")}>{t.tracker}</button>
          <button className={`tab ${activeTab === "calc" ? "active" : ""}`} onClick={() => setActiveTab("calc")}>{t.calculator}</button>
        </div>

        {/* TRACKER */}
        {activeTab === "tracker" && (
          <div className="panel">
            <div className="aform">
              <div className="ttog">
                <button className={`tbtn ${form.type === "income" ? "active income" : ""}`} onClick={() => setForm(f => ({ ...f, type: "income", category: 0 }))}>{t.income}</button>
                <button className={`tbtn ${form.type === "expense" ? "active expense" : ""}`} onClick={() => setForm(f => ({ ...f, type: "expense", category: 0 }))}>{t.expense}</button>
              </div>
              <div className="frow">
                <select className="inp" value={form.category} onChange={e => setForm(f => ({ ...f, category: parseInt(e.target.value) }))}>
                  {cats[form.type].map((c, i) => <option key={i} value={i}>{c}</option>)}
                </select>
                <input className="inp" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ flex: "0 0 140px" }} />
              </div>
              <div className="frow">
                <input className="inp" placeholder={t.description} value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
                <input className="inp" type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{ flex: "0 0 110px" }} />
              </div>
              <button className="abtn" onClick={addEntry}>{t.addEntry}</button>
            </div>

            <div className="filt">
              {[["all", t.all], ["income", t.income], ["expense", t.expense]].map(([val, label]) => (
                <button key={val} className={`fbtn ${filter === val ? "active" : ""}`} onClick={() => setFilter(val)}>{label}</button>
              ))}
            </div>

            <div className="entries">
              {filteredEntries.length === 0 ? (
                <div className="empty">{t.noEntries}</div>
              ) : filteredEntries.map(e => (
                <div className="entry" key={e.id}>
                  <span className={`edot ${e.type === "income" ? "di" : "de"}`} />
                  <div className="einfo">
                    <div className="elabel">{e.label}</div>
                    <div className="emeta">{cats[e.type][e.category]} · {e.date}</div>
                  </div>
                  <span className={`eamt ${e.type}`}>{e.type === "income" ? "+" : "−"}{formatCurrency(e.amount)}</span>
                  <button className="delbtn" onClick={() => removeEntry(e.id)}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CALCULATOR */}
        {activeTab === "calc" && (
          <div className="panel">
            <div className="calc">
              <div className="cdisp">
                <div className="copind">{calcPrev !== null ? `${calcPrev} ${calcOp}` : ""}</div>
                <div className="cnum">{calcDisplay}</div>
              </div>
              <button className="cubtn" onClick={useCalcResult}>{t.useInTracker}</button>
              <div className="cgrid">
                <button className="cbtn fn" onClick={calcClear}>AC</button>
                <button className="cbtn fn" onClick={calcToggleSign}>+/−</button>
                <button className="cbtn fn" onClick={calcPercent}>%</button>
                <button className="cbtn op" onClick={() => calcOpPress("÷")}>÷</button>
                {["7","8","9"].map(n => <button key={n} className="cbtn" onClick={() => calcInput(n)}>{n}</button>)}
                <button className="cbtn op" onClick={() => calcOpPress("×")}>×</button>
                {["4","5","6"].map(n => <button key={n} className="cbtn" onClick={() => calcInput(n)}>{n}</button>)}
                <button className="cbtn op" onClick={() => calcOpPress("−")}>−</button>
                {["1","2","3"].map(n => <button key={n} className="cbtn" onClick={() => calcInput(n)}>{n}</button>)}
                <button className="cbtn op" onClick={() => calcOpPress("+")}>+</button>
                <button className="cbtn z2" onClick={() => calcInput("0")}>0</button>
                <button className="cbtn" onClick={() => calcInput(".")}>.</button>
                <button className="cbtn eq" onClick={calcEquals}>=</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}