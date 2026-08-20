import { useEffect, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { lineCosts } from "@/lib/estimate";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  MATERIALS,
  MATERIAL_LABEL,
  UNITS,
  UNIT_LABEL,
  type Category,
  type EstimateItem,
  type Material,
  type Unit,
} from "@/lib/types";
import { money, qty } from "@/lib/utils";

type Draft = Pick<
  EstimateItem,
  | "description"
  | "category"
  | "material"
  | "gauge"
  | "unit"
  | "quantity"
  | "wastePct"
  | "materialUnitCost"
  | "laborHoursPerUnit"
>;

export function JobLineRow({
  item,
  laborRate,
  onSave,
  onDelete,
}: {
  item: EstimateItem;
  laborRate: number;
  onSave: (patch: Partial<EstimateItem>) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(item);
  useEffect(() => {
    setDraft({
      description: item.description,
      category: item.category,
      material: item.material,
      gauge: item.gauge,
      unit: item.unit,
      quantity: item.quantity,
      wastePct: item.wastePct,
      materialUnitCost: item.materialUnitCost,
      laborHoursPerUnit: item.laborHoursPerUnit,
    });
  }, [item]);

  const costs = lineCosts(draft, laborRate);

  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function commit(extra?: Partial<Draft>) {
    const next = { ...draft, ...extra };
    onSave(next);
  }

  return (
    <div className="grid gap-3 border-b border-border py-4 md:grid-cols-[minmax(0,1.6fr)_repeat(6,minmax(4.5rem,1fr))_auto] md:items-end md:gap-2">
      <div className="grid gap-1.5">
        <span className="label-stamp md:hidden">Description</span>
        <Input
          value={draft.description}
          onChange={(e) => patch("description", e.target.value)}
          onBlur={() => commit()}
        />
        <div className="flex flex-wrap gap-2">
          <Select
            value={draft.category}
            onValueChange={(v) => {
              patch("category", v as Category);
              commit({ category: v as Category });
            }}
          >
            <SelectTrigger className="h-9 w-auto min-w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={draft.material}
            onValueChange={(v) => {
              patch("material", v as Material);
              commit({ material: v as Material });
            }}
          >
            <SelectTrigger className="h-9 w-auto min-w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MATERIALS.map((m) => (
                <SelectItem key={m} value={m}>
                  {MATERIAL_LABEL[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="h-9 w-24 text-xs"
            value={draft.gauge}
            placeholder="Gauge"
            onChange={(e) => patch("gauge", e.target.value)}
            onBlur={() => commit()}
          />
        </div>
      </div>

      <Field label="Qty">
        <Input
          type="number"
          step="any"
          className="tabular-nums"
          value={draft.quantity}
          onChange={(e) => patch("quantity", Number(e.target.value))}
          onBlur={() => commit()}
        />
      </Field>
      <Field label="Unit">
        <Select
          value={draft.unit}
          onValueChange={(v) => {
            patch("unit", v as Unit);
            commit({ unit: v as Unit });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNITS.map((u) => (
              <SelectItem key={u} value={u}>
                {UNIT_LABEL[u]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Waste %">
        <Input
          type="number"
          step="any"
          className="tabular-nums"
          value={draft.wastePct}
          onChange={(e) => patch("wastePct", Number(e.target.value))}
          onBlur={() => commit()}
        />
      </Field>
      <Field label="Mat $">
        <Input
          type="number"
          step="any"
          className="tabular-nums"
          value={draft.materialUnitCost}
          onChange={(e) => patch("materialUnitCost", Number(e.target.value))}
          onBlur={() => commit()}
        />
      </Field>
      <Field label="Hr / unit">
        <Input
          type="number"
          step="any"
          className="tabular-nums"
          value={draft.laborHoursPerUnit}
          onChange={(e) => patch("laborHoursPerUnit", Number(e.target.value))}
          onBlur={() => commit()}
        />
      </Field>
      <Field label="Line">
        <div className="flex h-11 items-center justify-end font-mono text-sm tabular-nums">
          {money(costs.total)}
        </div>
        <div className="text-right text-xs text-subtle">
          {qty(costs.extQty)} {UNIT_LABEL[draft.unit]} after waste
        </div>
      </Field>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Remove line"
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="label-stamp">{label}</span>
      {children}
    </label>
  );
}
