export type PowertrainId = "PT1" | "PT2" | "PT3" | "PT4";
export type RidingModeId = "RM1" | "RM2" | "RM3" | "RM4";
export type BatteryId = "BC1" | "BC2" | "BC3" | "BC4" | "BC5";
export type TechId = "CT1" | "CT2" | "CT3" | "CT4";
export type BuildId = "BD1" | "BD2" | "BD3";
export type WheelId = "ALLOY" | "SPOKE";
export type BrakeId = "BR1" | "BR2" | "BR3";
export type SeatId = "WIDE" | "STD";
export type SuspId = "SUS1" | "SUS2" | "SUS3";

export interface ModelConfig {
  powertrain: PowertrainId;
  modes: RidingModeId;
  battery: BatteryId;
  tech: TechId;
  build: BuildId;
  wheels: WheelId;
  brakes: BrakeId;
  seat: SeatId;
  susp: SuspId;
}

export type AddonId =
  | "removable"
  | "regen"
  | "boot"
  | "backrest"
  | "colors"
  | "tpms"
  | "sidestand"
  | "hillhold"
  | "reverse"
  | "theft"
  | "extwarranty";

export interface CatalogOpt {
  id: string;
  name: string;
  cost: number;
  req?: (m: ScooterModel) => boolean;
}

export interface CatalogCategory {
  label: string;
  opts: CatalogOpt[];
}

export interface AddonOpt {
  id: AddonId;
  name: string;
  cost: number;
  req?: (m: ScooterModel) => boolean;
}

export interface TechProject {
  id: string;
  name: string;
  fx: Partial<Record<string, number>>;
  fast: number; // cost in Rs. L
  std: number;  // cost in Rs. L
  note: string;
}

export interface SegmentDef {
  id: string;
  name: string;
  pct: number;
  wtp: [number, number]; // [low, high] in Rs.
  theta: number; // price sensitivity exponent
  kappa: number; // word-of-mouth multiplier
  w: Record<string, number>; // benefit weightings (0-100)
}

export interface ScooterModel {
  id: string;
  name: string;
  cfg: ModelConfig;
  add: Record<AddonId, boolean>;
  equippedTechs?: string[];
  price: number; // Rs.
  launchedQ: number | null;
  lastHash?: string | null;
  inv: number; // unsold units
  isNew?: boolean;
}

export interface TeamMember {
  userId: string;
  name: string;
  email: string;
  roleTitle?: string;
}

export interface RndProgress {
  id: string;
  mode: "fast" | "std";
  qStart: number;
  qDone: number;
  cost: number;
}

export interface LicenceContract {
  id: number;
  sellerI: number;
  buyerI: number;
  techId: string;
  fee: number; // Rs. L
  status: "offered" | "accepted" | "rejected" | "executed" | "expired";
  qOffered: number;
  qExecuted?: number;
}

export interface TeamDecision {
  ad: number; // Rs. L
  claims: string[];
  alloc: Record<string, number>; // segment -> % (sums to 100)
  prod: Record<string, number>;  // modelId -> units
  quality: number; // Rs. L
  expBlocks: number; // blocks of 500 units
  newCentres: number; // count
  webStore?: boolean; // D2C e-commerce storefront active
  hire: number; // +/- headcount
  bankTarget: number; // Rs. L
  ltIssue: number; // Rs. L
  shareIssue?: number; // Rs. L of equity raised via issuing new shares
  shareBuyback?: number; // Rs. L of equity used to repurchase shares from market
  dividendPerShare?: number; // Rs. per share dividend declared
  bankLoanDrawn?: number;
  bankLoanRepaid?: number;
  cdInvestment?: number;
  interestRate?: number;
  buyIntel: boolean;
  market_research_budget?: number;
  buyClinic: boolean;
  vc: { ask: number; equity: number; sharesOffered?: number; sharePrice?: number } | null;
  rndStarts?: { id: string; mode: "fast" | "std" }[];
  rndStartCost?: number;
  devCost?: number;
  facilityLocation?: string;
  facilityLocked?: boolean;
  changeoverInvestment?: number;
  locked: boolean;
  lockedBy?: string;
}

export interface QualityComponentState {
  qcId: string;
  componentCategory: string;
  inspectionActive: boolean;
  varianceStudyDone: boolean;
  sourceActionStudyDone: boolean;
  improvementInvested: number;
  warrantyCostPerQuarter: number;
  defectCostPerQuarter: number;
  inspectionCost: number;
  reliabilityImprovement: number;
  improvementQuarter?: number;
}

export interface QuarterCashFlow {
  operating: number; // Cash from core operations
  investing: number; // Capex, showroom expansion, R&D projects
  financing: number; // Debt changes, share issues, buybacks, dividends
  net: number; // Net change in cash
}

export interface QuarterBalanceSheet {
  cash: number;
  inventory: number;
  ppe: number;
  totalAssets: number;
  shortTermDebt: number;
  longTermDebt: number;
  sharkDebt: number;
  totalLiabilities: number;
  paidInCapital: number;
  retainedEarnings: number;
  totalEquity: number;
}

export interface QuarterResult {
  q: number;
  units: number;
  revenue: number; // Rs. L
  cogs: number;
  grossProfit: number;
  ad: number;
  fixed: number;
  ga: number;
  warranty: number;
  dev: number;
  research: number;
  salesPayroll: number;
  plantPayroll: number;
  netOpex: number;
  centreOpen: number;
  quality: number;
  rndSpend: number;
  licPaid: number;
  licRecd: number;
  holding: number;
  dep: number;
  intBank: number;
  intLT: number;
  intShark: number;
  interest: number;
  capex: number;
  ebitda: number;
  profit: number;
  deltaInv: number;
  cash: number;
  rep: number;
  share: number;
  sharePrim: number;
  shareSec: number;
  demandTot: number;
  lost: number;
  stockout: boolean;
  modelRows: {
    name: string;
    price: number;
    units: number;
    segSales: Record<string, number>;
    cost: number;
  }[];
  awSnap: Record<string, number>;
  judg: Record<string, { p: number; pr: number; c: number }>;
  brandJ: number;
  campJ: number;
  chLoss: number;
  overP: boolean;
  vcDeal: { ask: number; offered: number; valuation: number; required: number; funded: number } | null;
  dilution: number;
  sharkNew: number;
  produced: number;
  endInv: number;
  invValue: number;
  util: number;
  reliab: number;
  reach: number;
  hrM: { sales: number; plant: number };
  equity: { f: number; vc: number; em: number };
  debt: { bank: number; lt: number; ltLeft: number; shark: number };
  ppe: number;
  bankrupt: boolean;
  capAdd: number;
  ltIssued: number;
  ltRepaid: number;
  // Equity, Shares & Corporate Valuation Metrics
  shares?: number; // Outstanding shares in Lakhs (e.g. 100 L = 10,000,000 shares)
  stockPrice?: number; // Rs. per share
  marketCap?: number; // Rs. L (Stock Price * Shares)
  eps?: number; // Earnings Per Share (Rs.)
  roe?: number; // Return on Equity (%)
  dividendsPaid?: number; // Rs. L total dividends distributed
  shareIssueAmt?: number; // Rs. L raised from new shares
  shareBuybackAmt?: number; // Rs. L spent on share buybacks
  cashFlow?: QuarterCashFlow;
  balanceSheet?: QuarterBalanceSheet;
  bsc: {
    parts: Record<string, number>;
    total: number;
  };
  intel?: any[];
  clinic?: any[];
}

export interface TeamState {
  i: number;
  name: string;
  color: string;
  isBot: boolean;
  arch: string;
  vision: string;
  mission: string;
  goals: string;
  prim: string;
  sec: string;
  charterDone: boolean;
  cash: number; // Rs. L
  paidIn: number; // Rs. L
  rep: number; // 0.10 - 0.95
  cumProfit: number;
  aw: Record<string, number>; // segment awareness
  base: Record<string, number>; // cumulative unit sales per segment
  models: ScooterModel[];
  capacity: number; // units / quarter
  ppe: number; // net property plant equipment Rs. L
  hr: { sales: number; plant: number }; // % of benchmark (80 - 130)
  hrCompensation?: {
    sales?: { salary: number; benefits: number; vacation: number; bonus: number };
    production?: { salary: number; benefits: number; vacation: number; bonus: number; safetyBonus: number };
  };
  centres: number; // count
  staff: number; // headcount
  qualityCum: number;
  techs: string[];
  rnd: RndProgress[];
  debt: { bank: number; lt: number; ltLeft: number; shark: number };
  cumFuture: number;
  cumRevenue: number;
  equityVC: number;
  equityEm: number;
  vcRaised: number;
  bankrupt: boolean;
  // Corporate Shares & Valuation
  shares?: number; // in Lakhs, default 100
  stockPrice?: number; // in Rs. per share, default 8.00
  cumDividends?: number; // Rs. L total dividends paid
  roles?: Record<string, string>; // e.g. { CEO: "John Doe", CFO: "Jane Smith" }
  dec: TeamDecision;
  hist: QuarterResult[];
  qualityComponents?: QualityComponentState[];
  draft?: any;
}

export interface GameConfig {
  quarters: number;
  tam0: number; // initial quarterly market size
  startCash: number;
  growth: number; // quarterly organic growth rate e.g. 0.05
  vcQuarter: number; // quarter when VC opens
}

export interface QuarterReport {
  q: number;
  season: string;
  tam: number;
  news: string[];
  segShare: Record<string, number[]>;
  priceTable: { team: string; color: string; model: string; price: number; units: number }[];
}

export interface GameState {
  phase: "decisions" | "results" | "gameover";
  quarter: number;
  cfg: GameConfig;
  contracts: LicenceContract[];
  contractSeq: number;
  teams: TeamState[];
  reports: QuarterReport[];
}

export interface ManualSection {
  id: string;
  title: string;
  content: string;
}

export interface ManualChapter {
  id: string;
  title: string;
  icon?: string;
  sections: ManualSection[];
}
