import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListFilter, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { NewJobDialog } from "@/components/new-job-dialog";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteJob, duplicateJob, listJobs } from "@/lib/server/jobs";
import {
  JOB_STATUSES,
  STATUS_LABEL,
  type JobStatus,
} from "@/lib/types";
import { money } from "@/lib/utils";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/jobs/")({ component: JobsPage });

/** Estimating workflow buckets — matches how the shop talks about the board. */
const PIPELINE_BUCKETS = [
  {
    id: "all",
    label: "All",
    statuses: null as JobStatus[] | null,
  },
  {
    id: "open",
    label: "Open",
    statuses: ["lead", "estimating", "bid_sent"] as JobStatus[],
  },
  {
    id: "awarded",
    label: "Awarded",
    statuses: ["won", "in_progress"] as JobStatus[],
  },
  {
    id: "closed",
    label: "Closed",
    statuses: ["complete", "lost"] as JobStatus[],
  },
] as const;

type PipelineId = (typeof PIPELINE_BUCKETS)[number]["id"];

function formatDate(s: string | null) {
  if (!s) return "—";
  try {
    return format(parseISO(s), "MMM d");
  } catch {
    return s;
  }
}

function JobsPage() {
  return (
    <AppShell>
      <JobsList />
    </AppShell>
  );
}

function JobsList() {
  const [pipeline, setPipeline] = useState<PipelineId>("open");
  const [status, setStatus] = useState<JobStatus | "all">("all");
  const queryClient = useQueryClient();
  const jobs = useQuery({ queryKey: ["jobs"], queryFn: () => listJobs() });

  const counts = useMemo(() => {
    const list = jobs.data ?? [];
    const map: Record<string, number> = { all: list.length };
    for (const bucket of PIPELINE_BUCKETS) {
      if (!bucket.statuses) continue;
      map[bucket.id] = list.filter((j) =>
        bucket.statuses!.includes(j.status),
      ).length;
    }
    return map;
  }, [jobs.data]);

  const filtered = useMemo(() => {
    const list = jobs.data ?? [];
    const bucket = PIPELINE_BUCKETS.find((b) => b.id === pipeline);
    return list.filter((j) => {
      if (bucket?.statuses && !bucket.statuses.includes(j.status)) return false;
      if (status !== "all" && j.status !== status) return false;
      return true;
    });
  }, [jobs.data, pipeline, status]);

  const pipelineValue = useMemo(() => {
    return filtered.reduce((sum, j) => sum + j.bid.total, 0);
  }, [filtered]);

  const dup = useMutation({
    mutationFn: (id: number) => duplicateJob({ data: id }),
    onSuccess: () => {
      void queryClient.invalidateQueries();
      toast.success("Copied job file");
    },
    onError: (e) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: number) => deleteJob({ data: id }),
    onSuccess: () => {
      void queryClient.invalidateQueries();
      toast.success("Deleted job");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Jobs"
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">
                  <ListFilter className="size-4" />
                  Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setStatus("all")}>
                  All statuses{status === "all" ? " ·" : ""}
                </DropdownMenuItem>
                {JOB_STATUSES.map((s) => (
                  <DropdownMenuItem key={s} onClick={() => setStatus(s)}>
                    {STATUS_LABEL[s]}
                    {status === s ? " ·" : ""}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <NewJobDialog trigger={<Button>New</Button>} />
          </>
        }
      />

      <div className="mb-4 flex max-w-full gap-1 overflow-x-auto">
        {PIPELINE_BUCKETS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => {
              setPipeline(b.id);
              setStatus("all");
            }}
            className={pipeline === b.id ? "nav-tab nav-tab-active" : "nav-tab"}
          >
            {b.label}
            <span className="ml-1.5 font-mono text-[10px] opacity-70">
              {counts[b.id] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <p className="mb-4 text-sm text-muted-foreground">
          {filtered.length} job{filtered.length === 1 ? "" : "s"} ·{" "}
          <span className="tabular-nums text-ink">{money(pipelineValue)}</span>
          {status !== "all" ? (
            <>
              {" · "}
              {STATUS_LABEL[status]}{" "}
              <button
                type="button"
                className="underline-offset-2 hover:underline"
                onClick={() => setStatus("all")}
              >
                Clear
              </button>
            </>
          ) : null}
        </p>
      ) : null}

      {jobs.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="shop-panel p-10 text-center">
          <p className="font-display text-2xl font-medium tracking-[0.04em]">
            No matching jobs
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Open a new estimate or switch the pipeline filter.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((job) => (
            <li
              key={job.id}
              className="shop-panel flex items-start gap-3 p-5"
            >
              <Link
                to="/jobs/$jobId"
                params={{ jobId: String(job.id) }}
                className="min-w-0 flex-1"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-[1.05rem] font-medium">{job.name}</h2>
                  <span className="text-sm font-medium tabular-nums">
                    {money(job.bid.total)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {job.jobNumber}
                  {job.siteAddress ? ` · ${job.siteAddress}` : ""}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Customer: {job.customerName ?? "None"} · Due:{" "}
                  {formatDate(job.bidDate)} · {job.itemCount} lines
                </p>
                <div className="mt-2">
                  <StatusBadge status={job.status} />
                </div>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Job actions"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link
                      to="/jobs/$jobId"
                      params={{ jobId: String(job.id) }}
                    >
                      Open
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => dup.mutate(job.id)}>
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-danger"
                    onClick={() => {
                      if (confirm(`Delete ${job.jobNumber}?`))
                        del.mutate(job.id);
                    }}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
