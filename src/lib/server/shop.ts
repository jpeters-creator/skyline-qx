import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { toNum } from "@/lib/utils";
import {
  isCategory,
  isMaterial,
  isUnit,
  type CatalogItem,
  type Customer,
  type ShopSettings,
} from "@/lib/types";
import { defaultWasteForUnit } from "@/lib/units";
import { mapCatalog, mapCustomer, mapSettings } from "./map";
import { SEED_CATALOG, SEED_CUSTOMERS } from "./seed-data";
import { seedSampleJobs } from "./seed-jobs";

/**
 * Invite-only gate. If `shop_members` has any rows, the caller must match by
 * user_id or email. Empty table keeps preview / first-deploy bootstrap open.
 */
export async function assertShopMember(
  userId: string,
  email?: string | null,
): Promise<void> {
  const sql = await getSql();
  let countRows: { n: number }[];
  try {
    countRows = await sql<{ n: number }>`
      select count(*)::int as n from shop_members
    `;
  } catch {
    // Table not migrated yet (older preview) — allow through.
    return;
  }
  if (toNum(countRows[0]?.n) === 0) return;

  const byUser = await sql<{ id: number }>`
    select id from shop_members where user_id = ${userId} limit 1
  `;
  if (byUser[0]) return;

  if (email) {
    const byEmail = await sql<{ id: number }>`
      select id from shop_members
      where lower(email) = ${email.trim().toLowerCase()}
      limit 1
    `;
    if (byEmail[0]) {
      await sql`
        update shop_members set user_id = ${userId}
        where lower(email) = ${email.trim().toLowerCase()} and user_id is null
      `;
      return;
    }
  }

  throw new Error(
    "This shop is invite-only. Ask a Skyline admin to add your email to shop members.",
  );
}

export async function ensureShopReady(userId: string): Promise<ShopSettings> {
  const sql = await getSql();
  const existing = await sql<Record<string, unknown>>`
    select * from shop_settings where user_id = ${userId} limit 1
  `;
  if (existing[0]) {
    const settings = mapSettings(existing[0]);
    if (settings.hasSeeded) return settings;
    await seedForUser(userId);
    await sql`
      update shop_settings set has_seeded = true where user_id = ${userId}
    `;
    return { ...settings, hasSeeded: true };
  }
  await sql`
    insert into shop_settings (user_id) values (${userId})
    on conflict (user_id) do nothing
  `;
  await seedForUser(userId);
  await sql`
    update shop_settings set has_seeded = true where user_id = ${userId}
  `;
  const created = await sql<Record<string, unknown>>`
    select * from shop_settings where user_id = ${userId} limit 1
  `;
  return mapSettings(created[0] ?? { has_seeded: true });
}

async function seedForUser(userId: string) {
  const sql = await getSql();
  const existingCat = await sql<{ n: number }>`
    select count(*)::int as n from catalog_items where user_id = ${userId}
  `;
  if (toNum(existingCat[0]?.n) === 0) {
    for (const item of SEED_CATALOG) {
      await sql`
        insert into catalog_items (
          user_id, name, category, material, gauge, unit,
          material_unit_cost, labor_hours_per_unit, waste_pct, notes
        ) values (
          ${userId}, ${item.name}, ${item.category}, ${item.material},
          ${item.gauge}, ${item.unit}, ${item.materialUnitCost},
          ${item.laborHoursPerUnit}, ${item.wastePct}, ${item.notes}
        )
      `;
    }
  }
  const existingCust = await sql<{ n: number }>`
    select count(*)::int as n from customers where user_id = ${userId}
  `;
  const customerIds: number[] = [];
  if (toNum(existingCust[0]?.n) === 0) {
    for (const c of SEED_CUSTOMERS) {
      const rows = await sql<{ id: number }>`
        insert into customers (user_id, name, contact_name, email, phone, address)
        values (${userId}, ${c.name}, ${c.contactName}, ${c.email}, ${c.phone}, ${c.address})
        returning id
      `;
      customerIds.push(toNum(rows[0]?.id));
    }
  } else {
    const rows = await sql<{ id: number }>`
      select id from customers where user_id = ${userId} order by id
    `;
    for (const r of rows) customerIds.push(toNum(r.id));
  }
  const existingJobs = await sql<{ n: number }>`
    select count(*)::int as n from jobs where user_id = ${userId}
  `;
  if (toNum(existingJobs[0]?.n) === 0 && customerIds.length > 0) {
    await seedSampleJobs(userId, customerIds);
  }
}

export const bootstrapShop = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const settings = await ensureShopReady(context.userId);
    return { seeded: true as const, settings };
  });

export const getSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => ensureShopReady(context.userId));

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Partial<ShopSettings> & { companyName?: string }) => ({
    companyName: String(input.companyName ?? "My Shop").trim() || "My Shop",
    defaultLaborRate: toNum(input.defaultLaborRate, 92),
    defaultOverheadPct: toNum(input.defaultOverheadPct, 18),
    defaultProfitPct: toNum(input.defaultProfitPct, 12),
    defaultTaxPct: toNum(input.defaultTaxPct, 0),
    defaultWastePct: toNum(input.defaultWastePct, 10),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureShopReady(context.userId);
    await sql`
      update shop_settings set
        company_name = ${data.companyName},
        default_labor_rate = ${data.defaultLaborRate},
        default_overhead_pct = ${data.defaultOverheadPct},
        default_profit_pct = ${data.defaultProfitPct},
        default_tax_pct = ${data.defaultTaxPct},
        default_waste_pct = ${data.defaultWastePct}
      where user_id = ${context.userId}
    `;
    return ensureShopReady(context.userId);
  });

export const listCustomers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureShopReady(context.userId);
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from customers where user_id = ${context.userId} order by name asc
    `;
    return rows.map(mapCustomer);
  });

export const upsertCustomer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Partial<Customer> & { name: string }) => {
    const name = String(input.name ?? "").trim();
    if (!name) throw new Error("Customer name is required");
    return {
      id: input.id ? toNum(input.id) : null,
      name,
      contactName: String(input.contactName ?? "").trim(),
      email: String(input.email ?? "").trim(),
      phone: String(input.phone ?? "").trim(),
      address: String(input.address ?? "").trim(),
      notes: String(input.notes ?? "").trim(),
    };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (data.id) {
      const rows = await sql<Record<string, unknown>>`
        update customers set
          name = ${data.name},
          contact_name = ${data.contactName},
          email = ${data.email},
          phone = ${data.phone},
          address = ${data.address},
          notes = ${data.notes}
        where id = ${data.id} and user_id = ${context.userId}
        returning *
      `;
      if (!rows[0]) throw new Error("Customer not found");
      return mapCustomer(rows[0]);
    }
    const rows = await sql<Record<string, unknown>>`
      insert into customers (user_id, name, contact_name, email, phone, address, notes)
      values (${context.userId}, ${data.name}, ${data.contactName}, ${data.email}, ${data.phone}, ${data.address}, ${data.notes})
      returning *
    `;
    return mapCustomer(rows[0]!);
  });

export const deleteCustomer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => toNum(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`update jobs set customer_id = null where customer_id = ${id} and user_id = ${context.userId}`;
    await sql`delete from customers where id = ${id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const listCatalog = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureShopReady(context.userId);
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from catalog_items
      where user_id = ${context.userId} and archived = false
      order by category, name
    `;
    return rows.map(mapCatalog);
  });

export const upsertCatalogItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Partial<CatalogItem> & { name: string }) => {
    const name = String(input.name ?? "").trim();
    if (!name) throw new Error("Item name is required");
    const category = String(input.category ?? "other");
    const material = String(input.material ?? "galvalume");
    const unit = String(input.unit ?? "lf");
    const resolvedUnit = isUnit(unit) ? unit : "lf";
    return {
      id: input.id ? toNum(input.id) : null,
      name,
      category: isCategory(category) ? category : "other",
      material: isMaterial(material) ? material : "galvalume",
      gauge: String(input.gauge ?? "").trim(),
      unit: resolvedUnit,
      materialUnitCost: toNum(input.materialUnitCost),
      laborHoursPerUnit: toNum(input.laborHoursPerUnit),
      wastePct:
        input.wastePct != null
          ? toNum(input.wastePct, 10)
          : defaultWasteForUnit(resolvedUnit),
      notes: String(input.notes ?? "").trim(),
    };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (data.id) {
      const rows = await sql<Record<string, unknown>>`
        update catalog_items set
          name = ${data.name},
          category = ${data.category},
          material = ${data.material},
          gauge = ${data.gauge},
          unit = ${data.unit},
          material_unit_cost = ${data.materialUnitCost},
          labor_hours_per_unit = ${data.laborHoursPerUnit},
          waste_pct = ${data.wastePct},
          notes = ${data.notes}
        where id = ${data.id} and user_id = ${context.userId}
        returning *
      `;
      if (!rows[0]) throw new Error("Catalog item not found");
      return mapCatalog(rows[0]);
    }
    const rows = await sql<Record<string, unknown>>`
      insert into catalog_items (
        user_id, name, category, material, gauge, unit,
        material_unit_cost, labor_hours_per_unit, waste_pct, notes
      ) values (
        ${context.userId}, ${data.name}, ${data.category}, ${data.material},
        ${data.gauge}, ${data.unit}, ${data.materialUnitCost},
        ${data.laborHoursPerUnit}, ${data.wastePct}, ${data.notes}
      )
      returning *
    `;
    return mapCatalog(rows[0]!);
  });

export const archiveCatalogItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => toNum(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`
      update catalog_items set archived = true
      where id = ${id} and user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

/** List invitees. Empty list means the shop is open (no gate). */
export const listShopMembers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureShopReady(context.userId);
    const sql = await getSql();
    try {
      return await sql<
        { id: number; email: string; user_id: string | null; role: string }
      >`
        select id, email, user_id, role from shop_members
        order by lower(email)
      `;
    } catch {
      return [];
    }
  });

export const inviteShopMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { email: string; role?: string }) => {
    const email = String(input.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) throw new Error("Valid email required");
    return {
      email,
      role: String(input.role ?? "estimator").trim() || "estimator",
    };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureShopReady(context.userId);
    await sql`
      insert into shop_members (email, role, invited_by)
      values (${data.email}, ${data.role}, ${context.userId})
      on conflict do nothing
    `;
    // unique index is on lower(email) — use upsert via select+insert if conflict no-op
    const existing = await sql<{ id: number }>`
      select id from shop_members where lower(email) = ${data.email} limit 1
    `;
    if (!existing[0]) {
      await sql`
        insert into shop_members (email, role, invited_by)
        values (${data.email}, ${data.role}, ${context.userId})
      `;
    }
    return { ok: true as const, email: data.email };
  });
