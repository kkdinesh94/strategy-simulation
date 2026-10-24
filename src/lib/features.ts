/**
 * Panels that are built but not yet connected to the simulation engine. They stay hidden
 * so students never make decisions that have no effect. Turn one on once the engine reads it.
 */
export const FEATURES = {
  /** Web Sales Centre settings are saved but do not yet change demand or costs. */
  webSalesCenter: false,
  /** Activity-based costing report reads brand/sales tables the quarter run does not populate yet. */
  abcReport: false,
  /** The board-advisor dialog is a placeholder; it does not call the /api/advisor endpoint yet. */
  aiAdvisor: false
};
