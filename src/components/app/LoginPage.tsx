import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { adminExists, bootstrapAdmin } from "@/lib/auth.functions";

export function LoginPage() {
  const { signIn } = useAuth();
  const checkAdmin = useServerFn(adminExists);
  const doBootstrap = useServerFn(bootstrapAdmin);
  const [needsBootstrap, setNeedsBootstrap] = React.useState(false);
  const [mode, setMode] = React.useState<"login" | "bootstrap">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    checkAdmin().then((r) => {
      setNeedsBootstrap(!r.exists);
      if (!r.exists) setMode("bootstrap");
    });
  }, [checkAdmin]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "bootstrap") {
        await doBootstrap({ data: { email, password } });
        toast.success("Admin account created. Signing you in…");
        await signIn(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Boxes className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl">StockHub</CardTitle>
          <CardDescription>
            {mode === "bootstrap"
              ? "Create the first admin account to get started"
              : "Sign in to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "bootstrap" ? 8 : undefined}
                autoComplete={mode === "bootstrap" ? "new-password" : "current-password"}
              />
              {mode === "bootstrap" && (
                <p className="text-xs text-muted-foreground">Min 8 characters.</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy
                ? "Please wait…"
                : mode === "bootstrap"
                  ? "Create admin & sign in"
                  : "Sign in"}
            </Button>
            {needsBootstrap && mode === "login" && (
              <Button
                type="button"
                variant="link"
                className="w-full"
                onClick={() => setMode("bootstrap")}
              >
                No admin yet? Create one
              </Button>
            )}
            {!needsBootstrap && (
              <p className="text-center text-xs text-muted-foreground">
                Accounts are created by your administrator.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
