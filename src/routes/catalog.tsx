import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  archiveCatalogItem,
  listCatalog,
  upsertCatalogItem,
} from "@/lib/server/shop";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  MATERIALS,
  MATERIAL_LABEL,
  UNITS,
  UNIT_LABEL,
  type CatalogItem,
  type Category,
  type Material,
  type Unit,
} from "@/lib/types";
import { money } from "@/lib/utils";

export const Route = createFileRoute("/catalog")({ component: CatalogPage });

function CatalogPage() {
  return (
    <AppShell>
      <CatalogView />
    </AppShell>
  );
}

const empty: Partial<CatalogItem> & { name: string } = {
  name: "",
  category: "flashing",
  material: "galvalume",
  gauge: "24 ga",
  unit: "lf",
  materialUnitCost: 0,
  laborHoursPerUnit: 0,
  wastePct: 10,
  notes: "",
};

function CatalogView() {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["catalog"], queryFn: () => listCatalog() });
  const [filter, setFilter] = useState<Category | "all">("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(empty);

  const items = useMemo(() => {
    const list = q.data ?? [];
    if (filter === "all") return list;
    return list.filter((i) => i.category === filter);
  }, [q.data, filter]);

  const save = useMutation({
    mutationFn: () => upsertCatalogItem({ data: draft as CatalogItem & { name: string } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
      setOpen(false);
      setDraft(empty);
      toast.success("Saved to price book");
    },
    onError: (e) => toast.error(e.message),
  });
  const archive = useMutation({
    mutationFn: (id: number) => archiveCatalogItem({ data: id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
      toast.success("Removed from book");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Price book"
        actions={
          <Button
            onClick={() => {
              setDraft(empty);
              setOpen(true);
            }}
          >
            New
          </Button>
        }
      />

      <div className="mb-6 flex max-w-full gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={filter === "all" ? "nav-tab nav-tab-active" : "nav-tab"}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={filter === c ? "nav-tab nav-tab-active" : "nav-tab"}
          >
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="shop-panel overflow-x-auto">
          <table className="w-full min-w-xl text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Material</th>
                <th className="px-4 py-3 font-medium">Gauge</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 text-right font-medium">Mat $</th>
                <th className="px-4 py-3 text-right font-medium">Hr</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-subtle">
                      {CATEGORY_LABEL[item.category]}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {MATERIAL_LABEL[item.material]}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{item.gauge || "—"}</td>
                  <td className="px-4 py-3">{UNIT_LABEL[item.unit]}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                    {money(item.materialUnitCost)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                    {item.laborHoursPerUnit}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDraft(item);
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger"
                      onClick={() => archive.mutate(item.id)}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit item" : "New catalog item"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="grid gap-1.5">
              <Label>Name</Label>
              <Input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Category</Label>
                <Select
                  value={draft.category}
                  onValueChange={(v) =>
                    setDraft({ ...draft, category: v as Category })
                  }
                >
                  <SelectTrigger>
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
              </div>
              <div className="grid gap-1.5">
                <Label>Material</Label>
                <Select
                  value={draft.material}
                  onValueChange={(v) =>
                    setDraft({ ...draft, material: v as Material })
                  }
                >
                  <SelectTrigger>
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
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Gauge</Label>
                <Input
                  value={draft.gauge ?? ""}
                  onChange={(e) => setDraft({ ...draft, gauge: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Unit</Label>
                <Select
                  value={draft.unit}
                  onValueChange={(v) => setDraft({ ...draft, unit: v as Unit })}
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
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label>Mat $</Label>
                <Input
                  type="number"
                  step="any"
                  value={draft.materialUnitCost ?? 0}
                  onChange={(e) =>
                    setDraft({ ...draft, materialUnitCost: Number(e.target.value) })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Hr / unit</Label>
                <Input
                  type="number"
                  step="any"
                  value={draft.laborHoursPerUnit ?? 0}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      laborHoursPerUnit: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Waste %</Label>
                <Input
                  type="number"
                  step="any"
                  value={draft.wastePct ?? 10}
                  onChange={(e) =>
                    setDraft({ ...draft, wastePct: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Notes</Label>
              <Textarea
                value={draft.notes ?? ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={save.isPending || !draft.name?.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
