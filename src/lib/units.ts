import type { Unit } from "./types";

/**
 * Shop-default waste % by unit. Sheet goods (SF/SQ) need more scrap than
 * counted pieces (EA) or pure labor (HR).
 */
export const DEFAULT_WASTE_BY_UNIT: Record<Unit, number> = {
  sf: 10,
  sq: 10,
  lf: 8,
  ea: 5,
  hr: 0,
  lb: 5,
};

export function defaultWasteForUnit(unit: Unit, shopDefault?: number): number {
  if (unit === "hr") return 0;
  if (shopDefault != null && Number.isFinite(shopDefault)) return shopDefault;
  return DEFAULT_WASTE_BY_UNIT[unit] ?? 10;
}

/** Units the price book and takeoff lines actually use in the field. */
export const PRIMARY_UNITS: Unit[] = ["sf", "lf", "ea", "hr", "sq", "lb"];
