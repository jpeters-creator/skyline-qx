import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteCustomer,
  listCustomers,
  upsertCustomer,
} from "@/lib/server/shop";
import { initials } from "@/lib/utils";
import type { Customer } from "@/lib/types";

export const Route = createFileRoute("/customers")({ component: Page });

function Page() {
  return (
    <AppShell>
      <CustomersView />
    </AppShell>
  );
}

const empty = {
  name: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
};

function CustomersView() {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["customers"], queryFn: () => listCustomers() });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Customer> & { name: string }>(empty);

  const save = useMutation({
    mutationFn: () => upsertCustomer({ data: draft as Customer & { name: string } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      setOpen(false);
      toast.success("Customer saved");
    },
    onError: (e) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: number) => deleteCustomer({ data: id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Removed");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Customers"
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

      {q.isLoading ? (
        <Skeleton className="h-48" />
      ) : (q.data ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong p-10 text-center text-sm text-muted-foreground">
          No customers yet.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {(q.data ?? []).map((c) => (
            <li
              key={c.id}
              className="shop-panel flex gap-4 p-5"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-md bg-elevated font-display text-lg text-mill">
                {initials(c.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{c.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {c.contactName || "—"}
                  {c.phone ? ` · ${c.phone}` : ""}
                </div>
                <div className="truncate text-xs text-subtle">{c.address}</div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDraft(c);
                      setOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    onClick={() => {
                      if (confirm(`Remove ${c.name}?`)) del.mutate(c.id);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit customer" : "New customer"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="grid gap-1.5">
              <Label>Company</Label>
              <Input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Contact</Label>
              <Input
                value={draft.contactName ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, contactName: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={draft.email ?? ""}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Phone</Label>
                <Input
                  value={draft.phone ?? ""}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Address</Label>
              <Input
                value={draft.address ?? ""}
                onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Notes</Label>
              <Textarea
                value={draft.notes ?? ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={save.isPending || !draft.name.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
