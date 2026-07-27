import * as React from "react";
import { Clock, LogOut, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export function PendingApprovalPage() {
  const { user, access, signOut, refreshRole } = useAuth();
  const [checking, setChecking] = React.useState(false);
  const rejected = access === "rejected";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            {rejected ? <ShieldAlert className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
          </div>
          <CardTitle className="text-2xl">
            {rejected ? "Access denied" : "Waiting for approval"}
          </CardTitle>
          <CardDescription>
            {rejected
              ? "An admin has declined access for this account."
              : "Your account was created. An admin must grant you permission before you can use StockHub."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-center text-sm text-muted-foreground">{user?.email}</p>
          {!rejected && (
            <Button
              className="w-full"
              disabled={checking}
              onClick={async () => {
                setChecking(true);
                await refreshRole();
                setChecking(false);
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {checking ? "Checking…" : "Check again"}
            </Button>
          )}
          <Button variant="outline" className="w-full" onClick={() => void signOut()}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
