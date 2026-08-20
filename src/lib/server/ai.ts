import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { toNum } from "@/lib/utils";
import {
  isCategory,
  isMaterial,
  isUnit,
  type TakeoffProposal,
} from "@/lib/types";
import { mapCatalog, mapJob } from "./map";

export const draftTakeoff = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { jobId: number; notes: string }) => ({
    jobId: toNum(input.jobId),
    notes: String(input.notes ?? "").trim().slice(0, 4000),
  }))
  .handler(async ({ context, data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI takeoff is not available in this environment." };
    }
    if (!data.notes) {
      return { ok: false as const, error: "Describe the scope first." };
    }

    const sql = await getSql();
    const jobRows = await sql<Record<string, unknown>>`
      select * from jobs where id = ${data.jobId} and user_id = ${context.userId} limit 1
    `;
    if (!jobRows[0]) return { ok: false as const, error: "Job not found" };
    const job = mapJob(jobRows[0]);
    const catRows = await sql<Record<string, unknown>>`
      select * from catalog_items
      where user_id = ${context.userId} and archived = false
    `;
    const catalog = catRows.map(mapCatalog);
    const book = catalog.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      material: c.material,
      gauge: c.gauge,
      unit: c.unit,
      materialUnitCost: c.materialUnitCost,
      laborHoursPerUnit: c.laborHoursPerUnit,
      wastePct: c.wastePct,
    }));

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 1800,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are a senior architectural sheet metal estimator in the Pacific Northwest. Return ONLY valid JSON. No markdown.",
          },
          {
            role: "user",
            content: `Propose a takeoff for this job using the shop price book when a line matches.

Job: ${job.jobNumber} ${job.name}
Site: ${job.siteAddress}
Existing notes: ${job.notes}
Estimator notes: ${data.notes}

Price book (JSON): ${JSON.stringify(book)}

Respond with: {"items":[{"catalogItemId": number|null, "description": string, "category": "roofing"|"flashing"|"gutter"|"coping"|"wall_panel"|"custom"|"labor"|"other", "material": "galvalume"|"prepainted_steel"|"aluminum"|"copper"|"zinc"|"stainless"|"lead_coated_copper"|"none", "gauge": string, "unit": "lf"|"sf"|"sq"|"ea"|"hr"|"lb", "quantity": number, "wastePct": number, "materialUnitCost": number, "laborHoursPerUnit": number, "notes": string}]}

Rules:
- Prefer matching catalogItemId and copy its costs, unit, material, gauge.
- Quantities should be realistic for the described scope.
- Include underlayment, waste, flashings, and shop labor when relevant.
- 8–16 lines, not more.
- If a catalog match exists, set catalogItemId to that id.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      return { ok: false as const, error: `AI request failed (${res.status})` };
    }
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = body.choices?.[0]?.message?.content ?? "";
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) {
      return { ok: false as const, error: "Could not parse a takeoff from the model." };
    }
    let parsed: { items?: unknown[] };
    try {
      parsed = JSON.parse(text.slice(start, end + 1)) as { items?: unknown[] };
    } catch {
      return { ok: false as const, error: "Could not parse a takeoff from the model." };
    }
    const items: TakeoffProposal[] = [];
    for (const raw of parsed.items ?? []) {
      if (!raw || typeof raw !== "object") continue;
      const r = raw as Record<string, unknown>;
      const catalogItemId = r.catalogItemId == null ? null : toNum(r.catalogItemId);
      const matched = catalogItemId
        ? catalog.find((c) => c.id === catalogItemId)
        : undefined;
      const category = String(r.category ?? matched?.category ?? "other");
      const material = String(r.material ?? matched?.material ?? "galvalume");
      const unit = String(r.unit ?? matched?.unit ?? "lf");
      items.push({
        catalogItemId: matched ? matched.id : null,
        description: String(r.description ?? matched?.name ?? "Line"),
        category: isCategory(category) ? category : "other",
        material: isMaterial(material) ? material : "galvalume",
        gauge: String(r.gauge ?? matched?.gauge ?? ""),
        unit: isUnit(unit) ? unit : "lf",
        quantity: toNum(r.quantity),
        wastePct: toNum(r.wastePct, matched?.wastePct ?? 10),
        materialUnitCost: toNum(
          r.materialUnitCost,
          matched?.materialUnitCost ?? 0,
        ),
        laborHoursPerUnit: toNum(
          r.laborHoursPerUnit,
          matched?.laborHoursPerUnit ?? 0,
        ),
        notes: String(r.notes ?? ""),
      });
    }
    if (items.length === 0) {
      return { ok: false as const, error: "No line items were proposed." };
    }
    return { ok: true as const, items };
  });
