import {
  ScooterModel,
  TeamState,
  SegmentDef,
  GameState,
  QuarterResult,
  AddonId,
  TechProject
} from "../types/simulation";
import {
  CATALOG,
  ADDONS,
  TECHS,
  SEGMENTS,
  CLAIMS,
  BASE_PLATFORM,
  ASSEMBLY,
  HR,
  CENTRE,
  CAP_BLOCK,
  DEP_RATE,
  HOLD_COST,
  TEAM_COLORS,
  ARCHETYPES,
  MARKETS,
  DEFAULT_MARKET_IDS,
  techById
} from "./catalog";

export function marketById(id: string) {
  return MARKETS.find((m) => m.id === id);
}

// One-time entry cost to open stores in the given cities this quarter.
export function centreOpenCost(cityIds: string[] | undefined): number {
  if (!cityIds || cityIds.length === 0) return 0;
  return cityIds.reduce((sum, id) => sum + (marketById(id)?.entryCost ?? CENTRE.open), 0);
}

// How many teams (including this one) currently have a store in a city.
export function cityOccupancy(st: GameState, cityId: string): number {
  return st.teams.reduce((n, t) => n + ((t.storeCities || []).includes(cityId) ? 1 : 0), 0);
}

// Extra reach earned from a team's occupied markets, split between every
// team present in the same city so being first into a large market pays off.
export function marketBonusOf(st: GameState, t: TeamState): number {
  return (t.storeCities || []).reduce((sum, id) => {
    const market = marketById(id);
    if (!market) return sum;
    const occupants = Math.max(1, cityOccupancy(st, id));
    return sum + market.demandBonus / occupants;
  }, 0);
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const clamp10 = (v: number) => clamp(v, 0, 10);

export function scoreModel(m: ScooterModel, t?: TeamState): Record<string, number> {
  const c = m.cfg;
  const ad = m.add;
  const isLFP = ["BC4", "BC5"].includes(c.battery);
  const a: Record<string, number> = {};

  const ptScore = { PT1: 8, PT2: 6.5, PT3: 5, PT4: 3 }[c.powertrain] || 5;
  const modeScore = { RM1: 0, RM2: 0.5, RM3: 1.2, RM4: 2 }[c.modes] || 0;
  a.perf = clamp10(ptScore + modeScore);

  const batRange = { BC1: 10, BC2: 8, BC3: 7.5, BC4: 6.5, BC5: 4.5 }[c.battery] || 5;
  a.range = clamp10(batRange + (ad.regen ? 0.5 : 0));

  const batCharge = { BC1: 10, BC2: 7.5, BC3: 6, BC4: 5, BC5: 4 }[c.battery] || 5;
  a.charge = clamp10(batCharge + (ad.removable ? 2 : 0));

  const techScore = { CT1: 1.5, CT2: 5, CT3: 7.5, CT4: 10 }[c.tech] || 5;
  a.tech = clamp10(techScore + (ad.theft ? 0.5 : 0));

  const buildScore = { BD1: 9, BD2: 6, BD3: 3.5 }[c.build] || 5;
  a.build = clamp10(buildScore + (c.wheels === "ALLOY" ? 1 : 0) + (ad.colors ? 0.5 : 0));

  const seatScore = { WIDE: 3, STD: 1.5 }[c.seat] || 2;
  const suspScore = { SUS1: 5.5, SUS2: 4, SUS3: 2 }[c.susp] || 3;
  a.comfort = clamp10(
    seatScore +
      suspScore +
      (ad.boot ? 1 : 0) +
      (ad.backrest ? 0.5 : 0) +
      (ad.hillhold ? 0.3 : 0) +
      (ad.reverse ? 0.3 : 0)
  );

  const brakeScore = { BR1: 6.5, BR2: 4.5, BR3: 2.5 }[c.brakes] || 3;
  a.safety = clamp10(
    brakeScore +
      (ad.tpms ? 1 : 0) +
      (ad.sidestand ? 0.5 : 0) +
      (ad.hillhold ? 1 : 0) +
      (ad.theft ? 0.5 : 0) +
      (ad.regen ? 0.5 : 0)
  );

  a.econ = clamp10(
    4 +
      (isLFP ? 1.5 : 0) +
      (c.powertrain === "PT4" ? 1 : 0) +
      (c.build === "BD1" ? 1 : 0) +
      (c.build === "BD3" ? -1 : 0) +
      (ad.extwarranty ? 2 : 0) +
      (ad.removable ? 0.5 : 0)
  );

  // Apply developed R&D technology effects
  const activeTechIds = m.equippedTechs
    ? m.equippedTechs.filter((id) => t?.techs?.includes(id))
    : (t?.techs || []);

  if (activeTechIds.length) {
    for (const id of activeTechIds) {
      const tc = techById(id);
      if (!tc) continue;
      for (const k of Object.keys(tc.fx)) {
        a[k] = clamp10((a[k] || 0) + (tc.fx[k] || 0));
      }
    }
  }

  if (t) {
    a.econ = clamp10(a.econ + 3 * (reliabilityOf(t) - 0.5));
  }

  a.build_eco = clamp10(
    ({ BD1: 9, BD2: 5, BD3: 2.5 }[c.build] || 5) +
      (isLFP ? 1 : 0) +
      (ad.regen ? 0.5 : 0) +
      (ad.extwarranty ? 1 : 0)
  );
  a.build_style = clamp10(a.build + (ad.colors ? 1 : 0));

  return a;
}

export function qualityFit(a: Record<string, number>, seg: SegmentDef): number {
  let q = 0;
  for (const k of Object.keys(seg.w)) {
    let x = a[k] || 0;
    if (k === "build" && seg.id === "S3") x = a.build_eco || x;
    if (k === "build" && seg.id === "S4") x = a.build_style || x;
    q += seg.w[k] * (x / 10);
  }
  return q / 100;
}

export function priceFit(p: number, seg: SegmentDef): number {
  const [L, H] = seg.wtp;
  if (p <= L) return 1;
  if (p <= H) return Math.pow((H - p) / (H - L), seg.theta);
  return 0.08 * Math.exp(-(p - H) / (0.1 * H));
}

export function unitCost(m: ScooterModel): number {
  let c = BASE_PLATFORM;
  for (const cat of Object.keys(CATALOG)) {
    const opt = CATALOG[cat].opts.find((o) => o.id === (m.cfg as any)[cat]);
    if (opt) c += opt.cost;
  }
  for (const a of ADDONS) {
    if (m.add[a.id]) c += a.cost;
  }
  return c + ASSEMBLY;
}

export function bomHash(m: ScooterModel): string {
  return Object.values(m.cfg).join("|") + "|" + ADDONS.map((a) => (m.add[a.id] ? 1 : 0)).join("");
}

export function enforceModelRules(m: ScooterModel): string[] {
  const msgs: string[] = [];
  const mo = CATALOG.modes.opts.find((o) => o.id === m.cfg.modes);
  if (mo && mo.req && !mo.req(m)) {
    const fb = [...CATALOG.modes.opts].reverse().find((o) => !o.req || o.req(m));
    if (fb) {
      msgs.push(`Riding modes reset to ${fb.id} (motor too small).`);
      m.cfg.modes = fb.id as any;
    }
  }
  for (const a of ADDONS) {
    if (m.add[a.id] && a.req && !a.req(m)) {
      m.add[a.id] = false;
      msgs.push(`${a.name} removed (requirement lost).`);
    }
  }
  return msgs;
}

export function mkModel(name: string, cfg: any, addIds: string[], price: number): ScooterModel {
  const add: any = {};
  ADDONS.forEach((a) => (add[a.id] = addIds.includes(a.id)));
  return {
    id: "M" + Math.random().toString(36).slice(2, 7),
    name,
    cfg: { ...cfg },
    add,
    price,
    launchedQ: null,
    lastHash: null,
    inv: 0
  };
}

export function reliabilityOf(t: TeamState): number {
  const spendReliability = 1 - 0.5 * Math.exp(-t.qualityCum / 150);
  const components = t.qualityComponents;
  if (!components || components.length === 0) return spendReliability;
  const componentReliability = components.reduce(
    (total, component) => total + 0.5 + Math.min(0.5, Math.max(0, component.reliabilityImprovement) / 100),
    0
  ) / components.length;
  return Math.max(0, Math.min(1, (spendReliability + componentReliability) / 2));
}

export function equityOf(t: TeamState): number {
  return t.paidIn + t.cumProfit;
}

export function debtOf(t: TeamState): number {
  return t.debt.bank + t.debt.lt + t.debt.shark;
}

export function bankLimit(t: TeamState): number {
  return Math.max(0, 1.5 * equityOf(t) - t.debt.lt - t.debt.shark);
}

export function ltLimit(t: TeamState): number {
  return Math.max(0, 2 * equityOf(t) - debtOf(t));
}

export function sharesOf(t: TeamState): number {
  return t.shares || 100;
}

export function stockPriceOf(t: TeamState): number {
  if (t.stockPrice && t.stockPrice > 0) return t.stockPrice;
  const val = valuationOf(t);
  const sh = sharesOf(t);
  return Math.max(0.5, Math.round((val / sh) * 100) / 100);
}

export function marketCapOf(t: TeamState): number {
  return Math.round(sharesOf(t) * stockPriceOf(t) * 10) / 10;
}

export function maxShareIssueLimit(t: TeamState): number {
  // Max 30% dilution or 800 Lakhs
  const currentCap = marketCapOf(t);
  return Math.max(100, Math.min(800, Math.round(currentCap * 0.35)));
}

export function maxShareBuybackLimit(t: TeamState): number {
  // Can only buy back if solvent and surplus cash available, keeping at least 25 Lakh shares
  const sh = sharesOf(t);
  if (sh <= 25 || t.cash <= 50) return 0;
  const p = stockPriceOf(t);
  const maxSharesToBuy = sh - 25;
  return Math.max(0, Math.min(Math.round(t.cash * 0.6), Math.round(maxSharesToBuy * p)));
}

export function hrMults(st: GameState, t: TeamState): { sales: number; plant: number } {
  const defaults = {
    sales: { salary: 3.5, benefits: 8, vacation: 15, bonus: 10 },
    production: { salary: 2.5, benefits: 8, vacation: 18, bonus: 8, safetyBonus: 5 }
  };
  const value = (pkg: any, kind: "sales" | "production") => {
    const safety = kind === "production" ? Number(pkg.safetyBonus || 0) : 0;
    return Number(pkg.salary || 0) * (1 + Number(pkg.benefits || 0) / 100 + Number(pkg.bonus || 0) / 100 + safety / 100) + Number(pkg.vacation || 0) * 0.03;
  };
  if (t.hrCompensation) {
    const packageFor = (team: TeamState, kind: "sales" | "production") => ({ ...defaults[kind], ...(team.hrCompensation?.[kind] || {}) });
    const score = (kind: "sales" | "production") => {
      const benchmark = st.teams.reduce((sum, team) => sum + value(packageFor(team, kind), kind), 0) / Math.max(1, st.teams.length);
      return clamp(value(packageFor(t, kind), kind) / Math.max(0.0001, benchmark), 0.75, 1.25);
    };
    return { sales: score("sales"), plant: score("production") };
  }
  const mean = (k: "sales" | "plant") =>
    st.teams.reduce((x, x2) => x + x2.hr[k], 0) / (st.teams.length || 1);
  const f = (idx: number, mn: number) => clamp(1 + 0.008 * (idx - mn), 0.75, 1.15);
  return { sales: f(t.hr.sales, mean("sales")), plant: f(t.hr.plant, mean("plant")) };
}

export function reachOf(t: { centres: number; staff: number }, salesMult?: number, marketBonus?: number): number {
  return clamp(1 - Math.exp(-(t.centres * 0.28 + t.staff * (salesMult || 1) * 0.035 + (marketBonus || 0))), 0.15, 0.97);
}

export function futureInvOf(r: QuarterResult): number {
  return (
    (r.rndSpend || 0) +
    (r.licPaid || 0) +
    (r.quality || 0) +
    (r.centreOpen || 0) +
    (r.dev || 0) +
    (r.dep || 0)
  );
}

export function valuationOf(t: TeamState): number {
  const L = Math.min(4, t.hist.length);
  if (L === 0) return 800;
  const annRev = t.hist.slice(-L).reduce((x, r) => x + r.revenue, 0) * (4 / L);
  const bscAvg = cumBSC(t);
  return Math.max(800, Math.round(1.2 * annRev * (0.7 + 0.6 * t.rep) * (1 + 0.15 * Math.min(2, bscAvg))));
}

export function computeBSC(t: TeamState, r: QuarterResult, _st: GameState) {
  const paidCr = Math.max(1, t.paidIn / 100);
  const netOp = r.profit + futureInvOf(r);
  const FP = (r.grossProfit + netOp) / 2 / paidCr / 10;
  const shares = [r.sharePrim, r.shareSec];
  const served = r.demandTot > 0 ? clamp((r.demandTot - r.lost) / r.demandTot, 0, 1) : 1;
  const MP = ((shares[0] + shares[1]) / 2) * served;
  const ME = clamp((r.brandJ + r.campJ) / 2 / 100, 0, 1);
  const IF = clamp(1 + 10 * (t.cumFuture / Math.max(1, t.cumRevenue)), 1, 5);
  // Wealth creation combines book equity, stock price appreciation, and cumulative dividends
  const stockRatio = stockPriceOf(t) / 8.0;
  const divRatio = (t.cumDividends || 0) / Math.max(1, t.paidIn);
  const W = clamp((equityOf(t) / Math.max(1, t.paidIn)) * 0.45 + stockRatio * 0.35 + divRatio * 0.6, 0.1, 4.5);
  const hr = r.hrM
    ? clamp(((r.hrM.sales - 0.75) / 0.4 + (r.hrM.plant - 0.75) / 0.4) / 2, 0, 1)
    : 0.6;
  const assets = Math.max(1, t.cash + r.invValue + t.ppe);
  const turn = clamp((r.revenue / assets) * 4, 0, 3) / 3;
  const invPen = r.produced > 0 ? Math.max(0, 1 - r.endInv / r.produced) : 1;
  const AM = turn * invPen;
  const MFG = r.reliab * clamp(r.util, 0, 1);
  const cap = equityOf(t) + debtOf(t);
  const FR = cap > 0 && equityOf(t) > 0 ? Math.sqrt(equityOf(t) / cap) : 0;
  const parts: Record<string, number> = { FP: Math.max(0, FP), MP, ME, IF, W, HR: hr, AM, MFG, FR };
  if (r.sustainabilityScore !== undefined) parts.ESG = clamp(1 + r.sustainabilityScore / 100, 0.8, 1.1);
  let total = 100;
  for (const k of Object.keys(parts)) total *= parts[k];
  return { parts, total: Math.max(0, total) };
}

export function cumBSC(t: TeamState): number {
  const L = Math.min(4, t.hist.length);
  if (L === 0) return 0;
  return t.hist.slice(-L).reduce((x, r) => x + (r.bsc ? r.bsc.total : 0), 0) / L;
}

export function costTier(cat: string, id: string): number {
  if (!CATALOG[cat]) return 1;
  const opts = CATALOG[cat].opts.slice().sort((a, b) => a.cost - b.cost);
  for (let i = 0; i < opts.length; i++) if (opts[i].id === id) return i + 1;
  return 1;
}

export function isTopTier(cat: string, id: string, howMany: number): boolean {
  if (!CATALOG[cat]) return true;
  const n = CATALOG[cat].opts.length;
  return costTier(cat, id) > n - howMany;
}

export function proFormaCalc(st: GameState, t: TeamState) {
  const prod = t.models.reduce((x, m) => x + (+t.dec.prod[m.id] || 0), 0);
  const materials = t.models.reduce((x, m) => {
    return x + (+t.dec.prod[m.id] || 0) * (unitCost(m) / 1e5);
  }, 0);

  const ad = +t.dec.ad || 0;
  const quality = +t.dec.quality || 0;
  const dev = +t.dec.devCost || 0;
  const rnd = +t.dec.rndStartCost || 0;
  const research = (t.dec.buyIntel ? 15 : 0) + (t.dec.buyClinic ? 10 : 0);
  const centreOpen = centreOpenCost(t.dec.newCentreCities);
  const capex = (+t.dec.expBlocks || 0) * CAP_BLOCK.cost;

  const newStaff = t.staff + (+t.dec.hire || 0);
  const newCentres = t.centres + (+t.dec.newCentres || 0);
  const salesPayroll = newStaff * HR.salesCost * (t.hr.sales / 100);
  const plantPayroll = t.capacity * HR.plantRate * (t.hr.plant / 100);
  const netOpex = newCentres * CENTRE.opex;
  const fixed = 50 + 0.02 * t.capacity;
  const interest = t.debt.bank * 0.04 + t.debt.lt * 0.045 + t.debt.shark * 0.15;

  // Capital structure / financing flows
  const shareBuyback = +t.dec.shareBuyback || 0;
  const divPerShare = +t.dec.dividendPerShare || 0;
  const totalDiv = divPerShare * sharesOf(t);

  const out =
    materials +
    ad +
    quality +
    dev +
    rnd +
    research +
    centreOpen +
    capex +
    salesPayroll +
    plantPayroll +
    netOpex +
    fixed +
    interest +
    shareBuyback +
    totalDiv;

  const headroom = Math.max(0, bankLimit(t) - t.debt.bank);
  const ltInflow = +t.dec.ltIssue || 0;
  const equityInflow = +t.dec.shareIssue || 0;
  const totalInflow = ltInflow + equityInflow;

  // Sales revenue estimate. Quarter 1 has no market demand yet (setup-only
  // quarter, mirrors simulateQuarter's tam=0 rule), so no revenue is credited.
  // From Quarter 2 on, anchor the estimate to last quarter's actual sell-through
  // (or half of what's available if there's no history yet), capped by what can
  // actually be sold this quarter (units produced plus existing inventory).
  // This keeps the pro forma / auditor cash projection from ignoring revenue
  // entirely, which previously made every quarter look insolvent regardless of
  // decisions.
  const existingInv = t.models.reduce((x, m) => x + (m.inv || 0), 0);
  const availableUnits = prod + existingInv;
  const lastActual = t.hist.length ? t.hist[t.hist.length - 1] : null;
  const demandRunRate = lastActual ? lastActual.units : availableUnits * 0.5;
  const estUnitsSold = st.quarter === 1 ? 0 : Math.min(availableUnits, demandRunRate * 1.05);
  const avgPrice = t.models.length ? t.models.reduce((x, m) => x + (m.price || 0), 0) / t.models.length : 0;
  const revenue = (estUnitsSold * avgPrice) / 1e5;

  // G&A, warranty and inventory holding are all real charges inside simulateQuarter's
  // ebitda calc (see the `ga`/`warranty`/`holding` lines there) but were missing here,
  // which let this pro forma (and the "insufficient funds" auditor gate built on it)
  // approve plans that simulateQuarter then ran cash-negative. Mirror the same formulas.
  const ga = 30 + 0.02 * revenue;
  const reliab = reliabilityOf(t);
  const warrPerUnit = (2600 - 1800 * reliab) / 1e5;
  const warranty = estUnitsSold * warrPerUnit;
  const estEndInv = Math.max(0, availableUnits - estUnitsSold);
  const holding = estEndInv * HOLD_COST;

  const outWithGaEtc = out + ga + warranty + holding;

  return {
    prod,
    materials,
    ad,
    quality,
    growth: dev + rnd + centreOpen + capex,
    people: salesPayroll + plantPayroll,
    running: netOpex + fixed + research + interest + ga + warranty + holding,
    shareBuyback,
    dividends: totalDiv,
    out: outWithGaEtc,
    revenue,
    estUnitsSold: Math.round(estUnitsSold),
    cash: t.cash,
    inflow: totalInflow,
    equityInflow,
    ltInflow,
    close: t.cash + revenue + totalInflow - outWithGaEtc,
    bankHeadroom: headroom
  };
}

export function auditTeam(st: GameState, t: TeamState): string[] {
  const errs: string[] = [];
  const q = st.quarter;
  const allocSum = SEGMENTS.reduce((x, s) => x + (+t.dec.alloc[s.id] || 0), 0);
  const prodSum = t.models.reduce((x, m) => x + (+t.dec.prod[m.id] || 0), 0);

  if (
    q === 1 &&
    (!String(t.vision || "").trim() || !String(t.mission || "").trim())
  ) {
    errs.push("Company charter incomplete: write a vision and a mission before locking Quarter 1.");
  }
  if (t.prim === t.sec) {
    errs.push("Primary and secondary target segments must differ.");
  }
  if (allocSum !== 100) {
    errs.push(`Marketing allocation must sum to exactly 100% (now ${allocSum}%).`);
  }
  if (prodSum > t.capacity) {
    errs.push(`Production schedule (${prodSum}) exceeds plant capacity (${t.capacity}).`);
  }
  if (q <= 3 && t.dec.ad > 300) {
    errs.push("Auditor limit in the test-market phase: advertising may not exceed Rs. 300 L before Quarter 4.");
  }

  // Equity & Share Auditor Checks
  if (t.dec.shareIssue && t.dec.shareIssue > 0) {
    const maxIssue = maxShareIssueLimit(t);
    if (t.dec.shareIssue > maxIssue) {
      errs.push(
        `Share issuance exceeds corporate limit: maximum new equity offering allowed this quarter is Rs. ${maxIssue} L.`
      );
    }
  }

  if (t.dec.shareBuyback && t.dec.shareBuyback > 0) {
    const maxBuyback = maxShareBuybackLimit(t);
    if (t.dec.shareBuyback > maxBuyback) {
      errs.push(
        `Share buyback exceeds treasury limit: maximum buyback allowed is Rs. ${maxBuyback} L (requires sufficient liquidity & minimum 25L shares).`
      );
    }
  }

  if (t.dec.dividendPerShare && t.dec.dividendPerShare > 0) {
    const totalDiv = t.dec.dividendPerShare * sharesOf(t);
    if (totalDiv > t.cash) {
      errs.push(
        `Declared dividend of Rs. ${t.dec.dividendPerShare.toFixed(2)}/share (total Rs. ${totalDiv.toFixed(
          1
        )} L) exceeds total liquid cash reserves (Rs. ${t.cash.toFixed(1)} L).`
      );
    }
  }

  if (equityOf(t) < 0) {
    errs.push("Bankruptcy condition: common stock plus retained earnings must not be negative.");
  }
  if ((t.dec.cdInvestment || 0) > Math.max(0, t.cash)) {
    errs.push("CD investment cannot exceed available cash.");
  }
  if ((t.dec.interestRate || 0) < 0 || (t.dec.interestRate || 0) > 0.25) {
    errs.push("Bank interest rate must be between 0% and 25% per quarter.");
  }

  const newCentreCities = t.dec.newCentreCities || [];
  if (newCentreCities.length > 2) {
    errs.push("You may open stores in at most 2 new cities per quarter.");
  }
  for (const id of newCentreCities) {
    if (!marketById(id)) errs.push(`Unknown market "${id}" selected for a new store.`);
    else if ((t.storeCities || []).includes(id)) errs.push(`Your team already has a store in ${marketById(id)!.city}.`);
  }
  if (new Set(newCentreCities).size !== newCentreCities.length) {
    errs.push("Duplicate city selected for a new store this quarter.");
  }

  const newStaff = t.staff + (t.dec.hire || 0);
  const newCentres = t.centres + (t.dec.newCentres || 0);
  if (newStaff > 8 * newCentres) {
    errs.push(
      `Sales staff (${newStaff}) may not exceed 8 per experience centre (${newCentres} centres = max ${
        8 * newCentres
      }).`
    );
  }
  if (newStaff < 4) {
    errs.push("Keep at least 4 sales staff; the firm cannot trade without a sales function.");
  }
  if (q >= 4) {
    const bigSpend =
      (t.dec.rndStartCost || 0) +
      (t.dec.expBlocks || 0) * CAP_BLOCK.cost +
      centreOpenCost(t.dec.newCentreCities);
    if (bigSpend > 0.9 * Math.max(0, equityOf(t))) {
      errs.push(
        `Auditor limit: R&D, expansion and new centres this quarter (Rs. ${bigSpend.toFixed(
          0
        )} L) may not exceed 90% of net equity (Rs. ${Math.max(0, equityOf(t)).toFixed(0)} L).`
      );
    }
  }

  for (const m of t.models) {
    if (m.price < 60000) {
      errs.push(`${m.name}: price below the Rs. 60,000 floor set by the auditor.`);
    }
    if (m.price > 190000) {
      errs.push(`${m.name}: price above the Rs. 1,90,000 ceiling.`);
    }
  }

  for (const m of t.models) {
    const uc = unitCost(m);
    if (m.price <= uc) {
      errs.push(
        `${m.name}: price of Rs. ${Math.round(m.price).toLocaleString(
          "en-IN"
        )} is at or below its unit cost of Rs. ${Math.round(uc).toLocaleString(
          "en-IN"
        )}. Every unit sold would lose money. Raise the price or simplify the specification.`
      );
    } else if (m.price < uc * 1.12) {
      errs.push(
        `${m.name}: gross margin is only ${(
          ((m.price - uc) / m.price) *
          100
        ).toFixed(
          1
        )}%. After advertising, payroll and centre costs this cannot cover its own overhead. The auditor requires at least 12% margin.`
      );
    }
  }

  const claims = t.dec.claims || [];
  if (claims.length) {
    const best = t.models.slice().sort((a, b) => b.price - a.price)[0];
    if (best) {
      const c = best.cfg;
      const fails: string[] = [];
      if (claims.includes("perf") && !isTopTier("powertrain", c.powertrain, 2))
        fails.push("Performance, with a mid or entry powertrain");
      if (claims.includes("range") && !isTopTier("battery", c.battery, 3))
        fails.push("Range, with one of the smaller battery packs");
      if (claims.includes("charge") && !isTopTier("battery", c.battery, 2))
        fails.push("Fast charging, without a fast-charge pack");
      if (claims.includes("tech") && !isTopTier("tech", c.tech, 2))
        fails.push("Smart tech, with a basic instrument cluster");
      if (claims.includes("build") && !isTopTier("build", c.build, 2))
        fails.push("Build and design, with an entry-level body");
      if (claims.includes("safety") && !isTopTier("brakes", c.brakes, 2))
        fails.push("Safety, without an upper-tier braking system");
      if (
        claims.includes("comfort") &&
        !isTopTier("seat", c.seat, 2) &&
        !isTopTier("susp", c.susp, 2)
      )
        fails.push("Comfort, with neither a better seat nor better suspension");
      if (
        claims.includes("econ") &&
        reliabilityOf(t) < 0.6 &&
        !(t.dec.quality > 0)
      )
        fails.push("Economy and reliability, with no quality programme and reliability still below 60%");

      for (const f of fails) {
        errs.push(
          `Deceptive advertising: your campaign claims ${f}. A claim the product cannot support is refused by the auditor.`
        );
      }
    }
  }

  if (prodSum === 0 && t.models.length > 0 && q > 1) {
    errs.push("No production scheduled for any model. Schedule production or explain decision.");
  }

  const pf = proFormaCalc(st, t);
  if (pf.close < 0) {
    const short = (-pf.close).toFixed(0);
    errs.push(
      `Insufficient funds. This quarter's plan commits Rs. ${pf.out.toFixed(
        0
      )} L against Rs. ${pf.cash.toFixed(0)} L of cash, leaving Rs. ${pf.close.toFixed(
        0
      )} L at the close. You are Rs. ${short} L short. Unused bank credit available: Rs. ${pf.bankHeadroom.toFixed(
        0
      )} L.`
    );
  }

  return errs;
}

export function seasonOf(q: number) {
  const p = (q - 1) % 4;
  return p === 1
    ? { f: 0.9, label: "Monsoon quarter · demand x0.9" }
    : p === 2
    ? { f: 1.25, label: "Festive quarter · demand x1.25" }
    : { f: 1, label: "Regular quarter" };
}

export function simulateQuarter(st: GameState) {
  const q = st.quarter;
  const season = seasonOf(q);
  // Quarter 1 is a setup-only quarter: teams fix production capacity, staffing
  // and store cities, and those costs/opex still settle normally, but no
  // customer demand is served (tam = 0) until Quarter 2, when real market
  // entry and selling begins.
  const tam = q === 1 ? 0 : st.cfg.tam0 * Math.pow(1 + st.cfg.growth, q - 1) * season.f;
  const pools: Record<string, number> = {};
  SEGMENTS.forEach((s) => (pools[s.id] = tam * s.pct));

  for (const t of st.teams) {
    t.staff = Math.max(0, t.staff + (t.dec.hire || 0));
    const newCities = (t.dec.newCentreCities || []).filter((id) => !(t.storeCities || []).includes(id));
    t.storeCities = [...(t.storeCities || []), ...newCities];
    t.centres = t.storeCities.length;
  }
  for (const t of st.teams) {
    (t as any)._hrM = hrMults(st, t);
    (t as any)._reach = reachOf(t, (t as any)._hrM.sales, marketBonusOf(st, t));
  }

  for (const t of st.teams) {
    const done = t.rnd.filter((p) => p.qDone <= q);
    for (const p of done) if (!t.techs.includes(p.id)) t.techs.push(p.id);
    t.rnd = t.rnd.filter((p) => p.qDone > q);
  }

  const LAMBDA = 2.5,
    ALPHA = 1.3,
    RHO = 0.5,
    OUTSIDE_U = 0.22,
    AW_DECAY = 0.1,
    AD_K = 120;

  for (const t of st.teams) {
    (t as any)._fit = {};
    for (const s of SEGMENTS) {
      const spend = (t.dec.ad * (t.dec.alloc[s.id] || 0)) / 100;
      const fit = (t.dec.claims || []).reduce((x, k) => x + (s.w[k] || 0), 0) / 100;
      (t as any)._fit[s.id] = fit;
      const adMult = t.dec.claims && t.dec.claims.length ? 0.8 + 0.8 * fit : 0.9;
      const me = Math.min(0.97, adMult * 0.9 * (1 - Math.exp(-spend / AD_K)));
      const wom = s.kappa * Math.min(1, t.base[s.id] / (pools[s.id] * 2 || 1)) * (t.rep - 0.5) * 2;
      let aw = t.aw[s.id];
      aw = aw + (1 - aw) * clamp(me + Math.max(0, wom), 0, 1) - AW_DECAY * aw + Math.min(0, wom) * 0.5;
      t.aw[s.id] = clamp(aw, 0.02, 0.97);
    }
  }

  const cats = Object.keys(CATALOG);
  for (const t of st.teams) {
    const n = t.models.length;
    let ch = 1;
    if (n > 1) {
      let diff = 0,
        pairs = 0;
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          pairs++;
          diff += cats.filter((c) => (t.models[i].cfg as any)[c] !== (t.models[j].cfg as any)[c]).length / cats.length;
        }
      ch = 1 - 0.1 * (n - 1) * (0.4 + 0.6 * (diff / (pairs || 1)));
    }
    (t as any)._ch = ch;
    const sched = t.models.reduce((x, m) => x + (t.dec.prod[m.id] || 0), 0);
    (t as any)._sched = sched;
    (t as any)._eff = ch * (t as any)._hrM.plant;
    (t as any)._chLoss = Math.round(sched * (1 - (t as any)._eff));
    (t as any)._produced = Math.round(sched * (t as any)._eff);
  }

  const offers: any[] = [];
  st.teams.forEach((t) =>
    t.models.forEach((m) => {
      const madeThisQ = (t.dec.prod[m.id] || 0) * (t as any)._eff;
      offers.push({
        t,
        m,
        scores: scoreModel(m, t),
        cost: unitCost(m),
        orders: {},
        sales: {},
        made: madeThisQ,
        avail: madeThisQ + (m.inv || 0)
      });
    })
  );

  const wBySeg: Record<string, any> = {};
  for (const s of SEGMENTS) {
    let den = Math.pow(OUTSIDE_U, LAMBDA);
    const ws: number[] = [];
    for (const o of offers) {
      const U =
        Math.pow(qualityFit(o.scores, s), ALPHA) *
        priceFit(o.m.price, s) *
        Math.pow(o.t.rep, RHO);
      const w = o.t.aw[s.id] * Math.pow(o.t._reach, 0.8) * Math.pow(U, LAMBDA);
      ws.push(w);
      den += w;
    }
    wBySeg[s.id] = { ws, den };
    offers.forEach((o, i) => {
      o.orders[s.id] = (pools[s.id] * ws[i]) / den;
    });
  }

  for (const o of offers) {
    const tot = SEGMENTS.reduce((x, s) => x + o.orders[s.id], 0);
    const ratio = tot > 0 ? Math.min(1, o.avail / tot) : 1;
    SEGMENTS.forEach((s) => (o.sales[s.id] = o.orders[s.id] * ratio));
    o.remaining = o.avail - SEGMENTS.reduce((x, s) => x + o.sales[s.id], 0);
    o.lost = tot - SEGMENTS.reduce((x, s) => x + o.sales[s.id], 0);
  }

  for (const s of SEGMENTS) {
    const unmet = offers.reduce((x, o) => x + (o.orders[s.id] - o.sales[s.id]), 0) * 0.6;
    if (unmet < 1) continue;
    const cands = offers.filter((o) => o.remaining > 1);
    const wsum = cands.reduce((x, o) => x + wBySeg[s.id].ws[offers.indexOf(o)], 0);
    if (wsum <= 0) continue;
    for (const o of cands) {
      const extra = Math.min(o.remaining, (unmet * wBySeg[s.id].ws[offers.indexOf(o)]) / wsum);
      o.sales[s.id] += extra;
      o.remaining -= extra;
    }
  }

  const licPaidBy: Record<number, number> = {};
  const licRecdBy: Record<number, number> = {};
  for (const c of st.contracts) {
    if (c.status !== "accepted") continue;
    const seller = st.teams[c.sellerI],
      buyer = st.teams[c.buyerI];
    licPaidBy[buyer.i] = (licPaidBy[buyer.i] || 0) + c.fee;
    licRecdBy[seller.i] = (licRecdBy[seller.i] || 0) + c.fee;
    if (!buyer.techs.includes(c.techId)) buyer.techs.push(c.techId);
    c.status = "executed";
    c.qExecuted = q;
  }

  for (const t of st.teams) {
    const tOffers = offers.filter((o) => o.t === t);
    const invStart = t.models.reduce((x, m) => x + (m.inv || 0) * unitCost(m), 0) / 1e5;
    let units = 0,
      revenue = 0,
      cogs = 0,
      lost = 0,
      demandTot = 0;
    const modelRows: any[] = [];

    for (const o of tOffers) {
      const u = SEGMENTS.reduce((x, s) => x + o.sales[s.id], 0);
      units += u;
      revenue += (u * o.m.price) / 1e5;
      cogs += (u * o.cost) / 1e5;
      lost += o.lost;
      demandTot += u + o.lost;
      const segSales: Record<string, number> = {};
      SEGMENTS.forEach((s) => (segSales[s.id] = o.sales[s.id]));
      modelRows.push({ name: o.m.name, price: o.m.price, units: u, segSales, cost: o.cost });
      SEGMENTS.forEach((s) => (t.base[s.id] += o.sales[s.id]));
      o.m.inv = Math.max(0, Math.round(o.remaining));
    }

    const endInv = t.models.reduce((x, m) => x + (m.inv || 0), 0);
    const invValue = t.models.reduce((x, m) => x + (m.inv || 0) * unitCost(m), 0) / 1e5;

    const dev = t.dec.devCost || 0;
    const research = (t.dec.buyIntel ? 15 : 0) + (t.dec.buyClinic ? 10 : 0);
    const ad = t.dec.ad;
    const salesPayroll = t.staff * HR.salesCost * (t.hr.sales / 100);
    const plantPayroll = t.capacity * HR.plantRate * (t.hr.plant / 100);
    const netOpex = t.centres * CENTRE.opex;
    const centreOpen = centreOpenCost(t.dec.newCentreCities);
    const fixed = 50 + 0.02 * t.capacity;
    const ga = 30 + 0.02 * revenue;
    const reliab = reliabilityOf(t);
    const warrPerUnit = (2600 - 1800 * reliab) / 1e5;
    const warranty = units * warrPerUnit;
    const quality = t.dec.quality || 0;
    const rndSpend = t.dec.rndStartCost || 0;
    const licPaid = licPaidBy[t.i] || 0,
      licRecd = licRecdBy[t.i] || 0;
    const holding = endInv * HOLD_COST;
    const dep = DEP_RATE * t.ppe;

    const bankRate = clamp(
      t.dec.interestRate ?? (0.03 + 0.02 * (bankLimit(t) > 0 ? t.debt.bank / Math.max(1, bankLimit(t)) : 0)),
      0,
      0.25
    );
    const intBank = t.debt.bank * bankRate;
    const intLT = t.debt.lt * 0.045;
    const sharkRate = t.debt.shark > 0 ? Math.min(0.25, 0.05 + 0.005 * Math.ceil(t.debt.shark / 100)) : 0;
    const intShark = t.debt.shark * sharkRate;
    const interest = intBank + intLT + intShark;

    const grossProfit = revenue - cogs;
    const ebitda =
      grossProfit -
      ad -
      fixed -
      ga -
      warranty -
      dev -
      research -
      salesPayroll -
      plantPayroll -
      netOpex -
      quality -
      rndSpend -
      licPaid +
      licRecd -
      holding;
    const profit = ebitda - interest - dep - centreOpen;
    const deltaInv = invValue - invStart;
    t.cash += profit + dep - deltaInv;
    t.cumProfit += profit;
    t.cumRevenue += revenue;
    t.qualityCum += quality;
    t.cumFuture += rndSpend + licPaid + quality + centreOpen + dev + dep;
    t.ppe = Math.max(0, t.ppe - dep);

    if (t.dec.ltIssue > 0 && t.debt.lt === 0) {
      const amt = Math.min(t.dec.ltIssue, ltLimit(t));
      if (amt > 0) {
        t.debt.lt = amt;
        t.debt.ltLeft = 20;
        t.cash += amt;
        (t as any)._ltIssued = amt;
      }
    }

    const bt = clamp(t.dec.bankTarget || 0, 0, bankLimit(t));
    const dBank = bt - t.debt.bank;
    t.debt.bank = bt;
    t.cash += dBank;

    const cdInvestment = Math.min(Math.max(0, t.dec.cdInvestment || 0), Math.max(0, t.cash));
    if (cdInvestment > 0) {
      const cdInterest = cdInvestment * 0.02;
      t.cash += cdInterest;
      t.cumProfit += cdInterest;
    }

    if (t.debt.lt > 0) {
      t.debt.ltLeft--;
      if (t.debt.ltLeft <= 0) {
        t.cash -= t.debt.lt;
        (t as any)._ltRepaid = t.debt.lt;
        t.debt.lt = 0;
      }
    }

    if (t.debt.shark > 0 && t.cash > 0) {
      const pay = Math.min(t.cash, t.debt.shark);
      t.debt.shark -= pay;
      t.cash -= pay;
    }

    const blocks = t.dec.expBlocks || 0;
    let capex = 0;
    if (blocks > 0) {
      capex = blocks * CAP_BLOCK.cost;
      t.cash -= capex;
      t.ppe += capex;
      (t as any)._capAdd = blocks * CAP_BLOCK.units;
    }

    let vcDeal = null;
    if (q >= st.cfg.vcQuarter && t.dec.vc && t.dec.vc.ask > 0) {
      const val = valuationOf(t);
      const req = (100 * t.dec.vc.ask) / val;
      const offered = clamp(
        t.dec.vc.sharesOffered && t.dec.vc.sharesOffered > 0
          ? (100 * t.dec.vc.sharesOffered) / Math.max(1, (t.shares || 100) + t.dec.vc.sharesOffered)
          : t.dec.vc.equity,
        0,
        60
      );
      const funded = offered >= req ? t.dec.vc.ask : Math.round((t.dec.vc.ask * offered) / Math.max(req, 0.01));
      if (funded > 0) {
        t.cash += funded;
        t.vcRaised += funded;
        t.paidIn += funded;
        t.equityVC += offered;
      }
      vcDeal = { ask: t.dec.vc.ask, offered, valuation: val, required: req, funded };
    }

    // Process Equity & Share Capital Decisions (Issuance, Buybacks, Dividends)
    const currentPriceBefore = stockPriceOf(t);
    let shareIssueAmt = 0;
    let newSharesIssued = 0;
    if (t.dec.shareIssue && t.dec.shareIssue > 0) {
      const maxIssue = maxShareIssueLimit(t);
      shareIssueAmt = Math.min(t.dec.shareIssue, maxIssue);
      newSharesIssued = shareIssueAmt / Math.max(0.5, currentPriceBefore);
      t.shares = (t.shares || 100) + newSharesIssued;
      t.paidIn += shareIssueAmt;
      t.cash += shareIssueAmt;
      (t as any)._shareIssueAmt = shareIssueAmt;
    }

    let shareBuybackAmt = 0;
    let sharesRepurchased = 0;
    if (t.dec.shareBuyback && t.dec.shareBuyback > 0 && t.cash > 0) {
      const maxBuyback = maxShareBuybackLimit(t);
      shareBuybackAmt = Math.min(t.dec.shareBuyback, Math.min(maxBuyback, t.cash * 0.7));
      if (shareBuybackAmt > 0) {
        sharesRepurchased = shareBuybackAmt / Math.max(0.5, currentPriceBefore);
        t.shares = Math.max(25, (t.shares || 100) - sharesRepurchased);
        t.paidIn = Math.max(100, t.paidIn - shareBuybackAmt);
        t.cash -= shareBuybackAmt;
        (t as any)._shareBuybackAmt = shareBuybackAmt;
      }
    }

    let dividendsPaid = 0;
    if (t.dec.dividendPerShare && t.dec.dividendPerShare > 0) {
      const totalDivReq = t.dec.dividendPerShare * (t.shares || 100);
      if (t.cash >= totalDivReq) {
        dividendsPaid = totalDivReq;
        t.cash -= dividendsPaid;
        t.cumDividends = (t.cumDividends || 0) + dividendsPaid;
        (t as any)._dividendsPaid = dividendsPaid;
      }
    }

    let sharkNew = 0,
      dilution = 0;
    if (t.cash < 0) {
      sharkNew = -t.cash;
      t.debt.shark += sharkNew;
      t.cash = 0;
      dilution = Math.min(5, (sharkNew / 100) * 0.5);
      t.equityEm = Math.min(30, t.equityEm + dilution);
    }

    const newlyBankrupt = !t.bankrupt && equityOf(t) < 0;
    if (newlyBankrupt) t.bankrupt = true;

    // Corporate Metrics & Dynamic Stock Price
    const currentShares = t.shares || 100;
    const eps = profit / currentShares; // Rs. per share
    const netEquity = equityOf(t);
    const roe = netEquity > 0 ? (profit / netEquity) * 100 : 0;
    const newFirmValuation = valuationOf(t);
    const baseStockPrice = newFirmValuation / currentShares;
    const divBoost = dividendsPaid > 0 ? 0.06 : 0;
    const epsBoost = eps > 0 ? Math.min(0.25, (eps / 12) * 0.1) : -0.12;
    const repBoost = (t.rep - 0.5) * 0.15;
    const nextStockPrice = Math.max(
      0.5,
      Math.round(baseStockPrice * (1 + divBoost + epsBoost + repBoost) * 100) / 100
    );
    t.stockPrice = nextStockPrice;
    const marketCap = Math.round(currentShares * nextStockPrice * 10) / 10;

    // 3-Way Financial Statement Breakdown: Cash Flow & Balance Sheet
    // dev, rndSpend and centreOpen are already expensed inside `profit` (per the
    // ASCM rule that growth spending hits the current quarter's P&L), so only
    // capex belongs in the investing bucket. Counting them again here used to
    // double-subtract those amounts from the reported cash flow, making the
    // operating+investing+financing total not match the team's actual cash change.
    const operatingCash = profit + dep - deltaInv;
    const investingCash = -capex;
    const financingCash =
      dBank +
      ((t as any)._ltIssued || 0) -
      ((t as any)._ltRepaid || 0) +
      shareIssueAmt -
      shareBuybackAmt -
      dividendsPaid +
      (vcDeal ? vcDeal.funded : 0);

    const cashFlow = {
      operating: Math.round(operatingCash * 10) / 10,
      investing: Math.round(investingCash * 10) / 10,
      financing: Math.round(financingCash * 10) / 10,
      net: Math.round((operatingCash + investingCash + financingCash) * 10) / 10
    };

    const balanceSheet = {
      cash: Math.round(t.cash * 10) / 10,
      inventory: Math.round(invValue * 10) / 10,
      ppe: Math.round(t.ppe * 10) / 10,
      totalAssets: Math.round((t.cash + invValue + t.ppe) * 10) / 10,
      shortTermDebt: Math.round(t.debt.bank * 10) / 10,
      longTermDebt: Math.round(t.debt.lt * 10) / 10,
      sharkDebt: Math.round(t.debt.shark * 10) / 10,
      totalLiabilities: Math.round(debtOf(t) * 10) / 10,
      paidInCapital: Math.round(t.paidIn * 10) / 10,
      retainedEarnings: Math.round(t.cumProfit * 10) / 10,
      totalEquity: Math.round(equityOf(t) * 10) / 10
    };

    const wUnits = Math.max(1, units);
    let sat = 0;
    for (const o of tOffers) {
      const u = SEGMENTS.reduce((x, s) => x + o.sales[s.id], 0);
      const sSat = clamp(
        0.45 +
          0.03 * o.scores.econ +
          0.015 * o.scores.safety +
          (o.m.add.extwarranty ? 0.05 : 0) -
          (o.m.cfg.build === "BD3" ? 0.06 : 0),
        0,
        1
      );
      sat += sSat * (u / wUnits);
    }
    if (units === 0) sat = t.rep;
    sat = clamp(sat + 0.06 * ((t as any)._reach - 0.7) + 0.08 * (reliab - 0.5), 0, 1);

    let overP = 0;
    for (const k of t.dec.claims || []) {
      const best = Math.max(...tOffers.map((o) => o.scores[k] || 0), 0);
      if (best < 6) overP += 0.04;
    }
    sat = clamp(sat - Math.min(0.08, overP), 0, 1);

    const stockout = lost > units * 0.05 && lost > 10;
    if (stockout) t.rep = clamp(t.rep - 0.03, 0, 1);
    t.rep = clamp(t.rep + 0.3 * (sat - t.rep), 0.1, 0.95);

    const totUnitsMkt = offers.reduce(
      (x, o) => x + SEGMENTS.reduce((y, s) => y + o.sales[s.id], 0),
      0
    );
    const share = totUnitsMkt > 0 ? units / totUnitsMkt : 0;

    const segShareOf = (sid: string) => {
      const segTot = offers.reduce((x, o) => x + o.sales[sid], 0);
      const mine = tOffers.reduce((x, o) => x + o.sales[sid], 0);
      return segTot > 0 ? mine / segTot : 0;
    };
    const sharePrim = segShareOf(t.prim),
      shareSec = segShareOf(t.sec);

    const judg: Record<string, any> = {};
    let brandJ = 0,
      campJ = 0;
    for (const s of SEGMENTS) {
      let bq = -1,
        bo: any = null;
      for (const o of tOffers) {
        const qq = qualityFit(o.scores, s);
        if (qq > bq) {
          bq = qq;
          bo = o;
        }
      }
      judg[s.id] = bo
        ? {
            p: Math.round(100 * bq),
            pr: Math.round(100 * priceFit(bo.m.price, s)),
            c:
              t.dec.claims && t.dec.claims.length
                ? Math.round(100 * Math.min(1, (t as any)._fit[s.id] / 0.4))
                : 45
          }
        : { p: 0, pr: 0, c: 0 };
    }
    brandJ = (judg[t.prim].p + judg[t.sec].p) / 2;
    campJ = (judg[t.prim].c + judg[t.sec].c) / 2;

    const util = t.capacity > 0 ? (t as any)._produced / t.capacity : 0;

    const res: QuarterResult = {
      q,
      units: Math.round(units),
      revenue,
      cogs,
      grossProfit,
      ad,
      fixed,
      ga,
      warranty,
      dev,
      research,
      salesPayroll,
      plantPayroll,
      netOpex,
      centreOpen,
      quality,
      rndSpend,
      licPaid,
      licRecd,
      holding,
      dep,
      intBank,
      intLT,
      intShark,
      interest,
      capex,
      ebitda,
      profit,
      deltaInv,
      cash: t.cash,
      rep: t.rep,
      share,
      sharePrim,
      shareSec,
      demandTot,
      lost: Math.round(lost),
      stockout,
      modelRows,
      awSnap: { ...t.aw },
      judg,
      brandJ,
      campJ,
      chLoss: (t as any)._chLoss,
      overP: overP > 0,
      vcDeal,
      dilution,
      sharkNew,
      produced: (t as any)._produced,
      endInv,
      invValue,
      util,
      reliab,
      reach: (t as any)._reach,
      hrM: (t as any)._hrM,
      equity: { f: Math.max(0, 100 - t.equityVC - t.equityEm), vc: t.equityVC, em: t.equityEm },
      debt: { ...t.debt },
      ppe: t.ppe,
      bankrupt: t.bankrupt,
      capAdd: (t as any)._capAdd || 0,
      ltIssued: (t as any)._ltIssued || 0,
      ltRepaid: (t as any)._ltRepaid || 0,
      shares: Math.round(currentShares * 10) / 10,
      stockPrice: nextStockPrice,
      marketCap,
      eps: Math.round(eps * 100) / 100,
      roe: Math.round(roe * 10) / 10,
      dividendsPaid,
      shareIssueAmt,
      shareBuybackAmt,
      cashFlow,
      balanceSheet,
      bsc: { parts: {}, total: 0 }
    };
    res.bsc = computeBSC(t, res, st);
    if (sharkNew > 0) {
      res.bsc.parts.emergencyLoan = -Math.min(0.25, sharkNew / Math.max(1, t.paidIn));
      res.bsc.total = Math.max(0, res.bsc.total + res.bsc.parts.emergencyLoan);
    }
    t.hist.push(res);

    if ((t as any)._capAdd) {
      t.capacity += (t as any)._capAdd;
    }
    (t as any)._capAdd = 0;
    (t as any)._ltIssued = 0;
    (t as any)._ltRepaid = 0;
    (t as any)._shareIssueAmt = 0;
    (t as any)._shareBuybackAmt = 0;
    (t as any)._dividendsPaid = 0;
    t.dec.devCost = 0;
    t.dec.rndStartCost = 0;
    t.dec.newCentres = 0;
    t.dec.newCentreCities = [];
    t.dec.hire = 0;
    t.dec.expBlocks = 0;
    t.dec.ltIssue = 0;
    t.dec.shareIssue = 0;
    t.dec.shareBuyback = 0;
    t.dec.dividendPerShare = 0;
    t.dec.cdInvestment = 0;
    t.dec.locked = false;
    t.models.forEach((m) => (m.lastHash = bomHash(m)));
  }

  for (const c of st.contracts) if (c.status === "offered") c.status = "expired";

  for (const t of st.teams) {
    const r = t.hist[t.hist.length - 1];
    if (t.dec.buyIntel) {
      r.intel = st.teams
        .filter((x) => x !== t)
        .map((x) => ({
          name: x.name,
          color: x.color,
          adBudget: Math.round(x.dec.ad / 25) * 25,
          awAvg: (
            SEGMENTS.reduce((a, s) => a + x.aw[s.id], 0) / 5
          ).toFixed(2),
          centres: x.centres,
          staff: x.staff,
          techs: x.techs.map((id) => techById(id)!.name),
          models: x.models.map((m) => ({
            name: m.name,
            estCost:
              Math.round(
                (unitCost(m) * (0.95 + Math.random() * 0.1)) / 500
              ) * 500
          }))
        }));
    }
    if (t.dec.buyClinic) {
      r.clinic = [];
      for (const x of st.teams) {
        for (const m of x.models) {
          const sc = scoreModel(m, x);
          const row: any = { team: x.name, color: x.color, model: m.name, cells: {} };
          for (const s of SEGMENTS)
            row.cells[s.id] =
              Math.round(100 * qualityFit(sc, s)) +
              "/" +
              Math.round(100 * priceFit(m.price, s));
          r.clinic.push(row);
        }
      }
    }
    t.dec.buyIntel = false;
    t.dec.buyClinic = false;
    t.dec.vc = null;
    t.dec.claims = t.dec.claims || [];
  }

  const news: string[] = [];
  news.push(`${season.label}. Category demand this quarter: ${Math.round(tam).toLocaleString("en-IN")} units.`);
  const ranked = [...st.teams].sort((a, b) => b.hist[b.hist.length - 1].units - a.hist[a.hist.length - 1].units);
  news.push(`<b>${ranked[0].name}</b> leads the quarter with ${ranked[0].hist[ranked[0].hist.length - 1].units.toLocaleString("en-IN")} units sold.`);

  st.teams.forEach((t) => {
    const r = t.hist[t.hist.length - 1];
    if (r.shareIssueAmt && r.shareIssueAmt > 0) {
      news.push(
        `<b>${t.name}</b> completed a public share issuance: raised Rs. ${r.shareIssueAmt.toLocaleString(
          "en-IN"
        )} L in new equity capital (Stock price: Rs. ${r.stockPrice?.toFixed(2)}).`
      );
    }
    if (r.shareBuybackAmt && r.shareBuybackAmt > 0) {
      news.push(
        `<b>${t.name}</b> repurchased Rs. ${r.shareBuybackAmt.toLocaleString(
          "en-IN"
        )} L of treasury shares, enhancing shareholder value and EPS.`
      );
    }
    if (r.dividendsPaid && r.dividendsPaid > 0) {
      news.push(
        `<b>${t.name}</b> rewarded shareholders with Rs. ${r.dividendsPaid.toLocaleString(
          "en-IN"
        )} L in cash dividend payouts.`
      );
    }
    if (r.vcDeal && r.vcDeal.funded > 0)
      news.push(
        `<b>${t.name}</b> closed a VC round: Rs. ${r.vcDeal.funded.toLocaleString(
          "en-IN"
        )} L for ${r.vcDeal.offered.toFixed(1)}% equity.`
      );
    if (r.vcDeal && r.vcDeal.funded === 0)
      news.push(`<b>${t.name}</b> walked away from the VC table unfunded.`);
    if (r.stockout)
      news.push(
        `<b>${t.name}</b> ran out of stock: ${r.lost.toLocaleString(
          "en-IN"
        )} orders unserved. Reputation hit.`
      );
    if (r.chLoss > 50)
      news.push(
        `<b>${t.name}</b> lost ${r.chLoss.toLocaleString(
          "en-IN"
        )} units of output to changeovers and shop-floor productivity.`
      );
    if (r.profit < -150)
      news.push(
        `<b>${t.name}</b> posted a heavy loss of Rs. ${Math.abs(
          r.profit
        ).toFixed(0)} L. Cash runway shortening.`
      );
    if (r.sharkNew > 0)
      news.push(
        `<b>${t.name}</b> needed an emergency loan of Rs. ${r.sharkNew.toFixed(
          0
        )} L from loan shark.`
      );
    if (r.capAdd > 0)
      news.push(
        `<b>${t.name}</b> broke ground on new lines: +${r.capAdd.toLocaleString(
          "en-IN"
        )} units/quarter capacity.`
      );
    if (r.bankrupt && !(t as any)._bkAnnounced) {
      news.push(
        `<b>${t.name}</b> is technically bankrupt: cumulative losses wiped out shareholder equity.`
      );
      (t as any)._bkAnnounced = true;
    }
  });

  for (const c of st.contracts)
    if (c.qExecuted === q) {
      news.push(
        `<b>Technology transfer:</b> ${st.teams[c.sellerI].name} licensed <b>${
          techById(c.techId)!.name
        }</b> to ${st.teams[c.buyerI].name} for Rs. ${c.fee.toLocaleString(
          "en-IN"
        )} L.`
      );
    }

  const segShare: Record<string, number[]> = {};
  for (const s of SEGMENTS) {
    segShare[s.id] = st.teams.map((t) =>
      offers
        .filter((o) => o.t === t)
        .reduce((x, o) => x + o.sales[s.id], 0)
    );
  }

  st.reports.push({
    q,
    season: season.label,
    tam: Math.round(tam),
    news,
    segShare,
    priceTable: offers.map((o) => ({
      team: o.t.name,
      color: o.t.color,
      model: o.m.name,
      price: o.m.price,
      units: Math.round(SEGMENTS.reduce((x, s) => x + o.sales[s.id], 0))
    }))
  });

  st.quarter++;
  st.phase = st.quarter > st.cfg.quarters ? "gameover" : "results";
}

export function botDecide(t: TeamState, st: GameState) {
  const m = t.models[0];
  const last = t.hist[t.hist.length - 1];
  if (last) {
    if (last.stockout) m.price = Math.round((m.price * 1.03) / 500) * 500;
    else if (last.units < 800)
      m.price = Math.max(
        Math.round((unitCost(m) * 1.05) / 500) * 500,
        Math.round((m.price * 0.975) / 500) * 500
      );
  }

  const BOT_CLAIMS: Record<string, string[]> = {
    premium: ["tech", "perf"],
    commuter: ["range", "comfort"],
    budget: ["perf", "build"],
    fleeteco: ["econ", "charge"]
  };
  const BOT_TECH: Record<string, string> = {
    premium: "T1",
    commuter: "T5",
    budget: "T6",
    fleeteco: "T4"
  };

  t.dec.ad = 200;
  t.dec.alloc = { ...ARCHETYPES[t.arch || "commuter"].alloc };
  t.dec.claims = [...(BOT_CLAIMS[t.arch || "commuter"] || ["range", "econ"])];
  t.dec.buyIntel = false;
  t.dec.buyClinic = false;

  const stock = t.models.reduce((x, mm) => x + (mm.inv || 0), 0);
  const target = last ? Math.round(last.units * 1.15) : 900;
  t.dec.prod = {
    [m.id]: clamp(Math.round((target - stock * 0.8) / 50) * 50, 300, t.capacity)
  };
  t.dec.quality = 20;
  t.hr = { sales: 105, plant: 105 };

  t.dec.newCentres = 0;
  t.dec.newCentreCities = [];
  t.dec.hire = 0;
  if (t.cash > 900 && st.quarter % 3 === 0 && t.centres < MARKETS.length) {
    const owned = t.storeCities || [];
    const pick = [...MARKETS].filter((m) => !owned.includes(m.id)).sort((a, b) => a.entryCost - b.entryCost)[0];
    if (pick && pick.entryCost <= Math.max(0, t.cash - 300)) {
      t.dec.newCentres = 1;
      t.dec.newCentreCities = [pick.id];
      t.dec.hire = 5;
    }
  }

  t.dec.rndStartCost = 0;
  const wantTech = BOT_TECH[t.arch || "commuter"];
  if (
    st.quarter > st.cfg.vcQuarter &&
    t.cash > 600 &&
    !t.techs.includes(wantTech) &&
    !t.rnd.some((p) => p.id === wantTech) &&
    t.rnd.length < 2
  ) {
    const tc = techById(wantTech);
    if (tc) {
      t.rnd.push({ id: wantTech, mode: "std", qStart: st.quarter, qDone: st.quarter + 2, cost: tc.std });
      t.dec.rndStartCost = tc.std;
    }
  }

  for (const c of st.contracts) {
    if (c.status === "offered" && c.buyerI === t.i) {
      const tc = techById(c.techId);
      if (tc && !t.techs.includes(c.techId) && c.fee <= tc.std * 0.5 && t.cash > c.fee + 200)
        c.status = "accepted";
      else c.status = "rejected";
    }
  }

  t.dec.bankTarget = t.debt.bank;
  t.dec.expBlocks = 0;
  t.dec.ltIssue = 0;
  if (st.quarter === st.cfg.vcQuarter) {
    const val = valuationOf(t);
    const ask = 1000;
    t.dec.vc = { ask, equity: Math.min(60, Math.ceil(((100 * ask) / val) * 10) / 10 + 1), sharesOffered: 0, sharePrice: stockPriceOf(t) };
  } else t.dec.vc = null;

  t.dec.devCost = 0;
  t.dec.locked = true;
  t.charterDone = true;
  if (!t.vision) {
    t.vision = "Affordable, dependable electric mobility for every Indian street.";
    t.mission = "We design, build and service EV scooters that our target riders trust.";
  }
}

export function marketIntelOf(st: GameState) {
  return st.teams.map((t) => {
    const r = t.hist.length ? t.hist[t.hist.length - 1] : null;
    return {
      i: t.i,
      name: t.name,
      color: t.color,
      isBot: t.isBot,
      vision: t.vision,
      mission: t.mission,
      prim: t.prim,
      sec: t.sec,
      ad: t.dec.ad,
      claims: t.dec.claims || [],
      alloc: t.dec.alloc,
      centres: t.centres,
      staff: t.staff,
      hr: t.hr,
      techs: t.techs,
      rep: Math.round(t.rep * 100) / 100,
      models: t.models.map((m) => ({
        name: m.name,
        cfg: m.cfg,
        add: m.add,
        price: m.price
      })),
      units: r ? r.units : 0,
      share: r ? r.share : 0
    };
  });
}

export function leaderboardOf(st: GameState) {
  if (!st.teams[0] || !st.teams[0].hist.length) return [];
  return st.teams
    .map((t) => {
      const r = t.hist[t.hist.length - 1];
      return {
        i: t.i,
        name: t.name,
        color: t.color,
        isBot: t.isBot,
        bankrupt: t.bankrupt,
        bscCum: cumBSC(t),
        bscQ: r ? r.bsc.total : 0,
        share: r ? r.share : 0,
        rep: t.rep,
        cumProfit: t.cumProfit,
        cash: t.cash,
        units: t.hist.map((h) => h.units)
      };
    })
    .sort((a, b) => b.bscCum - a.bscCum);
}

export function newState(
  teamDefs: { name: string; arch: string; isBot: boolean }[],
  quarters = 12,
  tam0 = 20000,
  vcQuarter = 5
): GameState {
  const state: GameState = {
    phase: "decisions",
    quarter: 1,
    cfg: { quarters, tam0, startCash: 2800, growth: 0.05, vcQuarter },
    contracts: [],
    contractSeq: 1,
    teams: teamDefs.map((td, i) => {
      const archKey = ARCHETYPES[td.arch] ? td.arch : "commuter";
      const arch = ARCHETYPES[archKey];
      const m = mkModel(arch.name, arch.cfg, arch.add, arch.price);
      m.launchedQ = 1;
      const aw: Record<string, number> = {};
      const base: Record<string, number> = {};
      SEGMENTS.forEach((s) => {
        aw[s.id] = 0.05;
        base[s.id] = 0;
      });
      return {
        i,
        name: td.name,
        color: TEAM_COLORS[i % TEAM_COLORS.length],
        isBot: td.isBot,
        arch: archKey,
        vision: "",
        mission: "",
        goals: "",
        prim: arch.prim,
        sec: arch.sec,
        charterDone: false,
        cash: 2200,
        paidIn: 2800,
        rep: 0.5,
        cumProfit: 0,
        aw,
        base,
        models: [m],
        capacity: 2500,
        ppe: 600,
        hr: { sales: 100, plant: 100 },
        centres: DEFAULT_MARKET_IDS.length,
        storeCities: [...DEFAULT_MARKET_IDS],
        staff: 20,
        qualityCum: 0,
        techs: [],
        rnd: [],
        debt: { bank: 0, lt: 0, ltLeft: 0, shark: 0 },
        cumFuture: 0,
        cumRevenue: 0,
        equityVC: 0,
        equityEm: 0,
        vcRaised: 0,
        bankrupt: false,
        shares: 100, // 100 Lakh shares (10,000,000 shares)
        stockPrice: 8.0, // Rs. 8.00 / share at inception
        cumDividends: 0,
        dec: {
          ad: 180,
          alloc: { ...arch.alloc },
          // 900, not a full-capacity run: Quarter 1 sells nothing (tam=0 until Q2),
          // so every unit produced here is cash tied up in inventory with no revenue
          // offset. A launch-scale batch, not a max-capacity one, keeps the default
          // plan solvent across all archetypes (materials cost varies ~2x by archetype).
          prod: { [m.id]: 900 },
          locked: false,
          claims: [],
          buyIntel: false,
          buyClinic: false,
          vc: null,
          quality: 0,
          expBlocks: 0,
          newCentres: 0,
          newCentreCities: [],
          hire: 0,
          bankTarget: 0,
          ltIssue: 0,
          shareIssue: 0,
          shareBuyback: 0,
          dividendPerShare: 0,
          cdInvestment: 0,
          interestRate: 0.03,
          devCost: 0
        },
        hist: []
      };
    }),
    reports: []
  };

  state.teams.forEach((t) => {
    if (t.isBot) botDecide(t, state);
  });

  return state;
}
