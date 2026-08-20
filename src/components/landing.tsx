import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { money } from "@/lib/utils";

const SAMPLE = [
  { qty: "4,200 SF", item: "24ga Galvalume standing seam", amount: 28518 },
  { qty: "310 LF", item: "Drip edge / eave", amount: 2282 },
  { qty: "240 LF", item: "6\" K-style gutter", amount: 5299 },
  { qty: "16 HR", item: "Shop brake & solder", amount: 1472 },
];

const SAMPLE_BID = 49654;

export function Landing() {
  return (
    <div className="shop-canvas min-h-dvh">
      <SiteHeader
        pathname="/"
        right={
          <>
            <Button asChild size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu">
                  <Menu className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link to="/login">Board</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/login">Jobs</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/login">Price book</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/login">Customers</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <div className="p-3">
        <div className="shop-shell mx-auto max-w-5xl px-5 py-12 sm:px-10 sm:py-16">
          <p className="label-stamp">Skyline Sheet Metal · Shop book</p>
          <h1 className="mt-3 max-w-2xl font-display text-5xl leading-[1.15] font-medium tracking-[0.04em] text-ink uppercase sm:text-6xl">
            Skyline QX
          </h1>
          <p className="mt-3 max-w-xl font-display text-2xl font-medium tracking-[0.04em] text-muted sm:text-3xl">
            Takeoff to bid, without the spreadsheet fog.
          </p>
          <p className="mt-6 max-w-lg text-base text-muted">
            Track standing seam, flashings, coping, and custom fab — material,
            waste, shop hours, and markup — the way Skyline estimates
            architectural metal.
          </p>
          <div className="mt-8">
            <Button size="lg" asChild>
              <Link to="/login">Open the shop book</Link>
            </Button>
          </div>

          <div className="mt-14 grid items-start gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <dl className="grid max-w-lg grid-cols-3 gap-4">
              <div>
                <dt className="label-stamp">Price book</dt>
                <dd className="mt-1 font-display text-2xl font-medium tracking-[0.04em]">
                  Mill items
                </dd>
              </div>
              <div>
                <dt className="label-stamp">Pipeline</dt>
                <dd className="mt-1 font-display text-2xl font-medium tracking-[0.04em]">
                  Win / loss
                </dd>
              </div>
              <div>
                <dt className="label-stamp">Markup</dt>
                <dd className="mt-1 font-display text-2xl font-medium tracking-[0.04em]">
                  OH + profit
                </dd>
              </div>
            </dl>

            <div className="shop-panel p-5">
              <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
                <div>
                  <div className="label-stamp">Estimate</div>
                  <div className="font-display text-2xl font-medium tracking-[0.04em]">
                    2026-001
                  </div>
                </div>
                <div className="text-right">
                  <div className="label-stamp">Project</div>
                  <div className="text-sm">Adidas North Bldg</div>
                </div>
              </div>
              <ul className="divide-y divide-line">
                {SAMPLE.map((row) => (
                  <li
                    key={row.item}
                    className="flex items-baseline justify-between gap-3 py-3 text-sm"
                  >
                    <span>
                      <span className="mr-2 font-mono text-[11px] text-muted tabular-nums">
                        {row.qty}
                      </span>
                      {row.item}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums">
                      {money(row.amount)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex items-end justify-between border-t border-line pt-4">
                <span className="label-stamp">Bid total</span>
                <span className="font-display text-3xl font-medium tracking-[0.04em] tabular-nums">
                  {money(SAMPLE_BID)}
                </span>
              </div>
            </div>
          </div>

          <section className="mt-16 grid gap-4 sm:grid-cols-3">
            {[
              {
                k: "01",
                t: "Takeoff lines",
                d: "Quantity, waste, mill cost, and labor hours on every flashing, panel, and gutter.",
              },
              {
                k: "02",
                t: "Your price book",
                d: "Galvalume, copper, zinc, stainless — default gauges, units, and shop hours.",
              },
              {
                k: "03",
                t: "Bid pipeline",
                d: "Lead through awarded. See open volume, win rate, and what’s due this week.",
              },
            ].map((f) => (
              <div key={f.k} className="shop-panel p-6">
                <div className="font-mono text-[11px] text-subtle">{f.k}</div>
                <h2 className="mt-3 font-display text-2xl font-medium tracking-[0.04em]">
                  {f.t}
                </h2>
                <p className="mt-2 text-sm text-muted">{f.d}</p>
              </div>
            ))}
          </section>

          <footer className="mt-16 flex flex-wrap items-end justify-between gap-4 border-t border-line pt-6 text-xs text-subtle">
            <div>
              <div className="label-stamp">Skyline Sheet Metal, Inc.</div>
              <div className="mt-1">Skyline QX · Shop estimating book</div>
            </div>
            <div className="font-mono text-[11px]">TROUTDALE, OR</div>
          </footer>
        </div>
      </div>
    </div>
  );
}
