import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { FoldlineMark } from "@/components/foldline-mark";
import { ThemeToggle } from "@/components/theme-toggle";

export const NAV = [
  { to: "/", label: "Board" },
  { to: "/jobs", label: "Jobs" },
  { to: "/catalog", label: "Price book" },
  { to: "/customers", label: "Customers" },
] as const;

export function isNavActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(to + "/");
}

export function SiteHeader({
  pathname,
  right,
}: {
  pathname: string;
  right?: ReactNode;
}) {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div className="flex min-h-[5.75rem] items-center gap-3 px-3 py-1.5 sm:gap-5 sm:px-4">
        <Link to="/" className="shrink-0" aria-label="Skyline QX home">
          <FoldlineMark wordmark compact />
        </Link>
        <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex">
          {NAV.map((item) => {
            const active = isNavActive(pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn("nav-tab", active && "nav-tab-active")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {right}
        </div>
      </div>
    </header>
  );
}
