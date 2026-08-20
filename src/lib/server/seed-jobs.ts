import { getSql } from "@/lib/db";
import { toNum } from "@/lib/utils";
import { mapCatalog } from "./map";

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function seedSampleJobs(userId: string, customerIds: number[]) {
  const sql = await getSql();
  const catalogRows = await sql<Record<string, unknown>>`
    select * from catalog_items where user_id = ${userId}
  `;
  const catalog = catalogRows.map(mapCatalog);
  const byName = (needle: string) =>
    catalog.find((c) => c.name.toLowerCase().includes(needle.toLowerCase()));

  type Line = { needle: string; qty: number; fallbackName: string };
  type JobSeed = {
    number: string;
    name: string;
    customerIndex: number;
    site: string;
    status: string;
    bidDate: string | null;
    dueDate: string | null;
    notes: string;
    lines: Line[];
  };

  const jobs: JobSeed[] = [
    {
      number: "2026-001",
      name: "Lincoln Elementary reroof",
      customerIndex: 0,
      site: "1400 SE Lincoln St, Portland, OR",
      status: "estimating",
      bidDate: isoOffset(9),
      dueDate: isoOffset(9),
      notes: "Replace failing membrane with 24ga galvalume standing seam. Keep existing copper bays at entries.",
      lines: [
        { needle: "synthetic underlayment", qty: 4200, fallbackName: "Underlayment" },
        { needle: "ice & water", qty: 680, fallbackName: "Ice & water" },
        { needle: "24ga galvalume standing", qty: 4200, fallbackName: "Standing seam" },
        { needle: "drip edge", qty: 310, fallbackName: "Drip edge" },
        { needle: "step flashing", qty: 140, fallbackName: "Step flashing" },
        { needle: "counter flashing", qty: 96, fallbackName: "Counter flashing" },
        { needle: "6\" k-style", qty: 240, fallbackName: "Gutter" },
        { needle: "4x5 downspout", qty: 80, fallbackName: "Downspout" },
        { needle: "gutter hanger", qty: 120, fallbackName: "Hangers" },
        { needle: "chimney cricket", qty: 2, fallbackName: "Cricket" },
        { needle: "shop brake", qty: 16, fallbackName: "Shop fab" },
      ],
    },
    {
      number: "2026-002",
      name: "Harborview condos — copper bays",
      customerIndex: 1,
      site: "901 Alaskan Way, Seattle, WA",
      status: "bid_sent",
      bidDate: isoOffset(-4),
      dueDate: isoOffset(-4),
      notes: "Eight copper bay windows, half-round gutters, soldered valleys. Historic review comments attached.",
      lines: [
        { needle: "16oz copper standing", qty: 1860, fallbackName: "Copper standing seam" },
        { needle: "copper valley", qty: 210, fallbackName: "Copper valley" },
        { needle: "copper through-wall", qty: 160, fallbackName: "Through-wall" },
        { needle: "half-round copper", qty: 180, fallbackName: "Copper gutter" },
        { needle: "round copper downspout", qty: 64, fallbackName: "Copper DS" },
        { needle: "conductor head", qty: 8, fallbackName: "Leader heads" },
        { needle: "shop brake", qty: 40, fallbackName: "Shop fab" },
        { needle: "field install", qty: 120, fallbackName: "Field labor" },
      ],
    },
    {
      number: "2026-003",
      name: "Westside clinic coping",
      customerIndex: 2,
      site: "4550 SW Scholls Ferry Rd, Portland, OR",
      status: "won",
      bidDate: isoOffset(-21),
      dueDate: isoOffset(-21),
      notes: "Awarded. Prefinished charcoal coping on three roof levels. Color: Charcoal Metallic.",
      lines: [
        { needle: "prefinished coping", qty: 420, fallbackName: "Coping" },
        { needle: "coping cleat", qty: 420, fallbackName: "Cleat" },
        { needle: "counter flashing", qty: 80, fallbackName: "Counter" },
        { needle: "shop brake", qty: 12, fallbackName: "Shop fab" },
      ],
    },
    {
      number: "2026-004",
      name: "Old town zinc storefront",
      customerIndex: 3,
      site: "12 NW 1st Ave, Portland, OR",
      status: "lost",
      bidDate: isoOffset(-40),
      dueDate: isoOffset(-40),
      notes: "Lost to out-of-town zinc specialist. Keep relationship for copper work.",
      lines: [
        { needle: "rheinzink", qty: 920, fallbackName: "Zinc panels" },
        { needle: "22ga prefinished wall", qty: 340, fallbackName: "Wall panel" },
        { needle: "shop brake", qty: 28, fallbackName: "Shop fab" },
      ],
    },
    {
      number: "2026-005",
      name: "Cedar Ridge custom house",
      customerIndex: 0,
      site: "88 Cedar Ridge Rd, Lake Oswego, OR",
      status: "lead",
      bidDate: isoOffset(18),
      dueDate: isoOffset(18),
      notes: "Walkthrough scheduled. Mixed copper roof, zinc walls. Need field measure.",
      lines: [],
    },
  ];

  for (const job of jobs) {
    const customerId = customerIds[job.customerIndex] ?? null;
    const inserted = await sql<{ id: number }>`
      insert into jobs (
        user_id, customer_id, job_number, name, site_address, status,
        bid_date, due_date, notes
      ) values (
        ${userId}, ${customerId}, ${job.number}, ${job.name}, ${job.site}, ${job.status},
        ${job.bidDate}, ${job.dueDate}, ${job.notes}
      )
      returning id
    `;
    const jobId = toNum(inserted[0]?.id);
    let order = 0;
    for (const line of job.lines) {
      const cat = byName(line.needle);
      const description = cat?.name ?? line.fallbackName;
      await sql`
        insert into estimate_items (
          user_id, job_id, catalog_item_id, category, description, material, gauge,
          unit, quantity, waste_pct, material_unit_cost, labor_hours_per_unit, sort_order
        ) values (
          ${userId}, ${jobId}, ${cat?.id ?? null}, ${cat?.category ?? "other"},
          ${description}, ${cat?.material ?? "galvalume"}, ${cat?.gauge ?? ""},
          ${cat?.unit ?? "lf"}, ${line.qty}, ${cat?.wastePct ?? 10},
          ${cat?.materialUnitCost ?? 0}, ${cat?.laborHoursPerUnit ?? 0}, ${order}
        )
      `;
      order += 1;
    }
  }
}
