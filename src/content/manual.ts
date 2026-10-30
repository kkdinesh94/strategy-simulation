/**
 * Player manual. Numbers here are taken from the engine (src/engine/catalog.ts and
 * simulationEngine.ts); update both together if the rules change.
 */
import { BALANCE, CAP_BLOCK, HOLD_COST, SEGMENTS } from "../engine/catalog";

export interface ManualChapter {
  id: string;
  title: string;
  sections: { title: string; body: string }[];
}

const rs = (n: number) => `Rs. ${n.toLocaleString("en-IN")}`;
const segmentLines = SEGMENTS.map(
  (s) => `• ${s.name} (${Math.round(s.pct * 100)}% of buyers): will pay about ${rs(s.wtp[0])}–${rs(s.wtp[1])}. Cares most about ${Object.entries(s.w)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => ({ perf: "performance", range: "range", charge: "charging speed", tech: "smart tech", build: "build and design", comfort: "comfort", safety: "safety", econ: "running cost and reliability" }[k] || k))
    .join(", ")}.`
).join("\n");

export const MANUAL: ManualChapter[] = [
  {
    id: "start",
    title: "Getting started",
    sections: [
      {
        title: "The scenario",
        body: `Your team runs a new electric-scooter company competing in India against up to nine other companies, some run by classmates and some by the computer. Every team starts the same: Rs. 3,200 lakh in cash, a plant worth Rs. 600 lakh that can build 2,500 scooters a quarter, 20 sales staff, stores in four metro clusters (Delhi-NCR, Mumbai-Pune, Bengaluru-Chennai and Kolkata), and one starter model.`
      },
      {
        title: "How a quarter works",
        body: `1. Your team makes its decisions on each page (product, prices, advertising, staffing, production, financing).
2. The cash forecast on the right shows where your cash will end up if you sell what the forecast expects.
3. When you are ready, press Lock & submit. The auditor checks your plan first and lists anything that must be fixed.
4. Your instructor runs the quarter. Customers then choose between every company's scooters, and your results, statements and scorecard appear under Results.
You can unlock and change your decisions at any time until the instructor runs the quarter.`
      },
      {
        title: "Quarter 1 is a setup quarter",
        body: `No customers buy in Quarter 1. Use it to write your charter, choose target segments, design your product and build some stock. Costs such as salaries, store rent and advertising still apply, so a loss in Quarter 1 is normal. Selling starts in Quarter 2.`
      },
      {
        title: "How to win",
        body: `Teams are ranked on the Balanced Scorecard (see Results and scorecard). In short: find out what customers want, build a scooter they value at a price they will pay, tell them about it honestly, produce enough to meet demand without piling up stock, and keep the company solvent.`
      }
    ]
  },
  {
    id: "team",
    title: "Your team and roles",
    sections: [
      {
        title: "Suggested roles",
        body: `• President: overall strategy, the charter and the scorecard.
• Marketing: target segments, product features, prices and advertising claims.
• Sales: stores, new cities, sales staff and the charging network.
• Operations: production volumes, plant capacity and quality.
• Finance: the cash forecast, borrowing, shares and dividends.
• People: compensation packages for sales and plant staff.
Assign roles on the Strategy page. Anyone on the team can edit decisions, so agree who submits.`
      }
    ]
  },
  {
    id: "segments",
    title: "Customers and segments",
    sections: [
      { title: "The five segments", body: segmentLines },
      {
        title: "Market size and seasons",
        body: `About ${BALANCE.tam0.toLocaleString("en-IN")} scooters a quarter are bought across all segments at the start, growing about 5% each quarter. Quarters 2, 6 and 10 are monsoon quarters (demand ×0.9); quarters 3, 7 and 11 are festive quarters (demand ×1.25). Not every interested buyer buys an electric scooter: a scooter that fits the segment poorly or is priced above what it will pay loses those buyers to petrol scooters or to waiting.`
      },
      {
        title: "Primary and secondary segments",
        body: `Choose two different target segments on the Strategy page. Your market performance on the scorecard is measured mainly by your share of these two segments.`
      }
    ]
  },
  {
    id: "research",
    title: "Market research",
    sections: [
      {
        title: "Market Opportunity Analysis",
        body: `Bought on the Marketing page. It shows what each segment values, which media reach them and what they will pay. Higher precision costs more (Rs. 5, 15 or 30 lakh) but narrows the error margin.`
      },
      {
        title: "Competitor intelligence and customer clinic",
        body: `Subscribe on the Marketing page and the report arrives with next quarter's results: competitor intelligence shows rivals' advertising, stores, staff, technologies and estimated costs (Rs. 15 lakh); the customer clinic scores every model in the market on fit and price for each segment (Rs. 10 lakh).`
      }
    ]
  },
  {
    id: "product",
    title: "Product design and pricing",
    sections: [
      {
        title: "What a scooter costs to make",
        body: `Unit cost = the components you choose (motor, battery, dashboard, body, wheels, brakes, seat, suspension and add-ons) plus ${rs(BALANCE.basePlatform)} for the base platform and ${rs(BALANCE.assembly)} for assembly. Better components raise the scores customers care about, and the cost.`
      },
      {
        title: "Pricing rules",
        body: `Prices must be between Rs. 60,000 and Rs. 1,90,000, and at least 12% above unit cost. Inside a segment's price band, lower prices win more buyers; above the band, demand drops off sharply.`
      },
      {
        title: "More models",
        body: `You can sell up to three models. Each new model carries a one-off development charge of ${rs(BALANCE.modelLaunchCost)} lakh. More models reach more segments, but very different models make production changeovers slower.`
      },
      {
        title: "R&D and licensing",
        body: `R&D projects add a technology that improves every model's scores (for example faster charging or more range). A standard project takes two quarters; a crash project costs more and is ready next quarter. At most two projects can run at once. Once you own a technology you can license it to another team for a fee.`
      }
    ]
  },
  {
    id: "marketing",
    title: "Advertising and claims",
    sections: [
      {
        title: "Budget and allocation",
        body: `Set a quarterly advertising budget and split it across the five segments; the split must total exactly 100%. Advertising builds awareness, which fades by about 10% a quarter if you stop. Before Quarter 4 the auditor caps advertising at Rs. 300 lakh a quarter.`
      },
      {
        title: "Claims must be true",
        body: `You can claim up to a few benefits in your campaign (performance, range, fast charging, smart tech, build, comfort, safety, economy). Claims that match what a segment values make advertising work harder. A claim your product cannot back up (for example "fast charging" without a fast-charge battery) is refused by the auditor, and over-promising also hurts customer satisfaction and your reputation.`
      }
    ]
  },
  {
    id: "sales",
    title: "Sales, stores and charging",
    sections: [
      {
        title: "Stores and new cities",
        body: `Each store adds to your reach. You can open stores in up to two new cities a quarter; bigger cities cost more to enter but bring more buyers, and their bonus is shared with every other team present, so being early pays.`
      },
      {
        title: "Sales staff",
        body: `You need at least 4 sales staff and no more than 8 per store. Pay for sales and plant staff is set on the HR page. A package's value compared with other teams' sets productivity (between 0.75x and 1.25x), and its value compared with the default package sets payroll, so better pay costs more. Sales productivity multiplies the reach each salesperson adds, which only helps if you can supply the extra demand. Plant productivity below 1x loses output; above 1x it wins back output lost to model changeovers, but the line never builds more than you scheduled.`
      },
      {
        title: "Charging network",
        body: `Chargers raise demand for your scooters by a small amount each, up to +${Math.round(BALANCE.maxChargingBoost * 100)}% in total. Installation is a one-off capital cost; maintenance is charged every quarter the chargers stay in service.`
      }
    ]
  },
  {
    id: "operations",
    title: "Operations and quality",
    sections: [
      {
        title: "Production and capacity",
        body: `Schedule how many of each model to build, up to plant capacity. Unsold scooters stay in stock and cost ${rs(Math.round(HOLD_COST * 1e5))} each per quarter to hold. If you run out, you lose those sales and some reputation. Add capacity in blocks of ${CAP_BLOCK.units} units for ${rs(CAP_BLOCK.cost)} lakh each; the new lines are ready the following quarter.`
      },
      {
        title: "Quality and reliability",
        body: `Spending on quality raises reliability, which lowers warranty costs and makes economy and reliability claims credible. The component quality dashboard lets you inspect, study and fix specific components; its costs are charged as quality spending when the quarter runs.`
      },
      {
        title: "Battery end of life",
        body: `About 10% of battery packs come back one year (four quarters) after the scooter was sold. From Quarter 5 choose what to do with them: replace under warranty (costly), repurpose them for stationary storage (earns some revenue) or recycle them (best for sustainability).`
      }
    ]
  },
  {
    id: "finance",
    title: "Finance",
    sections: [
      {
        title: "Cash and the auditor",
        body: `The auditor will not let you lock a plan that runs out of cash. If cash still goes negative after the quarter runs (for example because sales were lower than forecast), an emergency loan covers the gap at a high interest rate, dilutes the founders and costs scorecard points. Watch the cash forecast.`
      },
      {
        title: "Borrowing",
        body: `• Bank credit line: up to 1.5 × shareholders' equity (less other debt), interest about 3–5% a quarter.
• Long-term loan: up to 2 × equity less existing debt, 4.5% a quarter, repaid after 20 quarters.
• Venture capital: from Quarter 5 you can sell a stake to investors at a valuation based on your revenue, reputation and scorecard.`
      },
      {
        title: "Shares and dividends",
        body: `You can issue new shares (up to about a third of your market value a quarter), buy shares back with spare cash, and pay dividends. Dividends and a rising share price both count towards wealth creation on the scorecard.`
      }
    ]
  },
  {
    id: "results",
    title: "Results and scorecard",
    sections: [
      {
        title: "Balanced Scorecard",
        body: `Each quarter every team is scored 0–100 on ten dimensions, relative to the other teams that quarter (best = 100, worst = 0):
• Financial performance 15% (net profit margin)
• Financial risk 10% (lower debt-to-equity is better)
• Market performance 20% (overall share and share of your two target segments)
• Marketing effectiveness 10% (brand and campaign judgement)
• Investment in the future 10% (R&D, quality and new models)
• Wealth creation 10% (growth in equity per share)
• Asset management 5% (sales relative to assets, plant utilisation)
• People 5% (staff productivity)
• Manufacturing 10% (reliability, cost efficiency, utilisation)
• Sustainability 5% (battery end-of-life choices)
Your overall score is the weighted average, minus up to 15 points in any quarter you needed an emergency loan. The league table ranks teams on the average of their last four quarters.`
      },
      {
        title: "Statements",
        body: `Results shows your income statement, balance sheet and cash-flow statement for every quarter, plus market share, competitor benchmarks and industry news.`
      }
    ]
  }
];
