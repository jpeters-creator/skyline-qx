import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ThemeSwatches } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getSettings, saveSettings } from "@/lib/server/shop";

export const Route = createFileRoute("/settings")({ component: Page });

function Page() {
  return (
    <AppShell>
      <SettingsView />
    </AppShell>
  );
}

function SettingsView() {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["settings"], queryFn: () => getSettings() });
  const [companyName, setCompanyName] = useState("");
  const [labor, setLabor] = useState("92");
  const [oh, setOh] = useState("18");
  const [profit, setProfit] = useState("12");
  const [tax, setTax] = useState("0");
  const [waste, setWaste] = useState("10");

  useEffect(() => {
    if (!q.data) return;
    setCompanyName(q.data.companyName);
    setLabor(String(q.data.defaultLaborRate));
    setOh(String(q.data.defaultOverheadPct));
    setProfit(String(q.data.defaultProfitPct));
    setTax(String(q.data.defaultTaxPct));
    setWaste(String(q.data.defaultWastePct));
  }, [q.data]);

  const save = useMutation({
    mutationFn: () =>
      saveSettings({
        data: {
          companyName,
          defaultLaborRate: Number(labor),
          defaultOverheadPct: Number(oh),
          defaultProfitPct: Number(profit),
          defaultTaxPct: Number(tax),
          defaultWastePct: Number(waste),
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Shop defaults saved");
    },
    onError: (e) => toast.error(e.message),
  });

  if (q.isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Settings" />
      <p className="-mt-6 mb-8 text-sm text-muted-foreground">
        Applied to new estimates. Existing job files keep their own rates.
      </p>
      <div className="mb-6">
        <p className="label-stamp mb-2">Shop finish</p>
        <ThemeSwatches />
        <p className="mt-2 text-sm text-muted-foreground">
          Mill night, galvalume, or brake shop — saved on this computer. CIC stays cream.
        </p>
      </div>
      <Card className="p-5">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="co">Shop name</Label>
            <Input
              id="co"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="labor">Labor rate ($/hr)</Label>
              <Input
                id="labor"
                type="number"
                step="any"
                value={labor}
                onChange={(e) => setLabor(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="waste">Default waste %</Label>
              <Input
                id="waste"
                type="number"
                step="any"
                value={waste}
                onChange={(e) => setWaste(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="oh">Overhead %</Label>
              <Input
                id="oh"
                type="number"
                step="any"
                value={oh}
                onChange={(e) => setOh(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="profit">Profit %</Label>
              <Input
                id="profit"
                type="number"
                step="any"
                value={profit}
                onChange={(e) => setProfit(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tax">Tax %</Label>
              <Input
                id="tax"
                type="number"
                step="any"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" disabled={save.isPending}>
            Save defaults
          </Button>
        </form>
      </Card>
    </div>
  );
}
