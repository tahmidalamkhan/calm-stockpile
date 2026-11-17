import * as React from "react";
import { Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { inactivityState, readActivityTimestamp, usesInactivityLogout } from "@/lib/session-inactivity";

type Props = { userId: string | null; role: string | null; onExpire: () => Promise<void> };

export function SessionInactivityWarning({ userId, role, onExpire }: Props) {
  const [seconds, setSeconds] = React.useState<number | null>(null);
  const renew = React.useRef<() => void>(() => {});
  const expire = React.useRef<() => void>(() => {});

  React.useEffect(() => {
    setSeconds(null);
    if (!userId || !usesInactivityLogout(role)) return;
    const key = `stockhub.lastActivity.${userId}`;
    let stopped = false;
    let lastActivity = Date.now();
    const readShared = () => {
      try { return readActivityTimestamp(localStorage.getItem(key), Date.now()); }
      catch { return null; }
    };
    const writeShared = () => {
      try { localStorage.setItem(key, String(lastActivity)); } catch { /* In-memory tracking still works. */ }
    };
    lastActivity = readShared() ?? lastActivity;
    writeShared();

    const signOut = () => {
      if (stopped) return;
      stopped = true;
      setSeconds(null);
      void onExpire();
    };
    const check = () => {
      if (stopped) return inactivityState(lastActivity, Date.now());
      const shared = readShared();
      if (shared !== null) lastActivity = Math.max(lastActivity, shared);
      const state = inactivityState(lastActivity, Date.now());
      if (state.expired) signOut();
      else setSeconds(state.warning ? state.secondsRemaining : null);
      return state;
    };
    const recordActivity = (explicit = false) => {
      const state = check();
      // Background activity and a late click must never revive an expired session.
      if (stopped || state.expired || (state.warning && !explicit)) return;
      const now = Date.now();
      if (!explicit && now - lastActivity < 2000) return;
      lastActivity = now;
      writeShared();
      setSeconds(null);
    };
    renew.current = () => recordActivity(true);
    expire.current = signOut;
    const activity = () => recordActivity();
    const resume = () => { check(); };
    const storage = (event: StorageEvent) => { if (event.key === key) check(); };
    const events = ["pointermove", "pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, activity, { passive: true, capture: true }));
    window.addEventListener("focus", resume);
    window.addEventListener("pageshow", resume);
    window.addEventListener("storage", storage);
    document.addEventListener("visibilitychange", resume);
    const timer = window.setInterval(check, 1000);
    check();
    return () => {
      stopped = true;
      window.clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, activity, true));
      window.removeEventListener("focus", resume);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("storage", storage);
      document.removeEventListener("visibilitychange", resume);
      renew.current = () => {};
      expire.current = () => {};
    };
  }, [userId, role, onExpire]);

  return (
    <AlertDialog open={seconds !== null}>
      <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Still there?</AlertDialogTitle>
          <AlertDialogDescription>
            You’ll be logged out in {seconds ?? 60} seconds after 10 minutes of inactivity for security.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:space-x-0">
          <Button variant="outline" onClick={() => expire.current()}><LogOut className="mr-2 h-4 w-4" /> Log out now</Button>
          <Button onClick={() => renew.current()}>Stay logged in</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}