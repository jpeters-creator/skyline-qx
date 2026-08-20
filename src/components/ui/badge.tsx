import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-wide uppercase",
  {
    variants: {
      variant: {
        default: "border-line bg-steel-soft text-noise",
        job: "border-transparent bg-job/12 text-job",
        maybe: "border-transparent bg-maybe/12 text-maybe",
        shop: "border-transparent bg-shop/12 text-shop",
        noise: "border-transparent bg-noise/12 text-noise",
        junk: "border-transparent bg-junk/12 text-junk",
        mill: "border-transparent bg-job/12 text-job",
        outline: "border-line text-muted",
        ok: "border-transparent bg-shop/12 text-shop",
        warn: "border-transparent bg-warn/12 text-warn",
        danger: "border-transparent bg-junk/12 text-junk",
        info: "border-transparent bg-maybe/12 text-maybe",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
