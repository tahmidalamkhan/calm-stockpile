import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Minus, ArrowLeft, Trash2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/custom-client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  accountBalance, canAccessBankAccounts, canViewBankAccount, runningRows,
  type BankAccount, type BankTransaction,
} from "@/lib/bank-accounts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const today = () => new Date().toISOString().slice(0, 10);

export const Route = createFileRoute("/accounts")({
  head: () => ({
    meta: [
      { title: "Bank & Cash Accounts — StockHub" },
      { name: "description", content: "Manage bank and cash accounts, deposits, withdrawals and balances." },
      { property: "og:title", content: "Bank & Cash Accounts — StockHub" },
      { property: "og:description", content: "Manage bank and cash accounts, deposits, withdrawals and balances." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountsPage,
});

function AccountsPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [accounts, setAccounts] = React.useState<BankAccount[]>([]);
  const [txs, setTxs] = React.useState<BankTransaction[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [newOpen, setNewOpen] = React.useState(false);
  const [txDir, setTxDir] = React.useState<"in" | "out" | null>(null);

  const load = React.useCallback(async () => {
    const [a, t] = await Promise.all([
      db.from("bank_accounts").select("*").order("name"),
      db.from("bank_transactions").select("*"),
    ]);
    if (a.error || t.error) { setError((a.error ?? t.error).message); return; }
    setError(null);
    setAccounts(a.data ?? []);
    setTxs((t.data ?? []).map((x: BankTransaction) => ({ ...x, amount: Number(x.amount) })));
  }, []);
  React.useEffect(() => { if (canAccessBankAccounts(role)) void load(); }, [role, load]);

  if (!canAccessBankAccounts(role)) {
    return <div className="p-6 text-muted-foreground">You don't have access to accounts.</div>;
  }
  const visible = accounts.filter((a) => canViewBankAccount(a, role));
  const current = visible.find((a) => a.id === selected) ?? null;

  const toggleHidden = async (a: BankAccount) => {
    const { error } = await db.from("bank_accounts").update({ hidden_from_manager: !a.hidden_from_manager }).eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success(a.hidden_from_manager ? "Now visible to managers" : "Hidden from managers");
    void load();
  };
  const remove = async (a: BankAccount) => {
    if (!confirm(`Delete account "${a.name}" and all its transactions?`)) return;
    const { error } = await db.from("bank_accounts").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    setSelected(null); void load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Bank & Cash Accounts" description="Create accounts and add or subtract amounts." />
      {error && (
        <Card><CardContent className="pt-6 text-sm text-destructive">
          Accounts could not load: {error}. Run supabase-sql/06_bank_accounts.sql on your database first.
        </CardContent></Card>
      )}
      {!current ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Accounts</CardTitle>
            <Button onClick={() => setNewOpen(true)}><Plus className="mr-1 h-4 w-4" />New account</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Bank</TableHead><TableHead>Account no.</TableHead>
                <TableHead className="text-right">Balance</TableHead>{isAdmin && <TableHead className="w-24" />}
              </TableRow></TableHeader>
              <TableBody>
                {visible.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No accounts yet.</TableCell></TableRow>}
                {visible.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => setSelected(a.id)}>
                    <TableCell className="font-medium">{a.name}{isAdmin && a.hidden_from_manager && <Badge variant="secondary" className="ml-2">Hidden from manager</Badge>}</TableCell>
                    <TableCell>{a.bank_name || "—"}</TableCell>
                    <TableCell>{a.account_number || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(accountBalance(txs, a.id))}</TableCell>
                    {isAdmin && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" title={a.hidden_from_manager ? "Show to managers" : "Hide from managers"} onClick={() => toggleHidden(a)}>
                            {a.hidden_from_manager ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => remove(a)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setSelected(null)}><ArrowLeft className="h-4 w-4" /></Button>
              <div>
                <CardTitle>{current.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{[current.bank_name, current.account_number].filter(Boolean).join(" · ") || "Cash"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="mr-2 text-lg font-semibold tabular-nums">{formatCurrency(accountBalance(txs, current.id))}</span>
              <Button onClick={() => setTxDir("in")}><Plus className="mr-1 h-4 w-4" />Add amount</Button>
              <Button variant="outline" onClick={() => setTxDir("out")}><Minus className="mr-1 h-4 w-4" />Subtract amount</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Note</TableHead><TableHead className="text-right">Added</TableHead>
                <TableHead className="text-right">Subtracted</TableHead><TableHead className="text-right">Balance</TableHead>
                {isAdmin && <TableHead className="w-12" />}
              </TableRow></TableHeader>
              <TableBody>
                {runningRows(txs, current.id).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No transactions yet.</TableCell></TableRow>}
                {runningRows(txs, current.id).reverse().map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{formatDate(t.date)}</TableCell>
                    <TableCell>{t.note || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.direction === "in" ? formatCurrency(t.amount) : ""}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.direction === "out" ? formatCurrency(t.amount) : ""}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(t.balance)}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={async () => {
                          if (!confirm("Delete this transaction?")) return;
                          const { error } = await db.from("bank_transactions").delete().eq("id", t.id);
                          if (error) toast.error(error.message); else void load();
                        }}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <NewAccountDialog open={newOpen} onOpenChange={setNewOpen} isAdmin={isAdmin} onSaved={load} />
      {current && txDir && (
        <TxDialog account={current} direction={txDir} onClose={() => setTxDir(null)} onSaved={load}
          balance={accountBalance(txs, current.id)} />
      )}
    </div>
  );
}

function NewAccountDialog({ open, onOpenChange, isAdmin, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; isAdmin: boolean; onSaved: () => void }) {
  const [name, setName] = React.useState("");
  const [bank, setBank] = React.useState("");
  const [number, setNumber] = React.useState("");
  const [opening, setOpening] = React.useState("");
  const [hidden, setHidden] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const save = async () => {
    if (!name.trim()) return toast.error("Enter an account name");
    const open = opening.trim() === "" ? 0 : Number(opening);
    if (!Number.isFinite(open) || open < 0) return toast.error("Opening balance must be zero or more");
    setBusy(true);
    const { data, error } = await db.from("bank_accounts").insert({
      name: name.trim(), bank_name: bank.trim() || null, account_number: number.trim() || null,
      hidden_from_manager: isAdmin && hidden,
    }).select().single();
    if (!error && open > 0) {
      const r = await db.from("bank_transactions").insert({ account_id: data.id, direction: "in", amount: open, date: today(), note: "Opening balance" });
      if (r.error) toast.error(r.error.message);
    }
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created");
    setName(""); setBank(""); setNumber(""); setOpening(""); setHidden(false);
    onOpenChange(false); onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New account</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Account name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main current account / Cash" /></div>
          <div><Label>Bank name</Label><Input value={bank} onChange={(e) => setBank(e.target.value)} /></div>
          <div><Label>Account number</Label><Input value={number} onChange={(e) => setNumber(e.target.value)} /></div>
          <div><Label>Opening balance</Label><Input type="number" inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="0" /></div>
          {isAdmin && (
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={hidden} onCheckedChange={(v) => setHidden(v === true)} />Hide from manager</label>
          )}
        </div>
        <DialogFooter><Button onClick={save} disabled={busy}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TxDialog({ account, direction, balance, onClose, onSaved }: { account: BankAccount; direction: "in" | "out"; balance: number; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(today());
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const save = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return toast.error("Enter an amount greater than zero");
    setBusy(true);
    const { error } = await db.from("bank_transactions").insert({ account_id: account.id, direction, amount: n, date, note: note.trim() || null });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(direction === "in" ? "Amount added" : "Amount subtracted");
    onClose(); onSaved();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{direction === "in" ? "Add amount" : "Subtract amount"} — {account.name}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Current balance: {formatCurrency(balance)}</p>
        <div className="space-y-3">
          <div><Label>Amount</Label><Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></div>
          <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label>Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Deposit, withdrawal, bank charge" /></div>
        </div>
        <DialogFooter><Button onClick={save} disabled={busy}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
