import React, { useMemo, useState } from "react";
import { Download, FileText, LoaderCircle, Printer, RefreshCw } from "lucide-react";

const ROLES = ["President", "VP Marketing", "VP Sales", "VP Manufacturing", "VP Finance", "VP HR", "VP Analytics"];
const ROLE_LABELS = { CEO: "President", CMO: "VP Marketing", VPS: "VP Sales", VPO: "VP Manufacturing", CFO: "VP Finance", HR: "VP HR", RND: "VP Analytics" };
const EMPTY_SECTIONS = { performance: "", decisions: "", nextQuarter: "", uncertainties: "" };

function markdownFor({ teamName, quarter, role, sections }) {
  return `# Quarterly Executive Briefing\n\n**Team:** ${teamName}\n**Quarter:** Q${quarter}\n**Presentation role:** ${role}\n\n## Performance vs. prior-quarter goals\n\n${sections.performance}\n\n## Key decisions and rationale\n\n${sections.decisions}\n\n## Next-quarter plans\n\n${sections.nextQuarter}\n\n## Questions and uncertainties\n\n${sections.uncertainties}\n`;
}

export default function ExecutiveBriefing({ team, gameState, universeId, role: initialRole = "President" }) {
  const normalizedRole = ROLE_LABELS[initialRole] || initialRole;
  const [role, setRole] = useState(ROLES.includes(normalizedRole) ? normalizedRole : "President");
  const [sections, setSections] = useState(EMPTY_SECTIONS);
  const [sourceData, setSourceData] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const quarter = Number(gameState?.quarter || 1);
  const teamName = team?.name || "Team";
  const markdown = useMemo(() => markdownFor({ teamName, quarter, role, sections }), [teamName, quarter, role, sections]);

  const generate = async () => {
    setStatus("loading");
    setError("");
    try {
      const response = await fetch("/api/executive-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universeId, teamId: team.i, quarter, role })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Briefing could not be generated.");
      setSections({ ...EMPTY_SECTIONS, ...(data.sections || {}) });
      setSourceData(data.sourceData || null);
      setStatus("ready");
    } catch (requestError) {
      setStatus("error");
      setError(requestError.message || "Briefing could not be generated.");
    }
  };

  const downloadMarkdown = () => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    link.download = `${teamName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-q${quarter}-briefing.md`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const section = (title, key) => <section className="space-y-2" key={key}>
    <h4 className="text-sm font-bold text-[#1F2022]">{title}</h4>
    <p className="whitespace-pre-line text-xs leading-6 text-[#4A4C50]">{sections[key] || "Generate the briefing to populate this section."}</p>
  </section>;

  return <section className="space-y-6 rounded-xl border border-[#E5E1D8] bg-white p-6 shadow-sm text-[#1F2022] print:shadow-none">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E5E1D8] pb-4">
      <div className="flex items-start gap-3"><div className="rounded-lg border border-indigo-200 bg-indigo-50 p-2.5 text-indigo-700"><FileText className="h-5 w-5" /></div><div><h3 className="text-lg font-bold">Quarterly Executive Briefing</h3><p className="mt-1 text-xs text-[#5A5C60]">Claude-generated briefing document for the instructor presentation.</p></div></div>
      <div className="flex flex-wrap gap-2 print:hidden"><button onClick={downloadMarkdown} disabled={status !== "ready"} title="Download markdown" className="flex items-center gap-1.5 rounded-lg border border-[#E0DCD3] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold disabled:opacity-50"><Download className="h-3.5 w-3.5" /> Markdown</button><button onClick={() => window.print()} disabled={status !== "ready"} title="Print or save as PDF" className="flex items-center gap-1.5 rounded-lg border border-[#E0DCD3] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold disabled:opacity-50"><Printer className="h-3.5 w-3.5" /> PDF</button></div>
    </div>
    <div className="flex flex-wrap items-end gap-3 print:hidden"><label className="space-y-1 text-xs font-semibold">Presentation role<select value={role} onChange={(event) => setRole(event.target.value)} className="mt-1 block rounded-lg border border-[#E0DCD3] bg-white px-3 py-2 text-xs font-normal">{ROLES.map((item) => <option key={item}>{item}</option>)}</select></label><button onClick={generate} disabled={status === "loading"} className="flex items-center gap-1.5 rounded-lg bg-[#1F2022] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">{status === "loading" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : status === "ready" ? <RefreshCw className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}{status === "ready" ? "Regenerate briefing" : "Generate briefing"}</button></div>
    {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
    <div className="grid gap-6 md:grid-cols-2">{section("Performance vs. prior-quarter goals", "performance")}{section("Key decisions and rationale", "decisions")}{section("Next-quarter plans", "nextQuarter")}{section("Questions and uncertainties to flag", "uncertainties")}</div>
    {sourceData && <p className="text-[10px] text-[#7A7C80] print:hidden">Source records: {sourceData.scorecards?.length || 0} scorecard snapshots, {sourceData.strategyPlans?.length || 0} strategy plans, {sourceData.proForma?.length || 0} pro forma records, {sourceData.decisions?.length || 0} decision records.</p>}
  </section>;
}