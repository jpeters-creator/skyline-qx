import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  actions,
  className,
}: {
  title: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-wrap items-center justify-between gap-4",
        className,
      )}
    >
      <h1 className="font-display text-[1.85rem] leading-[1.15] font-medium tracking-[0.04em] text-ink uppercase sm:text-[2.15rem]">
        {title}
      </h1>
      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
