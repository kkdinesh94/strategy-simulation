/**
 * Component quality programme rules, shared by the Quality dashboard and the server.
 *
 * A component moves through inspect -> variance study -> process improvement, one step at a
 * time. The browser only says which steps a team has taken; the server recomputes every
 * cost and reliability figure from these rules, so edited numbers in a save are ignored.
 */
import type { QualityComponentState } from "../types/simulation";

export const QUALITY_COMPONENTS = [
  { id: "battery-pack", category: "Battery Pack", warranty: 18, defect: 12, inspection: 8 },
  { id: "charging-system", category: "Charging System", warranty: 12, defect: 8, inspection: 6 },
  { id: "drive-motor", category: "Drive Motor", warranty: 10, defect: 7, inspection: 5 },
  { id: "software", category: "Software", warranty: 8, defect: 5, inspection: 4 }
] as const;

export const QUALITY_STUDY_COST = 12;
export const QUALITY_ACTION_COST = 25;
/** Reliability points one process improvement adds to its component. */
export const QUALITY_IMPROVEMENT_POINTS = 12;

export type QualityAction = "inspect" | "study" | "improve";

const round1 = (n: number) => Math.round(n * 10) / 10;

export function initialQualityComponents(): QualityComponentState[] {
  return QUALITY_COMPONENTS.map((c) => ({
    qcId: c.id,
    componentCategory: c.category,
    inspectionActive: false,
    varianceStudyDone: false,
    sourceActionStudyDone: false,
    improvementInvested: 0,
    warrantyCostPerQuarter: c.warranty,
    defectCostPerQuarter: c.defect,
    inspectionCost: c.inspection,
    reliabilityImprovement: 0
  }));
}

export function qualityActionCost(component: QualityComponentState, action: QualityAction): number {
  return action === "inspect" ? component.inspectionCost : action === "study" ? QUALITY_STUDY_COST : QUALITY_ACTION_COST;
}

/** Why an action is not allowed yet, or null when it is. */
export function qualityActionBlocker(component: QualityComponentState, action: QualityAction): string | null {
  if (action === "inspect") return component.inspectionActive ? "Inspection is already running." : null;
  if (action === "study") {
    if (component.varianceStudyDone) return "The variance study is already done.";
    return component.inspectionActive ? null : "Start inspection before studying variance.";
  }
  if (component.sourceActionStudyDone) return "The process improvement is already funded.";
  return component.varianceStudyDone ? null : "Complete the variance study before funding an action.";
}

/** Returns the component after taking `action`. Call qualityActionBlocker first. */
export function applyQualityAction(component: QualityComponentState, action: QualityAction, quarter: number): QualityComponentState {
  const next = { ...component };
  if (action === "inspect") {
    next.inspectionActive = true;
    next.warrantyCostPerQuarter = round1(next.warrantyCostPerQuarter * 0.85);
  }
  if (action === "study") next.varianceStudyDone = true;
  if (action === "improve") {
    next.sourceActionStudyDone = true;
    next.improvementInvested += QUALITY_ACTION_COST;
    next.reliabilityImprovement += QUALITY_IMPROVEMENT_POINTS;
    next.improvementQuarter = quarter + 2;
    next.warrantyCostPerQuarter = round1(next.warrantyCostPerQuarter * 0.65);
    next.defectCostPerQuarter = round1(next.defectCostPerQuarter * 0.55);
  }
  return next;
}

/**
 * Server side of a save: compares the steps a client reports against the stored components
 * and replays only the new steps, in order. Steps can't be undone, skipped or repeated, and
 * every figure comes from the rules above. Returns the new components and what the new steps cost.
 */
export function mergeQualityComponents(stored: QualityComponentState[] | undefined, incoming: unknown, quarter: number): { components: QualityComponentState[]; cost: number } {
  if (!Array.isArray(incoming)) throw new Error("qualityComponents must be a list.");
  const base = stored?.length ? stored : initialQualityComponents();
  let cost = 0;
  const components = initialQualityComponents().map((fresh) => {
    let current = base.find((c) => c.qcId === fresh.qcId) || fresh;
    const wanted: any = incoming.find((c: any) => c && c.qcId === fresh.qcId) || {};
    const steps: [QualityAction, boolean][] = [
      ["inspect", Boolean(wanted.inspectionActive) && !current.inspectionActive],
      ["study", Boolean(wanted.varianceStudyDone) && !current.varianceStudyDone],
      ["improve", Boolean(wanted.sourceActionStudyDone) && !current.sourceActionStudyDone]
    ];
    for (const [action, requested] of steps) {
      if (!requested) continue;
      const blocker = qualityActionBlocker(current, action);
      if (blocker) throw new Error(`${current.componentCategory}: ${blocker}`);
      cost += qualityActionCost(current, action);
      current = applyQualityAction(current, action, quarter);
    }
    return current;
  });
  return { components, cost };
}
