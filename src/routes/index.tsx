import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getDashboard } from "@/lib/server/jobs";
import { money } from "@/lib/utils";
import { STATUS_LABEL, type JobStatus } from "@/lib/types";
import { AppShell } from "@/components/app-shell";
import { Landing } from "@/components/landing";
import { NewJobDialog } from "@/components/new-job-dialog";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user } = useCurrentUserState();
  if (user) {
    return (
      <AppShell>
        <Dashboard />
      </AppShell>
    );
  }
  return <Landing />;
}

function Dashboard() {
  const q = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  if (q.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }
  if (q.error) {
    return (
      <p className="text-sm text-danger">
        {q.error.message === "Unauthorized"
          ? "Sign in to open the shop book."
          : q.error.message}
      </p>
    );
  }
  const data = q.data;
  if (!data) return null;

  const upcoming = data.jobs
    .filter((j) => j.status === "lead" || j.status === "estimating" || j.status === "bid_sent")
    .slice(0, 6);

  const chart = data.byStatus
    .filter((s) => s.count > 0)
    .map((s) => ({
      name: STATUS_LABEL[s.status],
      value: Math.round(s.value),
    }));

  return (
    <div>
      <PageHeader
        title="Board"
        actions={<NewJobDialog trigger={<Button>New</Button>} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat k="Open pipeline" v={money(data.pipelineValue)} s={`${data.openCount} live files`} />
        <Stat k="Awarded YTD" v={money(data.awardedYtd)} s="Won / in progress / complete" />
        <Stat
          k="Win rate"
          v={`${Math.round(data.winRate)}%`}
          s={`${data.wonCount} won · ${data.lostCount} lost`}
        />
        <Stat k="Job files" v={String(data.jobs.length)} s="This shop book" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Volume by status</p>
          <div className="mt-4 h-56">
            {chart.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                    }
                  />
                  <Tooltip
                    cursor={{ fill: "color-mix(in oklab, var(--color-ink) 6%, transparent)" }}
                    contentStyle={{
                      background: "var(--color-raised)",
                      border: "1px solid var(--color-line)",
                      borderRadius: 8,
                      color: "var(--color-ink)",
                    }}
                    formatter={(value) => money(Number(value ?? 0))}
                  />
                  <Bar dataKey="value" fill="var(--color-steel)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Open files</p>
              <Button variant="link" className="h-auto p-0 text-xs" asChild>
                <Link to="/jobs">All jobs</Link>
              </Button>
            </div>
            <ul className="mt-3 divide-y divide-border">
              {upcoming.length === 0 && (
                <li className="py-6 text-sm text-muted-foreground">
                  No live estimates. Open a job file to start a takeoff.
                </li>
              )}
              {upcoming.map((job) => (
                <li key={job.id}>
                  <Link
                    to="/jobs/$jobId"
                    params={{ jobId: String(job.id) }}
                    className="flex items-center justify-between gap-3 py-3 hover:text-mill"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{job.name}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-xs text-subtle">
                          {job.jobNumber}
                        </span>
                        <StatusBadge status={job.status as JobStatus} />
                      </div>
                    </div>
                    <div className="font-mono text-sm tabular-nums">
                      {money(job.bid.total)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ k, v, s }: { k: string; v: string; s: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{k}</p>
      <p className="mt-2 font-display text-3xl font-medium tracking-tight tabular-nums">
        {v}
      </p>
      <p className="mt-1 text-xs text-subtle">{s}</p>
    </Card>
  );
}
