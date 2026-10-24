import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { MANUAL } from "../../content/manual";

export const HelpManualTab: React.FC = () => {
  const [activeChapter, setActiveChapter] = useState<string>(MANUAL[0].id);
  const [query, setQuery] = useState<string>("");
  const q = query.trim().toLowerCase();

  // Searching looks across every chapter, not just the open one.
  const results = useMemo(() => {
    if (!q) return null;
    return MANUAL.flatMap((chapter) =>
      chapter.sections
        .filter((s) => s.title.toLowerCase().includes(q) || s.body.toLowerCase().includes(q))
        .map((s) => ({ chapter, section: s }))
    );
  }, [q]);

  const chapter = MANUAL.find((c) => c.id === activeChapter) || MANUAL[0];

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#1F2022]">Player manual</h1>
          <p className="text-sm text-[#5A5C60]">How the simulation works and what each decision does.</p>
        </div>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Search the manual</span>
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#8A8C90]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the manual"
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-[#E0DCD3] rounded-lg focus:outline-none focus:border-[#1F2022]"
          />
        </label>
      </div>

      {results ? (
        <section className="bg-white border border-[#E5E1D8] rounded-xl divide-y divide-[#F0ECE5]">
          {results.length === 0 && <p className="p-5 text-sm text-[#5A5C60]">Nothing in the manual matches "{query}".</p>}
          {results.map(({ chapter: c, section }) => (
            <article key={c.id + section.title} className="p-5">
              <div className="text-xs text-[#8A8C90]">{c.title}</div>
              <h2 className="mt-0.5 text-base font-semibold text-[#1F2022]">{section.title}</h2>
              <p className="mt-1.5 text-sm text-[#3A3C40] leading-relaxed whitespace-pre-line">{section.body}</p>
            </article>
          ))}
        </section>
      ) : (
        <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label="Manual chapters">
            <select
              aria-label="Chapter"
              value={chapter.id}
              onChange={(e) => setActiveChapter(e.target.value)}
              className="md:hidden w-full px-3 py-2.5 bg-white border border-[#E0DCD3] rounded-lg text-sm"
            >
              {MANUAL.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <ul className="hidden md:block space-y-0.5">
              {MANUAL.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setActiveChapter(c.id)}
                    aria-current={c.id === chapter.id ? "page" : undefined}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                      c.id === chapter.id ? "bg-white border border-[#E5E1D8] font-semibold text-[#1F2022]" : "text-[#5A5C60] hover:bg-white hover:text-[#1F2022]"
                    }`}
                  >
                    {c.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <article className="bg-white border border-[#E5E1D8] rounded-xl p-5 sm:p-7 space-y-6 min-w-0">
            <h2 className="text-lg font-semibold text-[#1F2022]">{chapter.title}</h2>
            {chapter.sections.map((s) => (
              <section key={s.title}>
                <h3 className="text-sm font-semibold text-[#1F2022]">{s.title}</h3>
                <p className="mt-1.5 text-sm text-[#3A3C40] leading-relaxed whitespace-pre-line">{s.body}</p>
              </section>
            ))}
          </article>
        </div>
      )}
    </div>
  );
};
