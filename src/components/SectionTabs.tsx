import React from "react";

export interface SectionTab<K extends string> {
  key: K;
  label: string;
  /** Short note shown next to the label, e.g. "New" when a report has arrived. */
  badge?: string;
}

export interface SectionTabGroup<K extends string> {
  label: string;
  tabs: SectionTab<K>[];
}

interface SectionTabsProps<K extends string> {
  groups: SectionTabGroup<NoInfer<K>>[];
  active: K;
  onChange: (key: NoInfer<K>) => void;
  ariaLabel: string;
}

/**
 * The views inside one screen (Finance, Results...). One neutral style everywhere, grouped
 * under short labels. On phones the row scrolls sideways instead of wrapping into a wall.
 */
export function SectionTabs<K extends string>({ groups, active, onChange, ariaLabel }: SectionTabsProps<K>) {
  return (
    <nav aria-label={ariaLabel} className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
      <div className="flex sm:flex-wrap gap-x-6 gap-y-3 min-w-max sm:min-w-0">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1.5 shrink-0 sm:shrink sm:min-w-0 sm:max-w-full">
            <span className="text-[11px] font-medium text-[#8A8C90] px-1">{group.label}</span>
            <div className="flex sm:flex-wrap gap-1 p-1 bg-[#F3F0EA] rounded-lg">
              {group.tabs.map((tab) => {
                const selected = tab.key === active;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    aria-current={selected ? "page" : undefined}
                    onClick={() => onChange(tab.key)}
                    className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition ${
                      selected ? "bg-white text-[#1F2022] font-semibold shadow-sm" : "text-[#5A5C60] hover:text-[#1F2022]"
                    }`}
                  >
                    {tab.label}
                    {tab.badge && <span className="ml-1.5 text-[11px] font-semibold text-[#C83E2B]">{tab.badge}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
