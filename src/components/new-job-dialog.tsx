import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea";
import { createJob } from "@/lib/server/jobs";
import { listCustomers } from "@/lib/server/shop";

export function NewJobDialog({ trigger }: { trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState<string>("none");
  const [site, setSite] = useState("");
  const [bidDate, setBidDate] = useState("");
  const [notes, setNotes] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: () => listCustomers(),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () =>
      createJob({
        data: {
          name,
          customerId: customerId === "none" ? null : Number(customerId),
          siteAddress: site,
          bidDate: bidDate || null,
          notes,
        },
      }),
    onSuccess: async (job) => {
      await queryClient.invalidateQueries();
      setOpen(false);
      setName("");
      setCustomerId("none");
      setSite("");
      setBidDate("");
      setNotes("");
      toast.success(`Opened ${job.jobNumber}`);
      void navigate({ to: "/jobs/$jobId", params: { jobId: String(job.id) } });
    },
    onError: (err) => toast.error(err.message || "Could not create job"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button>New estimate</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New estimate</DialogTitle>
          <DialogDescription>
            Opens a job file with your shop defaults for labor, overhead, and profit.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="job-name">Project</Label>
            <Input
              id="job-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Lincoln Elementary reroof"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
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
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="job-site">Site</Label>
            <Input
              id="job-site"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="1400 SE Lincoln St, Portland"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="job-due">Bid due</Label>
            <Input
              id="job-due"
              type="date"
              value={bidDate}
              onChange={(e) => setBidDate(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="job-notes">Notes</Label>
            <Textarea
              id="job-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Standing seam, copper bays, keep existing valleys…"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!name.trim() || mutation.isPending}>
              {mutation.isPending ? "Opening…" : "Open job file"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
