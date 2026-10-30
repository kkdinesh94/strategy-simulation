import React from "react";
import { ScooterModel, TeamState } from "../types/simulation";
import { CATALOG, CLAIMS, fmtRs } from "../engine/catalog";
import { ScooterVisualizer } from "./ScooterVisualizer";
import { Heart, MessageCircle, Send, ShieldAlert, ShieldCheck } from "lucide-react";

export type AdFormat = "billboard" | "social" | "print";

interface AdCreativeProps {
  team: TeamState;
  model: ScooterModel;
  claims: string[];
  /** Per claim: null when the auditor accepts it, otherwise the reason it is refused. */
  audit: Record<string, string | null>;
  format: AdFormat;
  quarter: number;
}

const optName = (cat: string, id: string) => CATALOG[cat]?.opts.find((o) => o.id === id)?.name || id;

/** Ad copy written from the model's real specification, so the creative never promises more than the BOM. */
function copyFor(claim: string, m: ScooterModel): { headline: string; proof: string } {
  const batt = optName("battery", m.cfg.battery);
  const km = batt.match(/(\d+) km/)?.[1];
  const chargeSpec = batt.split(" · ")[2] || "";
  const kw = optName("powertrain", m.cfg.powertrain).match(/([\d.]+) kW/)?.[1];
  switch (claim) {
    case "perf":
      return { headline: "Instant torque. Every signal.", proof: kw ? `${kw} kW electric motor` : "Electric performance" };
    case "range":
      return { headline: km ? `${km} km on one charge.` : "Go further on one charge.", proof: km ? `${km} km certified range*` : "Certified range*" };
    case "charge":
      return { headline: "Charge in a chai break.", proof: chargeSpec ? `${chargeSpec.replace("min", " min")} charging` : "Fast charging" };
    case "tech":
      return { headline: "Your scooter, connected.", proof: optName("tech", m.cfg.tech).split(" · ")[1] || "Connected dashboard" };
    case "build":
      return { headline: "Built in metal. Built to last.", proof: optName("build", m.cfg.build).split(" · ")[1] || "Premium body" };
    case "comfort":
      return { headline: "Room for two, and the shopping.", proof: `${optName("seat", m.cfg.seat)} seat · ${optName("susp", m.cfg.susp)}` };
    case "safety":
      return { headline: "Stops as surely as it goes.", proof: optName("brakes", m.cfg.brakes) };
    case "econ":
      return { headline: "Costs less per km than petrol.", proof: m.add.extwarranty ? "5-year extended warranty" : "Low running cost" };
    default:
      return { headline: CLAIMS[claim] || claim, proof: "" };
  }
}

function shade(hex: string, pct: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 + pct / 100))));
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}

export function AdCreative({ team, model, claims, audit, format, quarter }: AdCreativeProps) {
  const lines = claims.map((c) => copyFor(c, model));
  const headline = lines[0]?.headline || "Pure electric. Pure city.";
  const sub = lines[1]?.headline || team.tagline || "Test ride one this weekend.";
  const proofs = lines.map((l) => l.proof).filter(Boolean);
  const refused = claims.filter((c) => audit[c]);
  const brand = team.color || "#C83E2B";
  const bg = `linear-gradient(135deg, ${shade(brand, 10)} 0%, ${shade(brand, -45)} 70%, #111 100%)`;
  const art = (
    <div className="[&_svg]:w-full [&_svg]:h-auto [&_svg]:drop-shadow-[0_12px_14px_rgba(0,0,0,0.45)]">
      <ScooterVisualizer model={model} color={brand} width={360} bare />
    </div>
  );

  const stamp = claims.length > 0 && (
    <div
      className={`absolute z-10 flex items-center gap-1 px-2 py-1 rounded-md border-2 text-[10px] font-bold uppercase tracking-wide rotate-[-6deg] shadow ${
        refused.length ? "bg-red-50/95 border-red-600 text-red-700" : "bg-emerald-50/95 border-emerald-600 text-emerald-700"
      }`}
      style={{ right: 10, bottom: 10 }}
      title={refused.length ? refused.map((c) => audit[c]).join("; ") : "Every claim is backed by the flagship's specification."}
    >
      {refused.length ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
      {refused.length ? `Auditor: ${refused.length} claim${refused.length > 1 ? "s" : ""} refused` : "Auditor: cleared"}
    </div>
  );

  if (format === "social") {
    return (
      <div className="relative mx-auto w-full max-w-[340px] rounded-xl bg-white border border-[#E5E1D8] shadow-md overflow-hidden text-[#1F2022]">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="w-7 h-7 rounded-full grid place-items-center text-white text-[11px] font-bold" style={{ background: brand }}>
            {team.name.slice(0, 1)}
          </span>
          <div className="leading-tight">
            <div className="text-xs font-semibold">{team.name.toLowerCase().replace(/\s+/g, "")}</div>
            <div className="text-[10px] text-[#6C6D70]">Sponsored</div>
          </div>
        </div>
        <div className="relative aspect-square flex flex-col justify-between p-4 text-white" style={{ background: bg }}>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] opacity-80">{model.name}</div>
            <div className="text-xl font-extrabold leading-tight mt-1">{headline}</div>
          </div>
          <div className="px-4">{art}</div>
          <div className="text-[11px] opacity-90">{sub}</div>
          {stamp}
        </div>
        <div className="flex items-center gap-3 px-3 py-2 text-[#1F2022]">
          <Heart className="w-4 h-4" /> <MessageCircle className="w-4 h-4" /> <Send className="w-4 h-4" />
          <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded bg-[#F3F0EA]">Book test ride</span>
        </div>
      </div>
    );
  }

  if (format === "print") {
    return (
      <div className="relative mx-auto w-full max-w-[300px] aspect-[3/4] bg-[#FBF8F2] border border-[#E5E1D8] shadow-md p-4 flex flex-col text-[#1F2022]">
        <div className="text-[9px] uppercase tracking-[0.25em] text-[#6C6D70]">{team.name}</div>
        <div className="font-serif text-2xl font-bold leading-tight mt-1">{headline}</div>
        <div className="flex-1 flex items-center px-2">{art}</div>
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <ul className="text-[10px] space-y-0.5">
            {(proofs.length ? proofs : [optName("battery", model.cfg.battery)]).map((p) => (
              <li key={p} className="flex gap-1">
                <span style={{ color: brand }}>■</span> {p}
              </li>
            ))}
          </ul>
          <div className="text-right">
            <div className="text-[9px] text-[#6C6D70]">Ex-showroom from</div>
            <div className="text-sm font-bold font-mono">{fmtRs(model.price)}</div>
          </div>
        </div>
        <p className="text-[7px] text-[#8A8C90] mt-2 leading-tight">
          *Certified range under the standard test cycle. Real-world range depends on riding conditions. Q{quarter} campaign.
        </p>
        {stamp}
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[16/7] rounded-lg overflow-hidden shadow-md text-white" style={{ background: bg }}>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(115deg, rgba(255,255,255,.18) 0 1px, transparent 1px 18px)" }} />
      <div className="relative h-full grid grid-cols-[1.05fr_1fr] items-center gap-2 p-[4%]">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.25em] opacity-80">
            {team.name} · {model.name}
          </div>
          <div className="text-[clamp(1.1rem,2.6vw,1.9rem)] font-extrabold leading-[1.05] mt-1.5">{headline}</div>
          <div className="text-[clamp(0.7rem,1.2vw,0.9rem)] opacity-90 mt-1.5">{sub}</div>
          <div className="mt-3 inline-flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-white text-[#1F2022] text-[11px] font-bold whitespace-nowrap">From {fmtRs(model.price)}</span>
            <span className="text-[10px] opacity-80">Test rides at your nearest experience centre</span>
          </div>
        </div>
        <div>{art}</div>
      </div>
      {stamp}
    </div>
  );
}

export default AdCreative;
