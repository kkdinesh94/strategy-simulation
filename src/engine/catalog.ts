import { CatalogCategory, AddonOpt, TechProject, SegmentDef, ScooterModel } from "../types/simulation";

export const CATALOG: Record<string, CatalogCategory> = {
  powertrain: {
    label: "Powertrain",
    opts: [
      { id: "PT1", name: "PT1 · 7.0 kW (0-40 in 3.3s)", cost: 19000 },
      { id: "PT2", name: "PT2 · 5.5 kW (0-30 in 3.3s)", cost: 14500 },
      { id: "PT3", name: "PT3 · 4.2 kW (0-25)", cost: 11000 },
      { id: "PT4", name: "PT4 · 3.0 kW hub (0-20)", cost: 8000 }
    ]
  },
  modes: {
    label: "Riding Modes",
    opts: [
      { id: "RM1", name: "Eco only (incl.)", cost: 0 },
      { id: "RM2", name: "+ Ride (needs PT3+)", cost: 1500, req: (m: ScooterModel) => ["PT1", "PT2", "PT3"].includes(m.cfg.powertrain) },
      { id: "RM3", name: "+ Sport (needs PT2+)", cost: 3200, req: (m: ScooterModel) => ["PT1", "PT2"].includes(m.cfg.powertrain) },
      { id: "RM4", name: "+ Warp (needs PT1)", cost: 5500, req: (m: ScooterModel) => m.cfg.powertrain === "PT1" }
    ]
  },
  battery: {
    label: "Battery / Charging",
    opts: [
      { id: "BC1", name: "BC1 · 100 km · 0-80% 60min", cost: 40000 },
      { id: "BC2", name: "BC2 · 80 km · 0-65% 60min", cost: 34500 },
      { id: "BC3", name: "BC3 · 75 km · 0-50% 60min", cost: 30500 },
      { id: "BC4", name: "BC4 · 65 km LFP · 0-40%", cost: 25500 },
      { id: "BC5", name: "BC5 · 50 km LFP · 0-35%", cost: 19000 }
    ]
  },
  tech: {
    label: "Connected Tech",
    opts: [
      { id: "CT1", name: "CT1 · LCD", cost: 1500 },
      { id: "CT2", name: "CT2 · TFT + Bluetooth", cost: 5000 },
      { id: "CT3", name: "CT3 · App + Navigation", cost: 8500 },
      { id: "CT4", name: "CT4 · Touchscreen 4G OTA", cost: 13000 }
    ]
  },
  build: {
    label: "Build / Body",
    opts: [
      { id: "BD1", name: "BD1 · Aluminium + Metal", cost: 10000 },
      { id: "BD2", name: "BD2 · Steel + ABS", cost: 6500 },
      { id: "BD3", name: "BD3 · Tubular + Poly", cost: 4000 }
    ]
  },
  wheels: {
    label: "Wheels",
    opts: [
      { id: "ALLOY", name: "Alloy", cost: 4200 },
      { id: "SPOKE", name: "Steel Spoke", cost: 2200 }
    ]
  },
  brakes: {
    label: "Brakes",
    opts: [
      { id: "BR1", name: "Dual Disc + CBS", cost: 5800 },
      { id: "BR2", name: "Front Disc + Drum", cost: 3600 },
      { id: "BR3", name: "Drum + Drum", cost: 2000 }
    ]
  },
  seat: {
    label: "Seat",
    opts: [
      { id: "WIDE", name: "Wide Dual-Density", cost: 2600 },
      { id: "STD", name: "Standard", cost: 1200 }
    ]
  },
  susp: {
    label: "Suspension",
    opts: [
      { id: "SUS1", name: "Telescopic + Adj. Mono", cost: 6500 },
      { id: "SUS2", name: "Telescopic + Twin Rear", cost: 4800 },
      { id: "SUS3", name: "Basic Spring", cost: 2800 }
    ]
  }
};

export const ADDONS: AddonOpt[] = [
  { id: "removable", name: "Removable Battery", cost: 3000, req: (m: ScooterModel) => ["BC3", "BC4", "BC5"].includes(m.cfg.battery) },
  { id: "regen", name: "Regen Braking", cost: 2500, req: (m: ScooterModel) => ["PT1", "PT2"].includes(m.cfg.powertrain) },
  { id: "boot", name: "34L Boot Storage", cost: 1800 },
  { id: "backrest", name: "Pillion Backrest", cost: 900 },
  { id: "colors", name: "Color Pack", cost: 800 },
  { id: "tpms", name: "TPMS (Tire Pressure)", cost: 1500, req: (m: ScooterModel) => ["CT2", "CT3", "CT4"].includes(m.cfg.tech) },
  { id: "sidestand", name: "Side Stand Cutoff", cost: 400 },
  { id: "hillhold", name: "Hill-Hold Assist", cost: 1200, req: (m: ScooterModel) => ["PT1", "PT2"].includes(m.cfg.powertrain) },
  { id: "reverse", name: "Reverse Assist", cost: 1000, req: (m: ScooterModel) => ["PT1", "PT2"].includes(m.cfg.powertrain) },
  { id: "theft", name: "Anti-Theft Alerts", cost: 800, req: (m: ScooterModel) => ["CT3", "CT4"].includes(m.cfg.tech) },
  { id: "extwarranty", name: "5-Yr Extended Warranty", cost: 2000 }
];

export const TECHS: TechProject[] = [
  { id: "T1", name: "HyperCharge Platform (0-80% in 18 min)", fx: { charge: 2 }, fast: 230, std: 160, note: "Transforms charging anxiety. Strongest with Urban Tech and Fleet." },
  { id: "T2", name: "Solid-State Range Pack (+30% real range)", fx: { range: 2 }, fast: 270, std: 190, note: "Range leadership. Commuters and Fleet value it most." },
  { id: "T3", name: "AI Battery Management Suite", fx: { econ: 1.5, range: 0.5 }, fast: 170, std: 120, note: "Cuts cost/km and degradation. Eco and Fleet friendly." },
  { id: "T4", name: "Swappable-Pack Standard", fx: { charge: 1.5, econ: 0.5 }, fast: 190, std: 135, note: "Charging time becomes a swap. Fleet duty cycles love it." },
  { id: "T5", name: "ADAS-Lite Safety Suite", fx: { safety: 2 }, fast: 210, std: 145, note: "Segment-first safety story. Commuter households respond." },
  { id: "T6", name: "Lightweight Composite Chassis", fx: { perf: 1, range: 1 }, fast: 200, std: 140, note: "Performance and efficiency together. Urban Tech and Young Adults." }
];

export const techById = (id: string) => TECHS.find(x => x.id === id);

export const SEGMENTS: SegmentDef[] = [
  { id: "S1", name: "Urban Tech", pct: 0.15, wtp: [125000, 190000], theta: 0.6, kappa: 0.6, w: { perf: 20, range: 12, charge: 13, tech: 25, build: 15, comfort: 6, safety: 6, econ: 3 } },
  { id: "S2", name: "Commuters", pct: 0.38, wtp: [90000, 130000], theta: 1.2, kappa: 0.9, w: { perf: 6, range: 22, charge: 12, tech: 5, build: 8, comfort: 18, safety: 12, econ: 17 } },
  { id: "S3", name: "Eco", pct: 0.14, wtp: [100000, 160000], theta: 0.9, kappa: 0.8, w: { perf: 6, range: 20, charge: 8, tech: 10, build: 18, comfort: 8, safety: 10, econ: 20 } },
  { id: "S4", name: "Young Adults", pct: 0.22, wtp: [60000, 90000], theta: 1.4, kappa: 1.3, w: { perf: 22, range: 10, charge: 8, tech: 18, build: 20, comfort: 6, safety: 6, econ: 10 } },
  { id: "S5", name: "Fleet", pct: 0.11, wtp: [70000, 100000], theta: 1.3, kappa: 0.7, w: { perf: 4, range: 20, charge: 16, tech: 10, build: 10, comfort: 8, safety: 12, econ: 20 } }
];

export const CLAIMS: Record<string, string> = {
  perf: "Performance & Top Speed",
  range: "Headline Range & Efficiency",
  charge: "Fast & Convenient Charging",
  tech: "Smart Tech & Connectivity",
  build: "Premium Build & Design",
  comfort: "Pillion & Long-Distance Comfort",
  safety: "Safety & Braking Control",
  econ: "Total Cost of Ownership / Economy"
};

export const CLAIMS_CATALOG = Object.entries(CLAIMS).map(([id, title]) => ({ id, title }));

export const SEG_NEEDS: Record<string, { who: string; needs: string[]; deal: string[]; price: string }> = {
  S1: {
    who: "Age 27-42, metro professionals, premium gadget buyers, 15-30 km/day, home charging available.",
    needs: [
      "Connected tech ecosystem: touchscreen, navigation, OTA updates, ride analytics",
      "Thrilling acceleration and a headline ride mode; they test ride before buying",
      "Premium metal build, alloy wheels, showroom-grade finish",
      "Fast charging valued over absolute range",
      "Brand experience: test rides, owner community, launch events"
    ],
    deal: ["No fast charging", "LCD-only dashboard", "Drum brakes"],
    price: "Low sensitivity inside the band. Repeated discounting cheapens the brand."
  },
  S2: {
    who: "Age 25-50, salaried families, 30-60 km/day six days a week, often two-up with luggage.",
    needs: [
      "Real-world range = daily distance plus a 40% buffer; 75-100 km removes anxiety",
      "Running economy: cost/km, reliability, service reach, warranty length",
      "Two-up comfort: wide seat, good suspension, boot storage",
      "Safety discussed at home: at least front disc with CBS",
      "Overnight or removable charging beats ultra-fast charging"
    ],
    deal: ["Range under ~65 km", "Thin service network", "No storage"],
    price: "High sensitivity. EMI schemes, exchange bonuses and festive offers move them."
  },
  S3: {
    who: "Age 24-45, educated urban buyers making a statement purchase, 20-40 km/day.",
    needs: [
      "Credible green story: LFP chemistry, durable materials, honest claims",
      "Efficiency and truthful range; claimed-vs-delivered gaps hurt most here",
      "Low cost per km validates the ecological choice",
      "Longevity: metal build, long warranty, repairability; they keep vehicles 7+ years",
      "Cause-led, transparent communication over celebrity ads"
    ],
    deal: ["Perceived greenwashing", "Disposable plastic-heavy build", "Short warranty"],
    price: "Moderate sensitivity. Pays a 10-15% green premium when credentials are credible."
  },
  S4: {
    who: "Age 18-26, students and first-jobbers, first vehicle, often parent-funded, 15-35 km/day.",
    needs: [
      "Price and EMI accessibility first; sub-Rs. 80k is the sweet spot",
      "Style, colors and quick city pickup; launch feel over top speed",
      "Some connectedness: Bluetooth dashboard, shareable ride stats",
      "Removable battery for hostel and rented-flat charging",
      "Campus presence, influencer buzz; strongest word-of-mouth multiplier"
    ],
    deal: ["Priced above budget", "Dated, utilitarian styling", "Zero connectivity"],
    price: "Very high sensitivity. Small price cuts visibly move share; discounts pull demand forward."
  },
  S5: {
    who: "Delivery fleets, corporate campuses, rentals. 80-120 km/day, multi-shift, hard duty cycle. Buys in bulk.",
    needs: [
      "Lowest total cost of ownership per km, computed precisely",
      "Duty-cycle durability and low defect rates",
      "Fast charging or swappable packs: charging time is lost utilization",
      "Telematics: GPS, geofencing, remote diagnostics",
      "Service SLAs and parts availability; dense networks win"
    ],
    deal: ["No telematics option", "Unproven reliability", "Slow charging with a fixed battery"],
    price: "High but negotiated: expects 8-15% bulk discounts. Professional, TCO-driven procurement."
  }
};

export const BASE_PLATFORM = 14000;
export const ASSEMBLY = 4000;
export const HR = { salesCost: 3.5, plantRate: 0.012, min: 80, max: 130 };
export const CENTRE = { open: 40, opex: 8 };

// Curated store/outlet markets. Entry cost scales with market size (bigger
// markets cost more to enter but grant a bigger reach bonus once occupied).
// demandBonus is added to reachOf() and split between every team present
// in the same city, so being first into a large market is worth more.
export const MARKETS: {
  id: string;
  city: string;
  region: string;
  lon: number;
  lat: number;
  marketSize: number; // EV units / year
  entryCost: number; // Rs. L, one-time
  demandBonus: number; // added to reachOf() when occupied, split among competitors in the city
}[] = [
  { id: "del", city: "Delhi-NCR", region: "India", lon: 77.1, lat: 28.6, marketSize: 480000, entryCost: 55, demandBonus: 0.096 },
  { id: "bom", city: "Mumbai-Pune", region: "India", lon: 72.88, lat: 19.08, marketSize: 520000, entryCost: 60, demandBonus: 0.104 },
  { id: "blr", city: "Bengaluru-Chennai", region: "India", lon: 77.59, lat: 12.97, marketSize: 400000, entryCost: 50, demandBonus: 0.08 },
  { id: "ccu", city: "Kolkata / Tier-2", region: "India", lon: 88.36, lat: 22.57, marketSize: 220000, entryCost: 30, demandBonus: 0.044 },
  { id: "dxb", city: "Singapore / Dubai", region: "Global Export", lon: 55.27, lat: 25.2, marketSize: 150000, entryCost: 80, demandBonus: 0.03 },
  { id: "sha", city: "Shanghai", region: "Asia-Pacific", lon: 121.47, lat: 31.23, marketSize: 420000, entryCost: 65, demandBonus: 0.084 },
  { id: "lon", city: "London", region: "Europe", lon: -0.13, lat: 51.51, marketSize: 390000, entryCost: 70, demandBonus: 0.078 },
  { id: "sfo", city: "San Francisco", region: "North America", lon: -122.42, lat: 37.77, marketSize: 180000, entryCost: 58, demandBonus: 0.036 },
  { id: "gru", city: "São Paulo", region: "Emerging Markets", lon: -46.63, lat: -23.55, marketSize: 460000, entryCost: 45, demandBonus: 0.092 },
  { id: "nbo", city: "Nairobi", region: "Emerging Markets", lon: 36.82, lat: -1.29, marketSize: 85000, entryCost: 22, demandBonus: 0.017 }
];
export const DEFAULT_MARKET_IDS = ["del", "blr", "bom", "ccu"];
export const CAP_BLOCK = { units: 500, cost: 120 };
export const DEP_RATE = 0.04;
export const HOLD_COST = 0.015;

export const TEAM_COLORS = [
  "#0B9E63", "#3D7EA6", "#8A5FBF", "#C77D0A",
  "#C03A2B", "#2A3630", "#1F8A8C", "#A6355C",
  "#5C7A29", "#7A4B8A"
];

export const ARCHETYPES: Record<string, any> = {
  premium: {
    name: "Aurora X",
    price: 152000,
    alloc: { S1: 55, S2: 5, S3: 30, S4: 5, S5: 5 },
    cfg: { powertrain: "PT1", modes: "RM4", battery: "BC1", tech: "CT4", build: "BD1", wheels: "ALLOY", brakes: "BR1", seat: "WIDE", susp: "SUS1" },
    add: ["tpms", "theft", "hillhold"],
    prim: "S1",
    sec: "S3"
  },
  commuter: {
    name: "CityRun 75",
    price: 112000,
    alloc: { S1: 5, S2: 65, S3: 15, S4: 5, S5: 10 },
    cfg: { powertrain: "PT3", modes: "RM2", battery: "BC3", tech: "CT2", build: "BD2", wheels: "SPOKE", brakes: "BR2", seat: "WIDE", susp: "SUS2" },
    add: ["boot"],
    prim: "S2",
    sec: "S3"
  },
  budget: {
    name: "Zip GenZ",
    price: 82000,
    alloc: { S1: 0, S2: 15, S3: 5, S4: 65, S5: 15 },
    cfg: { powertrain: "PT4", modes: "RM1", battery: "BC5", tech: "CT2", build: "BD3", wheels: "SPOKE", brakes: "BR3", seat: "STD", susp: "SUS3" },
    add: ["removable", "colors"],
    prim: "S4",
    sec: "S2"
  },
  fleeteco: {
    name: "HaulEV F1",
    price: 98000,
    alloc: { S1: 0, S2: 15, S3: 25, S4: 5, S5: 55 },
    cfg: { powertrain: "PT3", modes: "RM2", battery: "BC4", tech: "CT4", build: "BD1", wheels: "SPOKE", brakes: "BR2", seat: "STD", susp: "SUS2" },
    add: ["removable", "theft", "extwarranty"],
    prim: "S5",
    sec: "S3"
  }
};

export const fmtRs = (v: number) => "Rs. " + Math.round(v).toLocaleString("en-IN");
export const fmtL = (v: number) => (v < 0 ? "(" : "") + Math.abs(v).toFixed(0) + (v < 0 ? ")" : "");
