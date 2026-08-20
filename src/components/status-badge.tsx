import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, type JobStatus } from "@/lib/types";

const VARIANT: Record<
  JobStatus,
  "job" | "maybe" | "shop" | "noise" | "junk"
> = {
  lead: "noise",
  estimating: "job",
  bid_sent: "maybe",
  won: "shop",
  lost: "junk",
  in_progress: "shop",
  complete: "noise",
};

export function StatusBadge({ status }: { status: JobStatus }) {
  return <Badge variant={VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}