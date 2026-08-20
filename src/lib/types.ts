export const JOB_STATUSES = [
  "lead",
  "estimating",
  "bid_sent",
  "won",
  "lost",
  "in_progress",
  "complete",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const CATEGORIES = [
  "roofing",
  "flashing",
  "gutter",
  "coping",
  "wall_panel",
  "custom",
  "labor",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const MATERIALS = [
  "galvalume",
  "prepainted_steel",
  "aluminum",
  "copper",
  "zinc",
  "stainless",
  "lead_coated_copper",
  "none",
] as const;

export type Material = (typeof MATERIALS)[number];

export const UNITS = ["lf", "sf", "sq", "ea", "hr", "lb"] as const;
export type Unit = (typeof UNITS)[number];

export const STATUS_LABEL: Record<JobStatus, string> = {
  lead: "Lead",
  estimating: "Estimating",
  bid_sent: "Bid sent",
  won: "Won",
  lost: "Lost",
  in_progress: "In progress",
  complete: "Complete",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  roofing: "Roofing",
  flashing: "Flashing",
  gutter: "Gutters",
  coping: "Coping",
  wall_panel: "Wall panels",
  custom: "Custom fab",
  labor: "Labor",
  other: "Other",
};

export const MATERIAL_LABEL: Record<Material, string> = {
  galvalume: "Galvalume",
  prepainted_steel: "Prefinished steel",
  aluminum: "Aluminum",
  copper: "Copper",
  zinc: "Zinc",
  stainless: "Stainless",
  lead_coated_copper: "Lead-coated copper",
  none: "—",
};

export const UNIT_LABEL: Record<Unit, string> = {
  lf: "LF",
  sf: "SF",
  sq: "SQ",
  ea: "EA",
  hr: "HR",
  lb: "LB",
};

export function isJobStatus(v: string): v is JobStatus {
  return (JOB_STATUSES as readonly string[]).includes(v);
}
export function isCategory(v: string): v is Category {
  return (CATEGORIES as readonly string[]).includes(v);
}
export function isMaterial(v: string): v is Material {
  return (MATERIALS as readonly string[]).includes(v);
}
export function isUnit(v: string): v is Unit {
  return (UNITS as readonly string[]).includes(v);
}

export type ShopSettings = {
  companyName: string;
  defaultLaborRate: number;
  defaultOverheadPct: number;
  defaultProfitPct: number;
  defaultTaxPct: number;
  defaultWastePct: number;
  hasSeeded: boolean;
};

export type Customer = {
  id: number;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: string;
};

export type CatalogItem = {
  id: number;
  name: string;
  category: Category;
  material: Material;
  gauge: string;
  unit: Unit;
  materialUnitCost: number;
  laborHoursPerUnit: number;
  wastePct: number;
  notes: string;
  archived: boolean;
};

export type EstimateItem = {
  id: number;
  jobId: number;
  catalogItemId: number | null;
  category: Category;
  description: string;
  material: Material;
  gauge: string;
  unit: Unit;
  quantity: number;
  wastePct: number;
  materialUnitCost: number;
  laborHoursPerUnit: number;
  sortOrder: number;
  notes: string;
};

export type Job = {
  id: number;
  customerId: number | null;
  jobNumber: string;
  name: string;
  siteAddress: string;
  status: JobStatus;
  bidDate: string | null;
  dueDate: string | null;
  laborRate: number;
  overheadPct: number;
  profitPct: number;
  taxPct: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type BidBreakdown = {
  material: number;
  labor: number;
  laborHours: number;
  direct: number;
  overhead: number;
  profit: number;
  pretax: number;
  tax: number;
  total: number;
};

export type JobListItem = Job & {
  customerName: string | null;
  itemCount: number;
  bid: BidBreakdown;
};

export type LineCosts = {
  extQty: number;
  material: number;
  laborHours: number;
  labor: number;
  total: number;
};

export type TakeoffProposal = {
  catalogItemId: number | null;
  description: string;
  category: Category;
  material: Material;
  gauge: string;
  unit: Unit;
  quantity: number;
  wastePct: number;
  materialUnitCost: number;
  laborHoursPerUnit: number;
  notes: string;
};
