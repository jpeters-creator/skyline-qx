import { useEffect, useRef, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, Settings } from "lucide-react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { signOut } from "@/lib/auth/client";
import { bootstrapShop } from "@/lib/server/shop";
import { initials } from "@/lib/utils";
import { NewJobDialog } from "@/components/new-job-dialog";
import { NAV, SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export function AppSkeleton() {
  return (
    <div className="shop-canvas min-h-dvh">
      <div className="flex h-[4.5rem] items-center gap-4 border-b border-line bg-surface px-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="hidden h-11 w-80 rounded-md md:block" />
      </div>
      <div className="p-3">
        <div className="shop-shell mx-auto max-w-5xl p-8">
          <Skeleton className="h-10 w-56" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Avatar({ label, image }: { label: string; image?: string | null }) {
  if (image) {
    return (
      <img src={image} alt="" className="size-9 rounded-md object-cover" />
    );
  }
  return (
    <span className="grid size-9 place-items-center rounded-md bg-steel font-mono text-[11px] font-medium text-steel-fg">
      {initials(label)}
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const queryClient = useQueryClient();
  const booted = useRef(false);

  useEffect(() => {
    if (!user || booted.current) return;
    booted.current = true;
    void bootstrapShop()
      .then((res) => {
        if (res.seeded) void queryClient.invalidateQueries();
      })
      .catch(() => {
        booted.current = false;
      });
  }, [user, queryClient]);

  if (isPending) return <AppSkeleton />;
  if (!user) return <RedirectToSignIn />;

  const label = user.displayName ?? user.primaryEmail ?? "Account";

  return (
    <div className="shop-canvas min-h-dvh text-ink">
      <SiteHeader
        pathname={pathname}
        right={
          <>
            <NewJobDialog trigger={<Button size="sm">New</Button>} />
            <Avatar label={label} image={user.profileImageUrl} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu">
                  <Menu className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {NAV.map((item) => (
                  <DropdownMenuItem key={item.to} asChild className="md:hidden">
                    <Link to={item.to}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="md:hidden" />
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="size-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void signOut("/login")}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />
      <div className="p-3">
        <div className="shop-shell mx-auto max-w-5xl">
          <main className="px-5 py-8 sm:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
