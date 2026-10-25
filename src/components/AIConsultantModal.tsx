import React, { useState } from "react";
import { Send, Sparkles, X } from "lucide-react";
import type { GameState, TeamState } from "../types/simulation";

interface AIConsultantModalProps {
  isOpen: boolean;
  onClose: () => void;
  universeId: string;
  team: TeamState;
  gameState: GameState;
}

const SUGGESTIONS = [
  "What should we change this quarter?",
  "Is our price right for our target segment?",
  "Are we producing too much or too little?",
  "How can we improve our cash position?"
];

/** Renders the advisor's markdown as plain React elements (bold, bullets, paragraphs); no HTML is injected. */
function AdviceText({ text }: { text: string }) {
  const inline = (line: string) => line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <React.Fragment key={i}>{part}</React.Fragment>
  );
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) blocks.push(<ul key={blocks.length} className="list-disc pl-5 space-y-1">{list.map((item, i) => <li key={i}>{inline(item)}</li>)}</ul>);
    list = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = line.match(/^(?:[-*]|\d+[.)])\s+(.*)$/);
    if (bullet) { list.push(bullet[1]); continue; }
    flush();
    if (!line) continue;
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    blocks.push(heading
      ? <h4 key={blocks.length} className="font-semibold text-[#1F2022]">{inline(heading[1])}</h4>
      : <p key={blocks.length}>{inline(line)}</p>);
  }
  flush();
  return <div className="space-y-2 text-sm leading-relaxed text-[#2C2D30]">{blocks}</div>;
}

export const AIConsultantModal: React.FC<AIConsultantModalProps> = ({ isOpen, onClose, universeId, team }) => {
  const [prompt, setPrompt] = useState("");
  const [advice, setAdvice] = useState("");
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const ask = async (question: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universeId, teamId: team.i, prompt: question })
      });
      const data = await response.json().catch(() => ({}));
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      if (!response.ok) throw new Error(data.error || "The advisor could not answer right now.");
      setAdvice(data.advice);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loading) ask(prompt.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1F2022]/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="advisor-title">
      <div className="bg-white border border-[#E5E1D8] rounded-xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-start gap-3">
          <div>
            <h3 id="advisor-title" className="text-base font-semibold text-[#1F2022] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#C83E2B]" /> Board advisor
            </h3>
            <p className="text-xs text-[#6C6D70] mt-1">
              AI advice based on {team.name}'s own figures and the public league results. Check it against your own analysis before acting.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 text-[#8A8C90] hover:text-[#1F2022] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="flex gap-2">
          <input
            type="text"
            value={prompt}
            maxLength={600}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask about pricing, production, cash..."
            aria-label="Question for the board advisor"
            className="flex-1 min-w-0 px-3 py-2 bg-white border border-[#E0DCD3] rounded-lg text-sm text-[#1F2022] focus:outline-none focus:ring-2 focus:ring-[#C83E2B]/30"
          />
          <button type="submit" disabled={loading} className="px-4 py-2 bg-[#1F2022] hover:bg-[#343538] disabled:opacity-50 text-white font-semibold rounded-lg flex items-center gap-1.5 text-sm">
            <Send className="w-4 h-4" /> {loading ? "Thinking..." : "Ask"}
          </button>
        </form>

        {!advice && !loading && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => { setPrompt(s); ask(s); }} className="px-3 py-1.5 text-xs border border-[#E0DCD3] rounded-full text-[#3A3C40] hover:bg-[#FAF8F5]">{s}</button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm" role="alert">{error}</div>}
          {loading && <p className="text-sm text-[#5A5C60]">The advisor is reviewing your figures...</p>}
          {advice && !loading && <AdviceText text={advice} />}
        </div>

        {remaining !== null && <p className="text-xs text-[#8A8C90]">{remaining} question{remaining === 1 ? "" : "s"} left for your team this quarter.</p>}
      </div>
    </div>
  );
};
