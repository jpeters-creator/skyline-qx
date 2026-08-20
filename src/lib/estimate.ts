import type {
  BidBreakdown,
  EstimateItem,
  LineCosts,
} from "./types";

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function lineCosts(
  item: Pick<
    EstimateItem,
    | "quantity"
    | "wastePct"
    | "materialUnitCost"
    | "laborHoursPerUnit"
  >,
  laborRate: number,
): LineCosts {
  const qty = Number.isFinite(item.quantity) ? item.quantity : 0;
  const waste = Number.isFinite(item.wastePct) ? item.wastePct : 0;
  const extQty = qty * (1 + waste / 100);
  const material = extQty * (item.materialUnitCost || 0);
  const laborHours = qty * (item.laborHoursPerUnit || 0);
  const labor = laborHours * (laborRate || 0);
  return {
    extQty: round2(extQty),
    material: round2(material),
    laborHours: round2(laborHours),
    labor: round2(labor),
    total: round2(material + labor),
  };
}

export function bidFromItems(
  items: Array<
    Pick<
      EstimateItem,
      "quantity" | "wastePct" | "materialUnitCost" | "laborHoursPerUnit"
    >
  >,
  job: { laborRate: number; overheadPct: number; profitPct: number; taxPct: number },
): BidBreakdown {
  let material = 0;
  let labor = 0;
  let laborHours = 0;
  for (const item of items) {
    const c = lineCosts(item, job.laborRate);
    material += c.material;
    labor += c.labor;
    laborHours += c.laborHours;
  }
  material = round2(material);
  labor = round2(labor);
  laborHours = round2(laborHours);
  const direct = round2(material + labor);
  const overhead = round2(direct * (job.overheadPct || 0) / 100);
  const profit = round2((direct + overhead) * (job.profitPct || 0) / 100);
  const pretax = round2(direct + overhead + profit);
  const tax = round2(pretax * (job.taxPct || 0) / 100);
  return {
    material,
    labor,
    laborHours,
    direct,
    overhead,
    profit,
    pretax,
    tax,
    total: round2(pretax + tax),
  };
}

export const EMPTY_BID: BidBreakdown = {
  material: 0,
  labor: 0,
  laborHours: 0,
  direct: 0,
  overhead: 0,
  profit: 0,
  pretax: 0,
  tax: 0,
  total: 0,
};
