import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Printer, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { JobLineRow } from "@/components/job-line-row";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { draftTakeoff } from "@/lib/server/ai";
import {
  addEstimateItem,
  addProposedItems,
  deleteEstimateItem,
  deleteJob,
  duplicateJob,
  getJob,
  updateEstimateItem,
  updateJob,
} from "@/lib/server/jobs";
import { listCustomers } from "@/lib/server/shop";
import { bidFromItems, lineCosts } from "@/lib/estimate";
import { formatDate } from "@/lib/dates";
import {
  CATEGORY_LABEL,
  JOB_STATUSES,
  MATERIAL_LABEL,
  STATUS_LABEL,
  UNIT_LABEL,
  type CatalogItem,
  type JobStatus,
  type TakeoffProposal,
} from "@/lib/types";
import { hours, money, qty, toNum } from "@/lib/utils";

export const Route = createFileRoute("/jobs/$jobId")({ component: JobPage });

function JobPage() {
  const { jobId } = Route.useParams();
  return (
    <AppShell>
      <JobDetail id={Number(jobId)} />
    </AppShell>
  );
}

function JobDetail({ id }: { id: number }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["job", id],
    queryFn: () => getJob({ data: id }),
  });
  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: () => listCustomers(),
  });
  const [bookOpen, setBookOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const saveJob = useMutation({
    mutationFn: (patch: Parameters<typeof updateJob>[0]["data"]) =>
      updateJob({ data: patch }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["job", id] }),
    onError: (e) => toast.error(e.message),
  });
  const addLine = useMutation({
    mutationFn: (input: Parameters<typeof addEstimateItem>[0]["data"]) =>
      addEstimateItem({ data: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["job", id] });
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(e.message),
  });
  const saveLine = useMutation({
    mutationFn: (input: Parameters<typeof updateEstimateItem>[0]["data"]) =>
      updateEstimateItem({ data: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["job", id] });
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(e.message),
  });
  const removeLine = useMutation({
    mutationFn: (lineId: number) => deleteEstimateItem({ data: lineId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["job", id] });
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (q.error || !q.data) {
    return (
      <div>
        <p className="text-sm text-danger">
          {q.error?.message ?? "Job not found"}
        </p>
        <Button variant="link" asChild>
          <Link to="/jobs">Back to jobs</Link>
        </Button>
      </div>
    );
  }

  const { job, items, catalog, customer } = q.data;
  const bid = bidFromItems(items, job);

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            to="/jobs"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-fg"
          >
            <ArrowLeft className="size-4" /> Jobs
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm text-subtle">{job.jobNumber}</span>
            <StatusBadge status={job.status} />
          </div>
          <h1 className="mt-1 font-display text-3xl font-medium tracking-[0.04em] text-ink sm:text-[2.15rem]">
            {job.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {customer?.name ?? "No customer"}
            {job.siteAddress ? ` · ${job.siteAddress}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" /> Print
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              duplicateJob({ data: job.id }).then((copy) => {
                toast.success("Copied");
                void navigate({
                  to: "/jobs/$jobId",
                  params: { jobId: String(copy.id) },
                });
              })
            }
          >
            Duplicate
          </Button>
          <Button
            variant="ghost"
            className="text-danger"
            onClick={() => {
              if (!confirm(`Delete ${job.jobNumber}?`)) return;
              void deleteJob({ data: job.id }).then(() => {
                toast.success("Deleted");
                void navigate({ to: "/jobs" });
              });
            }}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="print-only">
        <h1 className="font-display text-3xl">{job.name}</h1>
        <p>
          {job.jobNumber} · {customer?.name ?? ""} · {formatDate(job.bidDate)}
        </p>
      </div>

      <div className="no-print shop-panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1.5">
          <span className="label-stamp">Project</span>
          <Input
            defaultValue={job.name}
            onBlur={(e) => {
              if (e.target.value.trim() && e.target.value !== job.name) {
                saveJob.mutate({ id: job.id, name: e.target.value });
              }
            }}
          />
        </label>
        <label className="grid gap-1.5">
          <span className="label-stamp">Customer</span>
          <Select
            value={job.customerId ? String(job.customerId) : "none"}
            onValueChange={(v) =>
              saveJob.mutate({
                id: job.id,
                customerId: v === "none" ? null : Number(v),
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {(customers.data ?? []).map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="grid gap-1.5">
          <span className="label-stamp">Status</span>
          <Select
            value={job.status}
            onValueChange={(v) =>
              saveJob.mutate({ id: job.id, status: v as JobStatus })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOB_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="grid gap-1.5">
          <span className="label-stamp">Bid due</span>
          <Input
            type="date"
            defaultValue={job.bidDate ?? ""}
            onBlur={(e) =>
              saveJob.mutate({ id: job.id, bidDate: e.target.value || null })
            }
          />
        </label>
        <label className="grid gap-1.5 sm:col-span-2">
          <span className="label-stamp">Site</span>
          <Input
            defaultValue={job.siteAddress}
            onBlur={(e) => {
              if (e.target.value !== job.siteAddress) {
                saveJob.mutate({ id: job.id, siteAddress: e.target.value });
              }
            }}
          />
        </label>
        <label className="grid gap-1.5 sm:col-span-2">
          <span className="label-stamp">Notes</span>
          <Textarea
            defaultValue={job.notes}
            className="min-h-20"
            onBlur={(e) => {
              if (e.target.value !== job.notes) {
                saveJob.mutate({ id: job.id, notes: e.target.value });
              }
            }}
          />
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <div className="no-print mb-3 flex flex-wrap items-center gap-2">
            <p className="label-stamp mr-auto">Takeoff</p>
            <Popover open={bookOpen} onOpenChange={setBookOpen}>
              <PopoverTrigger asChild>
                <Button size="sm">Add from price book</Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <Command>
                  <CommandInput placeholder="Standing seam, copper valley…" />
                  <CommandList>
                    <CommandEmpty>No items in the book.</CommandEmpty>
                    <CommandGroup>
                      {catalog.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.name} ${c.material} ${c.gauge} ${c.category}`}
                          onSelect={() => {
                            addLine.mutate({ jobId: job.id, catalogItemId: c.id, quantity: 1 });
                            setBookOpen(false);
                          }}
                        >
                          <div className="min-w-0">
                            <div className="truncate">{c.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {MATERIAL_LABEL[c.material]} {c.gauge} · {money(c.materialUnitCost)}/{UNIT_LABEL[c.unit]}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                addLine.mutate({ jobId: job.id, description: "New line", quantity: 1 })
              }
            >
              Blank line
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAiOpen(true)}>
              <Sparkles className="size-4" /> Draft takeoff
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-strong p-8 text-center">
              <p className="font-display text-xl">Empty takeoff</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pull lines from the price book, or draft from notes.
              </p>
            </div>
          ) : (
            <div className="shop-panel px-3 md:px-4">
              {items.map((item) => (
                <JobLineRow
                  key={item.id}
                  item={item}
                  laborRate={job.laborRate}
                  onSave={(patch) => saveLine.mutate({ id: item.id, ...patch })}
                  onDelete={() => removeLine.mutate(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card className="p-5">
            <p className="label-stamp">Bid recap</p>
            <div className="mt-4 space-y-2 text-sm">
              <Row k="Material" v={money(bid.material)} />
              <Row k={`Labor (${hours(bid.laborHours)})`} v={money(bid.labor)} />
              <Row k="Direct" v={money(bid.direct)} strong />
              <Row
                k={`Overhead ${job.overheadPct}%`}
                v={money(bid.overhead)}
              />
              <Row k={`Profit ${job.profitPct}%`} v={money(bid.profit)} />
              <Row k={`Tax ${job.taxPct}%`} v={money(bid.tax)} />
            </div>
            <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
              <span className="label-stamp">Bid total</span>
              <span className="font-display text-3xl font-semibold tabular-nums">
                {money(bid.total)}
              </span>
            </div>
            <div className="no-print mt-5 grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className="label-stamp">Labor $/hr</span>
                <Input
                  type="number"
                  step="any"
                  defaultValue={job.laborRate}
                  onBlur={(e) =>
                    saveJob.mutate({ id: job.id, laborRate: toNum(e.target.value) })
                  }
                />
              </label>
              <label className="grid gap-1">
                <span className="label-stamp">Overhead %</span>
                <Input
                  type="number"
                  step="any"
                  defaultValue={job.overheadPct}
                  onBlur={(e) =>
                    saveJob.mutate({
                      id: job.id,
                      overheadPct: toNum(e.target.value),
                    })
                  }
                />
              </label>
              <label className="grid gap-1">
                <span className="label-stamp">Profit %</span>
                <Input
                  type="number"
                  step="any"
                  defaultValue={job.profitPct}
                  onBlur={(e) =>
                    saveJob.mutate({
                      id: job.id,
                      profitPct: toNum(e.target.value),
                    })
                  }
                />
              </label>
              <label className="grid gap-1">
                <span className="label-stamp">Tax %</span>
                <Input
                  type="number"
                  step="any"
                  defaultValue={job.taxPct}
                  onBlur={(e) =>
                    saveJob.mutate({ id: job.id, taxPct: toNum(e.target.value) })
                  }
                />
              </label>
            </div>
          </Card>
        </aside>
      </div>

      <AiSheet
        open={aiOpen}
        onOpenChange={setAiOpen}
        jobId={job.id}
        catalog={catalog}
        onAdded={() => {
          void queryClient.invalidateQueries({ queryKey: ["job", id] });
          setAiOpen(false);
        }}
      />
    </div>
  );
}

function Row({
  k,
  v,
  strong,
}: {
  k: string;
  v: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className={strong ? "font-medium tabular-nums" : "font-mono text-xs tabular-nums"}>
        {v}
      </span>
    </div>
  );
}

function AiSheet({
  open,
  onOpenChange,
  jobId,
  catalog,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jobId: number;
  catalog: CatalogItem[];
  onAdded: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [picked, setPicked] = useState<Record<number, boolean>>({});
  const draft = useMutation({
    mutationFn: () => draftTakeoff({ data: { jobId, notes } }),
    onSuccess: (res) => {
      if (!res.ok) toast.error(res.error);
      else {
        const next: Record<number, boolean> = {};
        res.items.forEach((_, i) => {
          next[i] = true;
        });
        setPicked(next);
      }
    },
    onError: (e) => toast.error(e.message),
  });
  const add = useMutation({
    mutationFn: (items: TakeoffProposal[]) =>
      addProposedItems({ data: { jobId, items } }),
    onSuccess: () => {
      toast.success("Lines added");
      onAdded();
    },
    onError: (e) => toast.error(e.message),
  });

  const items = draft.data && draft.data.ok ? draft.data.items : [];
  const selected = useMemo(
    () => items.filter((_, i) => picked[i]),
    [items, picked],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Draft takeoff</SheetTitle>
          <SheetDescription>
            Describe the scope. Skyline QX will propose lines from your price book.
            You choose what to add.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 grid gap-3">
          <Label htmlFor="ai-notes">Scope notes</Label>
          <Textarea
            id="ai-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="4,200 sf standing seam galvalume, 240 lf gutter, two chimneys, copper valleys at entries…"
            className="min-h-32"
          />
          <Button
            onClick={() => draft.mutate()}
            disabled={!notes.trim() || draft.isPending}
          >
            {draft.isPending ? "Estimating…" : "Propose lines"}
          </Button>
        </div>
        {items.length > 0 && (
          <ul className="mt-4 space-y-2">
            {items.map((item, i) => {
              const costs = lineCosts(item, 92);
              const match = catalog.find((c) => c.id === item.catalogItemId);
              return (
                <li
                  key={`${item.description}-${i}`}
                  className="flex gap-3 rounded-lg border border-border p-3"
                >
                  <Checkbox
                    checked={Boolean(picked[i])}
                    onCheckedChange={(v) =>
                      setPicked((p) => ({ ...p, [i]: v === true }))
                    }
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{item.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {qty(item.quantity)} {UNIT_LABEL[item.unit]} ·{" "}
                      {CATEGORY_LABEL[item.category]}
                      {match ? " · from book" : ""}
                    </div>
                  </div>
                  <div className="font-mono text-xs tabular-nums">
                    {money(costs.total)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {selected.length > 0 && (
          <Button
            className="mt-4"
            onClick={() => add.mutate(selected)}
            disabled={add.isPending}
          >
            Add {selected.length} lines
          </Button>
        )}
      </SheetContent>
    </Sheet>
  );
}
