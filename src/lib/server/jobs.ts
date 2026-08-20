import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { bidFromItems } from "@/lib/estimate";
import { toNum } from "@/lib/utils";
import {
  isCategory,
  isJobStatus,
  isMaterial,
  isUnit,
  type BidBreakdown,
  type CatalogItem,
  type Customer,
  type EstimateItem,
  type Job,
  type JobListItem,
  type JobStatus,
} from "@/lib/types";
import { jobWithBid, mapCatalog, mapCustomer, mapItem, mapJob, mapSettings } from "./map";
import { ensureShopReady } from "./shop";

async function nextJobNumber(userId: string): Promise<string> {
  const sql = await getSql();
  const year = new Date().getFullYear();
  const prefix = `${year}-`;
  const rows = await sql<{ job_number: string }>`
    select job_number from jobs
    where user_id = ${userId} and job_number like ${prefix + "%"}
  `;
  let max = 0;
  for (const r of rows) {
    const n = parseInt(String(r.job_number).slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${year}-${String(max + 1).padStart(3, "0")}`;
}

async function loadJobItems(userId: string, jobId: number): Promise<EstimateItem[]> {
  const sql = await getSql();
  const rows = await sql<Record<string, unknown>>`
    select * from estimate_items
    where user_id = ${userId} and job_id = ${jobId}
    order by sort_order, id
  `;
  return rows.map(mapItem);
}

async function loadJobOrThrow(userId: string, jobId: number): Promise<Job> {
  const sql = await getSql();
  const rows = await sql<Record<string, unknown>>`
    select * from jobs where id = ${jobId} and user_id = ${userId} limit 1
  `;
  if (!rows[0]) throw new Error("Job not found");
  return mapJob(rows[0]);
}

async function loadAllJobs(userId: string): Promise<JobListItem[]> {
  const sql = await getSql();
  const jobRows = await sql<Record<string, unknown>>`
    select j.*, c.name as customer_name
    from jobs j
    left join customers c on c.id = j.customer_id
    where j.user_id = ${userId}
    order by j.updated_at desc, j.id desc
  `;
  const itemRows = await sql<Record<string, unknown>>`
    select * from estimate_items where user_id = ${userId}
  `;
  const itemsByJob = new Map<number, EstimateItem[]>();
  for (const row of itemRows) {
    const item = mapItem(row);
    const list = itemsByJob.get(item.jobId) ?? [];
    list.push(item);
    itemsByJob.set(item.jobId, list);
  }
  return jobRows.map((row) => {
    const job = mapJob(row);
    const items = itemsByJob.get(job.id) ?? [];
    return jobWithBid(job, items, {
      customerName: row.customer_name == null ? null : String(row.customer_name),
      itemCount: items.length,
    });
  });
}

export const listJobs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureShopReady(context.userId);
    return loadAllJobs(context.userId);
  });

export type DashboardData = {
  jobs: JobListItem[];
  pipelineValue: number;
  awardedYtd: number;
  openCount: number;
  winRate: number;
  wonCount: number;
  lostCount: number;
  byStatus: { status: JobStatus; count: number; value: number }[];
};

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DashboardData> => {
    await ensureShopReady(context.userId);
    const list = await loadAllJobs(context.userId);
    const openStatuses = new Set(["lead", "estimating", "bid_sent"]);
    const year = new Date().getFullYear();
    let pipelineValue = 0;
    let awardedYtd = 0;
    let openCount = 0;
    let wonCount = 0;
    let lostCount = 0;
    const byStatusMap = new Map<JobStatus, { count: number; value: number }>();

    for (const job of list) {
      const slot = byStatusMap.get(job.status) ?? { count: 0, value: 0 };
      slot.count += 1;
      slot.value += job.bid.total;
      byStatusMap.set(job.status, slot);
      if (openStatuses.has(job.status)) {
        pipelineValue += job.bid.total;
        openCount += 1;
      }
      if (job.status === "won" || job.status === "in_progress" || job.status === "complete") {
        const y = job.bidDate ? Number(job.bidDate.slice(0, 4)) : year;
        if (y === year) awardedYtd += job.bid.total;
        wonCount += 1;
      }
      if (job.status === "lost") lostCount += 1;
    }

    const decided = wonCount + lostCount;
    const winRate = decided === 0 ? 0 : (wonCount / decided) * 100;

    const byStatus = (
      [
        "lead",
        "estimating",
        "bid_sent",
        "won",
        "lost",
        "in_progress",
        "complete",
      ] as JobStatus[]
    ).map((status) => ({
      status,
      count: byStatusMap.get(status)?.count ?? 0,
      value: byStatusMap.get(status)?.value ?? 0,
    }));

    return {
      jobs: list,
      pipelineValue,
      awardedYtd,
      openCount,
      winRate,
      wonCount,
      lostCount,
      byStatus,
    };
  });

export type JobDetail = {
  job: Job;
  customer: Customer | null;
  items: EstimateItem[];
  bid: BidBreakdown;
  catalog: CatalogItem[];
};

export const getJob = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: number) => toNum(id))
  .handler(async ({ context, data: id }): Promise<JobDetail> => {
    const sql = await getSql();
    const job = await loadJobOrThrow(context.userId, id);
    const items = await loadJobItems(context.userId, id);
    let customer: Customer | null = null;
    if (job.customerId) {
      const cRows = await sql<Record<string, unknown>>`
        select * from customers where id = ${job.customerId} and user_id = ${context.userId} limit 1
      `;
      if (cRows[0]) customer = mapCustomer(cRows[0]);
    }
    const catRows = await sql<Record<string, unknown>>`
      select * from catalog_items
      where user_id = ${context.userId} and archived = false
      order by category, name
    `;
    return {
      job,
      customer,
      items,
      bid: bidFromItems(items, job),
      catalog: catRows.map(mapCatalog),
    };
  });

export const createJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    name: string;
    customerId?: number | null;
    siteAddress?: string;
    bidDate?: string | null;
    notes?: string;
  }) => {
    const name = String(input.name ?? "").trim();
    if (!name) throw new Error("Project name is required");
    return {
      name,
      customerId: input.customerId ? toNum(input.customerId) : null,
      siteAddress: String(input.siteAddress ?? "").trim(),
      bidDate: input.bidDate ? String(input.bidDate).slice(0, 10) : null,
      notes: String(input.notes ?? "").trim(),
    };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureShopReady(context.userId);
    const settingsRows = await sql<Record<string, unknown>>`
      select * from shop_settings where user_id = ${context.userId} limit 1
    `;
    const settings = mapSettings(settingsRows[0] ?? {});
    const number = await nextJobNumber(context.userId);
    const rows = await sql<Record<string, unknown>>`
      insert into jobs (
        user_id, customer_id, job_number, name, site_address, status,
        bid_date, due_date, labor_rate, overhead_pct, profit_pct, tax_pct, notes
      ) values (
        ${context.userId}, ${data.customerId}, ${number}, ${data.name}, ${data.siteAddress},
        'estimating', ${data.bidDate}, ${data.bidDate},
        ${settings.defaultLaborRate}, ${settings.defaultOverheadPct},
        ${settings.defaultProfitPct}, ${settings.defaultTaxPct}, ${data.notes}
      )
      returning *
    `;
    return mapJob(rows[0]!);
  });

export const updateJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Partial<Job> & { id: number }) => {
    const status = input.status ? String(input.status) : undefined;
    return {
      id: toNum(input.id),
      name: input.name != null ? String(input.name).trim() : undefined,
      customerId:
        input.customerId === undefined
          ? undefined
          : input.customerId == null
            ? null
            : toNum(input.customerId),
      siteAddress:
        input.siteAddress != null ? String(input.siteAddress) : undefined,
      status: status && isJobStatus(status) ? status : undefined,
      bidDate:
        input.bidDate === undefined
          ? undefined
          : input.bidDate
            ? String(input.bidDate).slice(0, 10)
            : null,
      dueDate:
        input.dueDate === undefined
          ? undefined
          : input.dueDate
            ? String(input.dueDate).slice(0, 10)
            : null,
      laborRate: input.laborRate != null ? toNum(input.laborRate) : undefined,
      overheadPct:
        input.overheadPct != null ? toNum(input.overheadPct) : undefined,
      profitPct: input.profitPct != null ? toNum(input.profitPct) : undefined,
      taxPct: input.taxPct != null ? toNum(input.taxPct) : undefined,
      notes: input.notes != null ? String(input.notes) : undefined,
    };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const current = await loadJobOrThrow(context.userId, data.id);
    const next = {
      name: data.name ?? current.name,
      customerId: data.customerId === undefined ? current.customerId : data.customerId,
      siteAddress: data.siteAddress ?? current.siteAddress,
      status: data.status ?? current.status,
      bidDate: data.bidDate === undefined ? current.bidDate : data.bidDate,
      dueDate: data.dueDate === undefined ? current.dueDate : data.dueDate,
      laborRate: data.laborRate ?? current.laborRate,
      overheadPct: data.overheadPct ?? current.overheadPct,
      profitPct: data.profitPct ?? current.profitPct,
      taxPct: data.taxPct ?? current.taxPct,
      notes: data.notes ?? current.notes,
    };
    const rows = await sql<Record<string, unknown>>`
      update jobs set
        name = ${next.name},
        customer_id = ${next.customerId},
        site_address = ${next.siteAddress},
        status = ${next.status},
        bid_date = ${next.bidDate},
        due_date = ${next.dueDate},
        labor_rate = ${next.laborRate},
        overhead_pct = ${next.overheadPct},
        profit_pct = ${next.profitPct},
        tax_pct = ${next.taxPct},
        notes = ${next.notes},
        updated_at = now()
      where id = ${data.id} and user_id = ${context.userId}
      returning *
    `;
    return mapJob(rows[0]!);
  });

export const deleteJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => toNum(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from estimate_items where job_id = ${id} and user_id = ${context.userId}`;
    await sql`delete from jobs where id = ${id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const duplicateJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => toNum(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const job = await loadJobOrThrow(context.userId, id);
    const items = await loadJobItems(context.userId, id);
    const number = await nextJobNumber(context.userId);
    const rows = await sql<Record<string, unknown>>`
      insert into jobs (
        user_id, customer_id, job_number, name, site_address, status,
        bid_date, due_date, labor_rate, overhead_pct, profit_pct, tax_pct, notes
      ) values (
        ${context.userId}, ${job.customerId}, ${number}, ${job.name + " (copy)"},
        ${job.siteAddress}, 'estimating', ${job.bidDate}, ${job.dueDate},
        ${job.laborRate}, ${job.overheadPct}, ${job.profitPct}, ${job.taxPct}, ${job.notes}
      )
      returning *
    `;
    const copy = mapJob(rows[0]!);
    for (const item of items) {
      await sql`
        insert into estimate_items (
          user_id, job_id, catalog_item_id, category, description, material, gauge,
          unit, quantity, waste_pct, material_unit_cost, labor_hours_per_unit, sort_order, notes
        ) values (
          ${context.userId}, ${copy.id}, ${item.catalogItemId}, ${item.category},
          ${item.description}, ${item.material}, ${item.gauge}, ${item.unit},
          ${item.quantity}, ${item.wastePct}, ${item.materialUnitCost},
          ${item.laborHoursPerUnit}, ${item.sortOrder}, ${item.notes}
        )
      `;
    }
    return copy;
  });

export const addEstimateItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    jobId: number;
    catalogItemId?: number | null;
    description?: string;
    category?: string;
    material?: string;
    gauge?: string;
    unit?: string;
    quantity?: number;
    wastePct?: number;
    materialUnitCost?: number;
    laborHoursPerUnit?: number;
  }) => ({
    jobId: toNum(input.jobId),
    catalogItemId: input.catalogItemId ? toNum(input.catalogItemId) : null,
    description: input.description ? String(input.description) : "",
    category: input.category ? String(input.category) : "",
    material: input.material ? String(input.material) : "",
    gauge: input.gauge ? String(input.gauge) : "",
    unit: input.unit ? String(input.unit) : "",
    quantity: toNum(input.quantity, 1),
    wastePct: input.wastePct != null ? toNum(input.wastePct) : null,
    materialUnitCost:
      input.materialUnitCost != null ? toNum(input.materialUnitCost) : null,
    laborHoursPerUnit:
      input.laborHoursPerUnit != null ? toNum(input.laborHoursPerUnit) : null,
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await loadJobOrThrow(context.userId, data.jobId);
    let catalog: CatalogItem | null = null;
    if (data.catalogItemId) {
      const rows = await sql<Record<string, unknown>>`
        select * from catalog_items
        where id = ${data.catalogItemId} and user_id = ${context.userId}
        limit 1
      `;
      if (rows[0]) catalog = mapCatalog(rows[0]);
    }
    const settingsRows = await sql<Record<string, unknown>>`
      select * from shop_settings where user_id = ${context.userId} limit 1
    `;
    const settings = mapSettings(settingsRows[0] ?? {});
    const maxRows = await sql<{ m: number }>`
      select coalesce(max(sort_order), -1) as m from estimate_items
      where job_id = ${data.jobId} and user_id = ${context.userId}
    `;
    const sortOrder = toNum(maxRows[0]?.m) + 1;
    const categoryRaw = data.category || catalog?.category || "other";
    const materialRaw = data.material || catalog?.material || "galvalume";
    const unitRaw = data.unit || catalog?.unit || "lf";
    const rows = await sql<Record<string, unknown>>`
      insert into estimate_items (
        user_id, job_id, catalog_item_id, category, description, material, gauge,
        unit, quantity, waste_pct, material_unit_cost, labor_hours_per_unit, sort_order
      ) values (
        ${context.userId}, ${data.jobId}, ${data.catalogItemId},
        ${isCategory(categoryRaw) ? categoryRaw : "other"},
        ${data.description || catalog?.name || "New line"},
        ${isMaterial(materialRaw) ? materialRaw : "galvalume"},
        ${data.gauge || catalog?.gauge || ""},
        ${isUnit(unitRaw) ? unitRaw : "lf"},
        ${data.quantity},
        ${data.wastePct ?? catalog?.wastePct ?? settings.defaultWastePct},
        ${data.materialUnitCost ?? catalog?.materialUnitCost ?? 0},
        ${data.laborHoursPerUnit ?? catalog?.laborHoursPerUnit ?? 0},
        ${sortOrder}
      )
      returning *
    `;
    return mapItem(rows[0]!);
  });

export const updateEstimateItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Partial<EstimateItem> & { id: number }) => {
    const category = input.category ? String(input.category) : undefined;
    const material = input.material ? String(input.material) : undefined;
    const unit = input.unit ? String(input.unit) : undefined;
    return {
      id: toNum(input.id),
      description:
        input.description != null ? String(input.description) : undefined,
      category: category && isCategory(category) ? category : undefined,
      material: material && isMaterial(material) ? material : undefined,
      gauge: input.gauge != null ? String(input.gauge) : undefined,
      unit: unit && isUnit(unit) ? unit : undefined,
      quantity: input.quantity != null ? toNum(input.quantity) : undefined,
      wastePct: input.wastePct != null ? toNum(input.wastePct) : undefined,
      materialUnitCost:
        input.materialUnitCost != null ? toNum(input.materialUnitCost) : undefined,
      laborHoursPerUnit:
        input.laborHoursPerUnit != null
          ? toNum(input.laborHoursPerUnit)
          : undefined,
      notes: input.notes != null ? String(input.notes) : undefined,
    };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const currentRows = await sql<Record<string, unknown>>`
      select * from estimate_items where id = ${data.id} and user_id = ${context.userId} limit 1
    `;
    if (!currentRows[0]) throw new Error("Line not found");
    const current = mapItem(currentRows[0]);
    const next = {
      description: data.description ?? current.description,
      category: data.category ?? current.category,
      material: data.material ?? current.material,
      gauge: data.gauge ?? current.gauge,
      unit: data.unit ?? current.unit,
      quantity: data.quantity ?? current.quantity,
      wastePct: data.wastePct ?? current.wastePct,
      materialUnitCost: data.materialUnitCost ?? current.materialUnitCost,
      laborHoursPerUnit: data.laborHoursPerUnit ?? current.laborHoursPerUnit,
      notes: data.notes ?? current.notes,
    };
    const rows = await sql<Record<string, unknown>>`
      update estimate_items set
        description = ${next.description},
        category = ${next.category},
        material = ${next.material},
        gauge = ${next.gauge},
        unit = ${next.unit},
        quantity = ${next.quantity},
        waste_pct = ${next.wastePct},
        material_unit_cost = ${next.materialUnitCost},
        labor_hours_per_unit = ${next.laborHoursPerUnit},
        notes = ${next.notes}
      where id = ${data.id} and user_id = ${context.userId}
      returning *
    `;
    await sql`update jobs set updated_at = now() where id = ${current.jobId} and user_id = ${context.userId}`;
    return mapItem(rows[0]!);
  });

export const deleteEstimateItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => toNum(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from estimate_items where id = ${id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const addProposedItems = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      jobId: number;
      items: Array<{
        catalogItemId?: number | null;
        description: string;
        category: string;
        material: string;
        gauge: string;
        unit: string;
        quantity: number;
        wastePct: number;
        materialUnitCost: number;
        laborHoursPerUnit: number;
        notes?: string;
      }>;
    }) => ({
      jobId: toNum(input.jobId),
      items: (input.items ?? []).map((item) => ({
        catalogItemId: item.catalogItemId ? toNum(item.catalogItemId) : null,
        description: String(item.description ?? "Line"),
        category: isCategory(String(item.category)) ? item.category : "other",
        material: isMaterial(String(item.material)) ? item.material : "galvalume",
        gauge: String(item.gauge ?? ""),
        unit: isUnit(String(item.unit)) ? item.unit : "lf",
        quantity: toNum(item.quantity),
        wastePct: toNum(item.wastePct, 10),
        materialUnitCost: toNum(item.materialUnitCost),
        laborHoursPerUnit: toNum(item.laborHoursPerUnit),
        notes: String(item.notes ?? ""),
      })),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await loadJobOrThrow(context.userId, data.jobId);
    const maxRows = await sql<{ m: number }>`
      select coalesce(max(sort_order), -1) as m from estimate_items
      where job_id = ${data.jobId} and user_id = ${context.userId}
    `;
    let sort = toNum(maxRows[0]?.m) + 1;
    const created: EstimateItem[] = [];
    for (const item of data.items) {
      const rows = await sql<Record<string, unknown>>`
        insert into estimate_items (
          user_id, job_id, catalog_item_id, category, description, material, gauge,
          unit, quantity, waste_pct, material_unit_cost, labor_hours_per_unit, sort_order, notes
        ) values (
          ${context.userId}, ${data.jobId}, ${item.catalogItemId}, ${item.category},
          ${item.description}, ${item.material}, ${item.gauge}, ${item.unit},
          ${item.quantity}, ${item.wastePct}, ${item.materialUnitCost},
          ${item.laborHoursPerUnit}, ${sort}, ${item.notes}
        )
        returning *
      `;
      created.push(mapItem(rows[0]!));
      sort += 1;
    }
    return created;
  });
