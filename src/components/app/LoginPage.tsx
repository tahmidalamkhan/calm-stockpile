import * as React from "react";
import { Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/custom-client";

export function LoginPage() {
  const { signIn } = useAuth();
  const [mode, setMode] = React.useState<"login" | "signup">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;

        if (data.user) {
          // Try to claim the first admin role. Safe-by-design: if any admin
          // already exists, this insert is blocked by RLS / unique
          // constraints. On a fresh DB it succeeds and the new user is admin.
          const { error: roleErr } = await supabase
            .from("user_roles")
            .insert({ user_id: data.user.id, role: "admin" });

          // Everyone else needs explicit admin approval before access.
          await requestAccess(
            data.user.id,
            email,
            roleErr ? "pending" : "approved",
          );

          if (roleErr) {
            toast.success(
              "Account created. An admin must approve your access before you can sign in.",
            );
            setMode("login");
            return;
          }
        }

        if (data.session) {
          toast.success("Account created. Signing you in…");
        } else {
          toast.success("Account created. Check your email to confirm, then sign in.");
          setMode("login");
        }

      } else {
        await signIn(email, password);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const onLoginFallback = async () => {
    // If login fails because no user exists, the user can switch to signup.
    setMode("signup");
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
            {mode === "signup"
              ? "Create your account"
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
                minLength={mode === "signup" ? 8 : undefined}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
              {mode === "signup" && (
                <p className="text-xs text-muted-foreground">Min 8 characters.</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy
                ? "Please wait…"
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </Button>
            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
