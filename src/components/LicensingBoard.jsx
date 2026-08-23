import React, { useEffect, useState } from "react";
import { ArrowLeftRight, Clock3, Send, RefreshCw } from "lucide-react";

const asProject = (row) => row.project_id || row.projectId;
const label = (row) => row.component_name || row.name || asProject(row);

export default function LicensingBoard({ gameId, teamId, quarter = 1, teams = [], ownedTechnologies = [], onNotify }) {
  const [available, setAvailable] = useState([]);
  const [outbound, setOutbound] = useState([]);
  const [buyerId, setBuyerId] = useState(teams.find((team) => String(team.i ?? team.id) !== String(teamId))?.i ?? "");
  const [offeredProject, setOfferedProject] = useState(ownedTechnologies[0] || "");
  const [requestedProject, setRequestedProject] = useState("");
  const [fee, setFee] = useState(1);
  const [terms, setTerms] = useState("");
  const [busy, setBusy] = useState(false);
  const rivals = teams.filter((team) => String(team.i ?? team.id) !== String(teamId));

  const loadBoard = async () => {
    if (!gameId || !teamId) return;
    const response = await fetch(`/api/rd/license?game_id=${encodeURIComponent(gameId)}&team_id=${encodeURIComponent(teamId)}&quarter=${quarter}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not load licensing board.");
    setAvailable(payload.available || []);
    setOutbound(payload.outbound || []);
  };

  useEffect(() => {
    loadBoard().catch((error) => onNotify?.(error.message));
  }, [gameId, teamId, quarter]);

  const propose = async (event) => {
    event.preventDefault();
    if (!buyerId || !offeredProject || !requestedProject || Number(fee) < 1) {
      onNotify?.("Choose a rival, two technologies, and a fee of at least 1.");
      return;
    }
    setBusy(true);
    try {
      const common = { game_id: gameId, buyer_team_id: String(buyerId), license_fee: Number(fee), special_terms: terms, quarter };
      const legs = [
        { ...common, seller_team_id: String(teamId), project_id: offeredProject },
        { ...common, seller_team_id: String(buyerId), project_id: requestedProject }
      ];
      for (const leg of legs) {
        const response = await fetch("/api/rd/license", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(leg) });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not send the swap offer.");
      }
      onNotify?.("Cross-licensing offer sent. Both legs execute at the start of the next quarter after acceptance.");
      await loadBoard();
    } catch (error) {
      onNotify?.(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-[#E5E1D8] bg-[#FAF8F5] p-6 shadow-2xs">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700"><ArrowLeftRight className="h-4 w-4" /> Licensing board / Q{quarter}</div>
          <h3 className="mt-1 text-lg font-bold text-[#1F2022]">Technology exchange</h3>
          <p className="mt-1 text-xs text-[#6C6D70]">Licensed components become available to the buyer at the start of the following quarter.</p>
        </div>
        <button type="button" onClick={() => loadBoard().catch((error) => onNotify?.(error.message))} className="inline-flex items-center gap-1.5 rounded-lg border border-[#E0DCD3] bg-white px-3 py-2 text-xs font-semibold text-[#1F2022]" title="Refresh licensing data"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5A5C60]">Available from other teams</h4>
          <div className="space-y-2">
            {available.length === 0 && <p className="text-sm italic text-[#6C6D70]">No completed rival technologies are available in this game and quarter.</p>}
            {available.map((technology) => <div key={`${technology.seller_team_id}-${asProject(technology)}`} className="rounded-lg border border-[#E0DCD3] bg-white p-3"><div className="text-sm font-semibold text-[#1F2022]">{label(technology)}</div><div className="mt-1 text-[11px] text-[#6C6D70]">{technology.category || "Technology"} · seller {technology.seller_team_id}</div></div>)}
          </div>
        </div>

        <form onSubmit={propose} className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-emerald-900">Propose cross-license swap</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-[#5A5C60]">Your technology<select value={offeredProject} onChange={(event) => setOfferedProject(event.target.value)} className="mt-1 w-full rounded-lg border border-[#E0DCD3] bg-white p-2 text-xs"><option value="">Select technology</option>{ownedTechnologies.map((technology) => <option key={technology} value={asProject(technology)}>{label(technology)}</option>)}</select></label>
            <label className="text-xs font-semibold text-[#5A5C60]">Rival team<select value={buyerId} onChange={(event) => setBuyerId(event.target.value)} className="mt-1 w-full rounded-lg border border-[#E0DCD3] bg-white p-2 text-xs"><option value="">Select team</option>{rivals.map((team) => <option key={team.i ?? team.id} value={team.i ?? team.id}>{team.name}</option>)}</select></label>
            <label className="text-xs font-semibold text-[#5A5C60]">Technology requested<select value={requestedProject} onChange={(event) => setRequestedProject(event.target.value)} className="mt-1 w-full rounded-lg border border-[#E0DCD3] bg-white p-2 text-xs"><option value="">Select technology</option>{available.filter((technology) => String(technology.seller_team_id) === String(buyerId)).map((technology) => <option key={asProject(technology)} value={asProject(technology)}>{label(technology)}</option>)}</select></label>
            <label className="text-xs font-semibold text-[#5A5C60]">Fee per leg<input type="number" min="1" step="1" value={fee} onChange={(event) => setFee(event.target.value)} className="mt-1 w-full rounded-lg border border-[#E0DCD3] bg-white p-2 text-xs" /></label>
          </div>
          <label className="mt-3 block text-xs font-semibold text-[#5A5C60]">Special terms<textarea value={terms} onChange={(event) => setTerms(event.target.value)} rows="2" className="mt-1 w-full rounded-lg border border-[#E0DCD3] bg-white p-2 text-xs" placeholder="Optional commercial terms" /></label>
          <button disabled={busy} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"><Send className="h-3.5 w-3.5" /> {busy ? "Sending..." : "Send swap offer"}</button>
        </form>
      </div>

      <div className="mt-6 border-t border-[#E5E1D8] pt-4"><h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5A5C60]"><Clock3 className="h-4 w-4" /> Outbound offers</h4>{outbound.length === 0 ? <p className="text-sm italic text-[#6C6D70]">No outbound offers yet.</p> : <div className="grid gap-2 sm:grid-cols-2">{outbound.map((offer) => <div key={offer.id} className="rounded-lg border border-[#E0DCD3] bg-white p-3 text-xs"><div className="font-semibold text-[#1F2022]">{offer.project_id} to {offer.buyer_team_id}</div><div className="mt-1 text-[#6C6D70]">{offer.status} · Q{offer.offered_quarter} to Q{offer.execute_quarter} · fee {offer.license_fee}</div></div>)}</div>}</div>
    </section>
  );
}
