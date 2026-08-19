import React, { useState } from "react";
import { BookOpen, Search, ChevronRight, HelpCircle } from "lucide-react";

export const HelpManualTab: React.FC = () => {
  const [activeChapter, setActiveChapter] = useState<string>("intro");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const chapters = [
    {
      id: "intro",
      title: "A. Introduction to EV Venture League",
      sections: [
        {
          title: "1. Game Scenario",
          content: `You and your executive team are about to enter the microcomputer / EV business. You are responsible for introducing a new line of EV scooters into international markets. The industry is in its introductory stage: no established competitors, equal starting capital (Rs. 25 Cr seed capital), and a level playing field.`
        },
        {
          title: "2. How to Win",
          content: `Success depends on customer satisfaction and sound financial management:
1. Find out what people want (Market Opportunity Analysis).
2. Give them what they want (Match features to benefits).
3. Tell them you have it (Effective, non-deceptive advertising).
4. Hire sales people to service them (Sales & Service distribution).
5. Manage cash flow and equity to stay solvent and maximize Return on Investment.`
        },
        {
          title: "3. Decisions by Quarter Summary",
          content: `• Quarter 1: Executive Team Organization, Mission, Target Segments, Goals, Initial Survey.
• Quarter 2: Market Opportunity Analysis, Brand Design, Open Experience Centers, Fixed Production Capacity.
• Quarter 3: Go to Market, Sales Force Hiring, HR Packages, Media Placement, Daily Production Schedule.
• Quarter 4: Evaluate Test Market Results, Customer Opinion Panels, Competitor Benchmarking, Quality Control.
• Quarter 5: Venture Capital Pitch, R&D Projects, Debt Financing, Global Expansion.
• Quarters 6-8: Monitor, Improve & Execute, Activity Based Costing, Balanced Scorecard Maxima.`
        }
      ]
    },
    {
      id: "charter",
      title: "B. Player Activities & Team Roles",
      sections: [
        {
          title: "1. Functional Organization of Executive Team",
          content: `Divide corporate responsibilities among executive assignments:
- President: Overall leadership, strategic objectives & Balanced Scorecard.
- VP Marketing: Product design, pricing, ad copy & segment targeting.
- VP Sales Management: Experience centers, sales headcount & specialization.
- VP Manufacturing: Fixed capacity, production scheduling & quality.
- VP Accounting & Finance: Cash flow, debt, VC pitch & Activity Based Costing.
- VP Human Resources: Sales & worker compensation packages.`
        }
      ]
    },
    {
      id: "strategy",
      title: "C. Strategic Planning Framework",
      sections: [
        {
          title: "1. Corporate Mission & Values",
          content: `Formulate a clear mission statement defining your firm's purpose, target audience, and competitive positioning. Establish core values (quality, innovation, frugality, customer focus).`
        },
        {
          title: "2. Target Marketing Strategy",
          content: `Designate Primary and Secondary target segments. Your Balanced Scorecard evaluates marketing performance based on how effectively your brand designs, prices, and ads appeal to these declared segments.`
        }
      ]
    },
    {
      id: "moa",
      title: "D. Market Research (MOA)",
      sections: [
        {
          title: "1. Market Opportunity Analysis",
          content: `Study customer benefit preferences (scaled 1-100), willingness to pay, and total segment volume potential. Note that buying intentions are rough projections; actual sales depend on your relative marketing mix vs competitors.`
        }
      ]
    },
    {
      id: "brand",
      title: "E. Brand Management & Product Design",
      sections: [
        {
          title: "1. Matching Benefits & Components",
          content: `Customers buy benefits, not physical parts. Select powertrain, riding modes, battery pack, connected tech, body build, wheels, brakes, seat, and suspension to match segment preferences while keeping unit BOM costs within target retail price points.`
        },
        {
          title: "2. Product Line Depth (Good, Better, Best)",
          content: `Offer multiple brand variants derived from core platforms to appeal to different points along the price-performance spectrum.`
        }
      ]
    },
    {
      id: "ad",
      title: "F. Advertising & Claims",
      sections: [
        {
          title: "1. Ad Copy Design & Deceptive Advertising",
          content: `Select up to 2 claims per campaign. ALL CLAIMS MUST BE SUPPORTABLE BY ACTUAL PRODUCT SPECS. Making claims that your product line cannot document triggers Deceptive Advertising penalties and hurts customer satisfaction.`
        }
      ]
    },
    {
      id: "sales",
      title: "G. Sales Office & Distribution",
      sections: [
        {
          title: "1. Retail Outlets & Sales Staffing",
          content: `Open Experience Centers (Rs. 40 L capex + Rs. 8 L/qtr opex). Hire sales & service personnel (up to 8 per center). Specialized sales training increases segment conversion efficiency.`
        }
      ]
    },
    {
      id: "hr",
      title: "H. Human Resource Management",
      sections: [
        {
          title: "1. Compensation Packages & Productivity",
          content: `Set salary and benefits relative to industry benchmark (80%-130%). Higher relative compensation attracts more productive sales personnel and increases factory assembly output efficiency.`
        }
      ]
    },
    {
      id: "mfg",
      title: "I. Manufacturing & Quality Control",
      sections: [
        {
          title: "1. Fixed Capacity & Production Scheduling",
          content: `Order capacity expansion blocks in advance (1 quarter build lead time). Schedule daily production to meet forecasted demand. Changeover between models reduces effective daily output.`
        },
        {
          title: "2. Statistical Quality Control",
          content: `Invest in quality improvement programs to reduce defect rates, cut warranty repair expenses, and lift reliability ratings.`
        }
      ]
    },
    {
      id: "bsc",
      title: "N. Balanced Scorecard Equations",
      sections: [
        {
          title: "1. Total Business Performance",
          content: `Total Business Performance = Financial Performance × Market Performance × Marketing Effectiveness × Investment in Future × Wealth × HR Management × Asset Management × Manufacturing Productivity × Financial Risk.`
        }
      ]
    }
  ];

  const currentCh = chapters.find((c) => c.id === activeChapter) || chapters[0];

  const filteredSections = currentCh.sections.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search & Header */}
      <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-emerald-600" />
          <div>
            <h2 className="text-xl font-bold text-[#1F2022]">
              EV Venture League Executive Help Manual
            </h2>
            <p className="text-xs text-[#5A5C60]">
              Complete reference manual & decision guidelines
            </p>
          </div>
        </div>

        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#5A5C60]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search manual..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg text-[#1F2022]"
          />
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Chapter Sidebar */}
        <div className="md:col-span-1 bg-white p-4 rounded-xl border border-[#E5E1D8] shadow-sm space-y-1">
          <div className="text-xs font-mono font-bold uppercase text-[#5A5C60] px-3 py-1 mb-2">
            Manual Chapters
          </div>
          {chapters.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveChapter(c.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-between ${
                activeChapter === c.id
                  ? "bg-[#FAF8F5] text-[#1F2022] font-bold border border-[#E0DCD3]"
                  : "text-[#5A5C60] hover:bg-slate-100 hover:text-[#1F2022]"
              }`}
            >
              <span className="truncate">{c.title}</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
            </button>
          ))}
        </div>

        {/* Section Content */}
        <div className="md:col-span-3 bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-sm space-y-6">
          <h3 className="text-xl font-bold text-[#1F2022] border-b border-[#E0DCD3] pb-3">
            {currentCh.title}
          </h3>

          {filteredSections.length > 0 ? (
            filteredSections.map((sec, idx) => (
              <div key={idx} className="space-y-2">
                <h4 className="font-bold text-sm text-emerald-800">
                  {sec.title}
                </h4>
                <p className="text-xs text-[#1F2022] leading-relaxed whitespace-pre-line">
                  {sec.content}
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-[#5A5C60] italic">
              No matching sections found for "{searchQuery}".
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
