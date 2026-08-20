import { useState, type FormEvent } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import {
  GROK_PROVIDERS,
  authClient,
  authEnabled,
  signIn,
} from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { FoldlineMark } from "@/components/foldline-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (user) return <Navigate to="/" />;

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "up") {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0] || "Estimator",
        });
        if (err) throw new Error(err.message ?? "Could not create account");
      } else {
        const { error: err } = await authClient.signIn.email({ email, password });
        if (err) throw new Error(err.message ?? "Could not sign in");
      }
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shop-canvas min-h-dvh">
      <div className="absolute top-3 right-3">
        <ThemeToggle />
      </div>
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
        <Link to="/" className="mb-8 flex flex-col gap-2">
          <FoldlineMark wordmark />
          <div className="text-sm text-muted-foreground">Sign in to Skyline QX</div>
        </Link>

        <div className="shop-panel p-6">
          {authEnabled ? (
            <div className="space-y-3">
              {GROK_PROVIDERS.map((p) => (
                <Button
                  key={p.providerId}
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => void signIn(p.providerId, { callbackURL: "/" })}
                >
                  Continue with {p.label}
                </Button>
              ))}
              <div className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-border" />
                <span className="label-stamp">or email</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <form className="grid gap-3" onSubmit={onEmail}>
                {mode === "up" && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>
                )}
                <div className="grid gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "up" ? "new-password" : "current-password"}
                  />
                </div>
                {error && <p className="text-sm text-danger">{error}</p>}
                <Button type="submit" disabled={busy}>
                  {busy
                    ? "Working…"
                    : mode === "up"
                      ? "Create account"
                      : "Sign in with email"}
                </Button>
              </form>
              <button
                type="button"
                className="w-full text-center text-sm text-muted-foreground hover:text-fg"
                onClick={() => {
                  setMode(mode === "up" ? "in" : "up");
                  setError(null);
                }}
              >
                {mode === "up"
                  ? "Already have an account? Sign in"
                  : "New shop? Create an account"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sign-in is disabled.</p>
          )}
        </div>
      </div>
    </div>
  );
}
