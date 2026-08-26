import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, CircleHelp, Save, Target } from "lucide-react";

const STEPS = [
  "Mission",
  "Culture",
  "Problem",
  "Objectives",
  "Advantage",
  "Priorities",
  "KPIs"
];

const CULTURE_VALUES = [
  "Innovation",
  "Sustainability",
  "Customer Obsession",
  "Cost Leadership",
  "Integrity",
  "Operational Excellence",
  "People Development",
  "Entrepreneurial Spirit"
];

const OBJECTIVES = ["Market Presence", "Profit", "Cash", "Shareholder Value"];
const FUNCTIONS = ["Marketing", "Sales", "Manufacturing", "R&D", "Human Resources"];
const EMPTY_PLAN = {
  mission: "",
  culture: [],
  problemStatement: "",
  objectives: OBJECTIVES,
  advantage: "Differentiation",
  focus: "Broad",
  priorities: { Marketing: 20, Sales: 20, Manufacturing: 20, "R&D": 20, "Human Resources": 20 },
  kpis: { marketShare: "", netIncome: "", endingCash: "", netEquity: "" }
};

function wordCount(value) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

const draftKey = (universeId, teamId, quarter) =>
  `ev_strategy_draft_${universeId}_${teamId}_${quarter}`;

function normalizePlan(value) {
  return {
    ...EMPTY_PLAN,
    ...value,
    culture: Array.isArray(value?.culture) ? value.culture : [],
    objectives: Array.isArray(value?.objectives) && value.objectives.length === 4 ? value.objectives : OBJECTIVES,
    priorities: { ...EMPTY_PLAN.priorities, ...(value?.priorities || {}) },
    kpis: { ...EMPTY_PLAN.kpis, ...(value?.kpis || {}) }
  };
}

export default function StrategyWizard({ universeId, teamId, quarter, teamName, onNotify }) {
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState(EMPTY_PLAN);
  const [status, setStatus] = useState("idle");
  const [loaded, setLoaded] = useState(false);

  const priorityTotal = useMemo(() => FUNCTIONS.reduce((sum, name) => sum + Number(plan.priorities[name] || 0), 0), [plan.priorities]);
  const missionWords = wordCount(plan.mission);
  const updatePlan = (changes) => setPlan((current) => {
    const next = { ...current, ...changes };
    localStorage.setItem(draftKey(universeId, teamId, quarter), JSON.stringify(next));
    return next;
  });

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    fetch(`/api/strategy-plans?universeId=${encodeURIComponent(universeId)}&teamId=${encodeURIComponent(teamId)}&quarter=${quarter}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (cancelled) return;
        if (data?.plan) {
          setPlan(normalizePlan(data.plan));
          localStorage.removeItem(draftKey(universeId, teamId, quarter));
        } else {
          const draft = localStorage.getItem(draftKey(universeId, teamId, quarter));
          if (draft) setPlan(normalizePlan(JSON.parse(draft)));
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [universeId, teamId, quarter]);

  const saveDraft = async (currentPlan) => {
    try {
      await fetch("/api/strategy-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universeId, teamId, quarter, plan: currentPlan, isDraft: true })
      });
    } catch (_) {}
  };

  const savePlan = async () => {
    if (priorityTotal !== 100) {
      onNotify?.("Adjust priority sliders to total exactly 100 before saving.");
      setStep(5);
      return;
    }
    if (missionWords > 200) {
      onNotify?.("Mission statement exceeds 200 words.");
      setStep(0);
      return;
    }
    setStatus("saving");
    try {
      const response = await fetch("/api/strategy-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universeId, teamId, quarter, plan })
      });
      if (!response.ok) throw new Error("Strategy plan could not be saved.");
      setStatus("saved");
      localStorage.removeItem(draftKey(universeId, teamId, quarter));
      onNotify?.("Strategy plan saved successfully.");
    } catch (error) {
      setStatus("error");
      onNotify?.(`Save failed: ${error.message}. Your draft is preserved locally.`);
    }
  };

  const moveObjective = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= plan.objectives.length) return;
    const objectives = [...plan.objectives];
    [objectives[index], objectives[nextIndex]] = [objectives[nextIndex], objectives[index]];
    updatePlan({ objectives });
  };

  const setPriority = (name, value) => {
    const nextValue = Number(value);
    const currentValue = Number(plan.priorities[name] || 0);
    const remainder = 100 - (priorityTotal - currentValue);
    updatePlan({ priorities: { ...plan.priorities, [name]: Math.max(0, Math.min(nextValue, remainder)) } });
  };

  const renderStep = () => {
    if (step === 0) return <Field title="Mission statement" description="What enduring purpose guides the company?">
      <textarea value={plan.mission} onChange={(event) => updatePlan({ mission: event.target.value })} rows={7} maxLength={1400} placeholder="We exist to..." className="strategy-textarea" />
      <div className={`strategy-helper ${missionWords > 200 ? "is-error" : ""}`}>{missionWords}/200 words</div>
    </Field>;
    if (step === 1) return <Field title="Corporate culture" description="Choose the values your team will use to make trade-offs this quarter.">
      <div className="strategy-option-grid">{CULTURE_VALUES.map((value) => <label key={value} className={`strategy-check ${plan.culture.includes(value) ? "is-selected" : ""}`}><input type="checkbox" checked={plan.culture.includes(value)} onChange={() => updatePlan({ culture: plan.culture.includes(value) ? plan.culture.filter((item) => item !== value) : [...plan.culture, value] })} /><span>{value}</span></label>)}</div>
    </Field>;
    if (step === 2) return <Field title="Problem statement" description="Name the key challenge that needs a strategic response this quarter."><textarea value={plan.problemStatement} onChange={(event) => updatePlan({ problemStatement: event.target.value })} rows={8} placeholder="Our most important challenge is..." className="strategy-textarea" /></Field>;
    if (step === 3) return <Field title="Corporate objectives" description="Rank these objectives from most important to least important."><div className="strategy-rank-list">{plan.objectives.map((objective, index) => <div className="strategy-rank-row" key={objective}><span className="strategy-rank-number">{index + 1}</span><strong>{objective}</strong><span className="strategy-rank-actions"><button type="button" title="Move up" aria-label={`Move ${objective} up`} disabled={index === 0} onClick={() => moveObjective(index, -1)}><ChevronUp size={16} /></button><button type="button" title="Move down" aria-label={`Move ${objective} down`} disabled={index === plan.objectives.length - 1} onClick={() => moveObjective(index, 1)}><ChevronDown size={16} /></button></span></div>)}</div></Field>;
    if (step === 4) return <Field title="Basis for competitive advantage" description="Choose how you will win and where you will focus."><div className="strategy-split-options"><OptionGroup label="How we win" options={["Cost Leadership", "Differentiation", "Hybrid"]} value={plan.advantage} onChange={(advantage) => updatePlan({ advantage })} /><OptionGroup label="Where we play" options={["Broad", "Niche"]} value={plan.focus} onChange={(focus) => updatePlan({ focus })} /></div></Field>;
    if (step === 5) return <Field title="Functional strategy priorities" description="Allocate exactly 100 points across the functions. These points express where leadership attention and resources go."><div className="strategy-budget-total"><span>Allocated</span><strong className={priorityTotal === 100 ? "is-good" : "is-error"}>{priorityTotal}/100</strong></div><div className="strategy-slider-list">{FUNCTIONS.map((name) => <label key={name} className="strategy-slider-row"><span><strong>{name}</strong><output>{plan.priorities[name]} pts</output></span><input type="range" min="0" max="100" value={plan.priorities[name]} onChange={(event) => setPriority(name, event.target.value)} /></label>)}</div>{priorityTotal !== 100 && (
      <div style={{
        marginTop: '12px',
        padding: '10px 14px',
        borderRadius: '8px',
        background: 'var(--bg-danger, #FCEBEB)',
        border: '0.5px solid var(--border-danger, #F09595)',
        color: 'var(--text-danger, #A32D2D)',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <strong>Total: {priorityTotal}/100</strong>
        — adjust sliders until the total equals exactly 100 before saving.
        {priorityTotal > 100 ? ` Reduce by ${priorityTotal - 100} pts.` : ` Add ${100 - priorityTotal} pts.`}
      </div>
    )}</Field>;
    return <Field title="Goals with KPIs" description="Set the target values your team will use to evaluate the quarter."><div className="strategy-kpi-grid"><KpiInput label="Market Share" suffix="%" value={plan.kpis.marketShare} onChange={(marketShare) => updatePlan({ kpis: { ...plan.kpis, marketShare } })} /><KpiInput label="Net Income" suffix="currency" value={plan.kpis.netIncome} onChange={(netIncome) => updatePlan({ kpis: { ...plan.kpis, netIncome } })} /><KpiInput label="Ending Cash" suffix="currency" value={plan.kpis.endingCash} onChange={(endingCash) => updatePlan({ kpis: { ...plan.kpis, endingCash } })} /><KpiInput label="Net Equity" suffix="currency" value={plan.kpis.netEquity} onChange={(netEquity) => updatePlan({ kpis: { ...plan.kpis, netEquity } })} /></div></Field>;
  };

  return <section className="strategy-page">
    <div className="strategy-hero"><div><div className="strategy-eyebrow"><Target size={14} /> QUARTERLY STRATEGY LAB</div><h1>Build the plan behind the numbers.</h1><p>{teamName} · Quarter {quarter}</p></div><div className="strategy-status">{loaded ? "Draft synced" : "Loading draft..."}<CircleHelp size={16} title="Your plan is scoped to this team, universe, and quarter." /></div></div>
    <div className="strategy-stepper">{STEPS.map((label, index) => <button type="button" key={label} className={index === step ? "is-active" : index < step ? "is-complete" : ""} onClick={() => setStep(index)}><span>{index < step ? <Check size={14} /> : index + 1}</span>{label}</button>)}</div>
    <div className="strategy-panel">{renderStep()}<div className="strategy-footer"><button type="button" className="strategy-secondary" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Back</button><div className="strategy-footer-right">{status === "saved" && (
      <div style={{ padding:'8px 14px', borderRadius:'8px',
        background:'var(--bg-success)', color:'var(--text-success)',
        fontSize:'13px', display:'flex', alignItems:'center', gap:'6px' }}>
        ✓ Strategy plan saved to server. You can safely navigate away.
      </div>
    )}{step < STEPS.length - 1 ? <button type="button" className="strategy-primary" disabled={step === 0 && missionWords > 200} onClick={async () => { await saveDraft(plan); setStep(step + 1); }}>Continue <ArrowRight size={16} /></button> : <>{priorityTotal !== 100 && (
      <p style={{ fontSize:'12px', color:'var(--text-danger)', margin:'0 12px 0 0' }}>
        Fix priorities (currently {priorityTotal}/100) to enable save.
      </p>
    )}<button type="button" className="strategy-primary" disabled={missionWords > 200 || priorityTotal !== 100 || status === "saving"} onClick={savePlan}><Save size={16} /> {status === "saving" ? "Saving..." : "Save strategy"}</button></>}</div></div></div>
  </section>;
}

function Field({ title, description, children }) { return <div className="strategy-field"><div className="strategy-field-heading"><div><h2>{title}</h2><p>{description}</p></div></div>{children}</div>; }
function OptionGroup({ label, options, value, onChange }) { return <div><h3 className="strategy-group-label">{label}</h3><div className="strategy-radio-list">{options.map((option) => <label key={option} className={`strategy-radio ${value === option ? "is-selected" : ""}`}><input type="radio" name={label} checked={value === option} onChange={() => onChange(option)} /><span>{option}</span></label>)}</div></div>; }
function KpiInput({ label, suffix, value, onChange }) { return <label className="strategy-kpi"><span>{label}</span><div><input type="number" min="0" step="any" value={value} onChange={(event) => onChange(event.target.value)} placeholder="0" /><small>{suffix}</small></div></label>; }

export function StrategySummary({ universeId, teamId, quarter, onOpen }) {
  const [plan, setPlan] = useState(null);
  useEffect(() => {
    fetch(`/api/strategy-plans?universeId=${encodeURIComponent(universeId)}&teamId=${encodeURIComponent(teamId)}&quarter=${quarter}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setPlan(data?.plan ? normalizePlan(data.plan) : null))
      .catch(() => setPlan(null));
  }, [universeId, teamId, quarter]);
  return <div className="strategy-summary">
    <div className="strategy-summary-mark"><Target size={18} /></div>
    <div className="strategy-summary-copy"><span className="strategy-eyebrow">Q{quarter} STRATEGY SUMMARY</span><h2>{plan?.mission || "Your strategic north star is waiting."}</h2><p>{plan ? `${plan.advantage} · ${plan.focus} focus · Priority: ${plan.objectives[0]}` : "Align mission, choices, resources, and measurable goals in one shared plan."}</p></div>
    <button type="button" className="strategy-summary-action" onClick={onOpen}>{plan ? "Review plan" : "Start planning"}<ArrowRight size={16} /></button>
  </div>;
}
// FIX: Auto-save draft to localStorage inside updatePlan so data
// survives tab navigation. Key format: ev_strategy_draft_{universeId}_{teamId}_{quarter}
// Return the next state object after writing to localStorage.
const updatePlan = (changes) => setPlan((current) => {
  const next = { ...current, ...changes };
  localStorage.setItem(draftKey(universeId, teamId, quarter), JSON.stringify(next));
  return next;
});