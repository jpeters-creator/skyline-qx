import { bidFromItems } from "@/lib/estimate";
import { toNum } from "@/lib/utils";
import {
  isCategory,
  isJobStatus,
  isMaterial,
  isUnit,
  type BidBreakdown,
  type CatalogItem,
  type Category,
  type Customer,
  type EstimateItem,
  type Job,
  type JobListItem,
  type JobStatus,
  type Material,
  type ShopSettings,
  type Unit,
} from "@/lib/types";

function asCategory(v: unknown): Category {
  const s = String(v ?? "");
  return isCategory(s) ? s : "other";
}
function asMaterial(v: unknown): Material {
  const s = String(v ?? "");
  return isMaterial(s) ? s : "galvalume";
}
function asUnit(v: unknown): Unit {
  const s = String(v ?? "");
  return isUnit(s) ? s : "lf";
}
function asStatus(v: unknown): JobStatus {
  const s = String(v ?? "");
  return isJobStatus(s) ? s : "estimating";
}
function asDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = String(v);
  return s.slice(0, 10);
}
function asTs(v: unknown): string {
  if (v == null) return new Date().toISOString();
  return String(v);
}

export function mapSettings(row: Record<string, unknown>): ShopSettings {
  return {
    companyName: String(row.company_name ?? "My Shop"),
    defaultLaborRate: toNum(row.default_labor_rate, 92),
    defaultOverheadPct: toNum(row.default_overhead_pct, 18),
    defaultProfitPct: toNum(row.default_profit_pct, 12),
    defaultTaxPct: toNum(row.default_tax_pct, 0),
    defaultWastePct: toNum(row.default_waste_pct, 10),
    hasSeeded: Boolean(row.has_seeded),
  };
}

export function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: toNum(row.id),
    name: String(row.name ?? ""),
    contactName: String(row.contact_name ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    address: String(row.address ?? ""),
    notes: String(row.notes ?? ""),
    createdAt: asTs(row.created_at),
  };
}

export function mapCatalog(row: Record<string, unknown>): CatalogItem {
  return {
    id: toNum(row.id),
    name: String(row.name ?? ""),
    category: asCategory(row.category),
    material: asMaterial(row.material),
    gauge: String(row.gauge ?? ""),
    unit: asUnit(row.unit),
    materialUnitCost: toNum(row.material_unit_cost),
    laborHoursPerUnit: toNum(row.labor_hours_per_unit),
    wastePct: toNum(row.waste_pct, 10),
    notes: String(row.notes ?? ""),
    archived: Boolean(row.archived),
  };
}

export function mapJob(row: Record<string, unknown>): Job {
  return {
    id: toNum(row.id),
    customerId: row.customer_id == null ? null : toNum(row.customer_id),
    jobNumber: String(row.job_number ?? ""),
    name: String(row.name ?? ""),
    siteAddress: String(row.site_address ?? ""),
    status: asStatus(row.status),
    bidDate: asDate(row.bid_date),
    dueDate: asDate(row.due_date),
    laborRate: toNum(row.labor_rate, 92),
    overheadPct: toNum(row.overhead_pct, 18),
    profitPct: toNum(row.profit_pct, 12),
    taxPct: toNum(row.tax_pct, 0),
    notes: String(row.notes ?? ""),
    createdAt: asTs(row.created_at),
    updatedAt: asTs(row.updated_at),
  };
}

export function mapItem(row: Record<string, unknown>): EstimateItem {
  return {
    id: toNum(row.id),
    jobId: toNum(row.job_id),
    catalogItemId: row.catalog_item_id == null ? null : toNum(row.catalog_item_id),
    category: asCategory(row.category),
    description: String(row.description ?? ""),
    material: asMaterial(row.material),
    gauge: String(row.gauge ?? ""),
    unit: asUnit(row.unit),
    quantity: toNum(row.quantity),
    wastePct: toNum(row.waste_pct, 10),
    materialUnitCost: toNum(row.material_unit_cost),
    laborHoursPerUnit: toNum(row.labor_hours_per_unit),
    sortOrder: toNum(row.sort_order),
    notes: String(row.notes ?? ""),
  };
}

export function jobWithBid(
  job: Job,
  items: EstimateItem[],
  extra: { customerName: string | null; itemCount: number },
): JobListItem {
  const bid: BidBreakdown = bidFromItems(items, job);
  return { ...job, ...extra, bid };
}
