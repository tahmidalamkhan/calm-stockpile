import * as React from "react";
import { toast } from "sonner";
import { Plus, ArrowLeft, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/custom-client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, formatDate } from "@/lib/format";
import { matchesSearchText } from "@/lib/product-search";
import {
  openBalance, partyBalance, settledBy,
  type FinanceEntry, type FinanceKind, type FinanceParty,
} from "@/lib/finance";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const today = () => new Date().toISOString().slice(0, 10);
const num = (v: string) => (v.trim() === "" ? 0 : Number(v));

export function useFinance() {
  const [parties, setParties] = React.useState<FinanceParty[]>([]);
  const [entries, setEntries] = React.useState<FinanceEntry[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const load = React.useCallback(async () => {
    const [p, e] = await Promise.all([
      db.from("finance_parties").select("*").order("name"),
      db.from("finance_entries").select("*").order("date").order("created_at"),
    ]);
    if (p.error || e.error) {
      setError((p.error ?? e.error).message);
      return;
    }
    setError(null);
    setParties(p.data ?? []);
    setEntries((e.data ?? []).map((r: FinanceEntry) => ({
      ...r, amount: Number(r.amount), discount: Number(r.discount), tax: Number(r.tax),
    })));
  }, []);
  React.useEffect(() => { void load(); }, [load]);
  return { parties, entries, error, reload: load };
}

export function FinanceLedger({ kind }: { kind: FinanceKind }) {
  const { role } = useAuth();
  const { parties, entries, error, reload } = useFinance();
  const [selected, setSelected] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [partyOpen, setPartyOpen] = React.useState(false);
  const [chargeOpen, setChargeOpen] = React.useState(false);
  const [payOpen, setPayOpen] = React.useState(false);

  const isAR = kind === "receivable";
  const title = isAR ? "Accounts Receivable" : "Accounts Payable";
  const list = parties.filter((p) => p.kind === kind && matchesSearchText(p.name, q));
  const party = parties.find((p) => p.id === selected) ?? null;

  if (error) {
    return (
      <>
        <PageHeader title={title} description="Ledger setup needed" />
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">
          The accounts tables are not set up in the database yet. Run the file
          supabase-sql/03_finance.sql once in your database SQL editor, then reload. ({error})
        </CardContent></Card>
      </>
    );
  }

  if (party) {
    const own = entries.filter((e) => e.party_id === party.id);
    const charges = own.filter((e) => e.entry_type !== "payment");
    const payments = own.filter((e) => e.entry_type === "payment");
    const poOf = (id: string | null) => charges.find((c) => c.id === id)?.po_number || "—";
    const remove = async (id: string) => {
      if (!confirm("Delete this entry?")) return;
      const { error } = await db.from("finance_entries").delete().eq("id", id);
      if (error) toast.error(error.message); else void reload();
    };
    return (
      <>
        <PageHeader
          title={party.name}
          description={`${isAR ? "Receivable" : "Payable"} balance: ${formatCurrency(partyBalance(party.id, entries))}`}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>
              <Button variant="outline" onClick={() => setChargeOpen(true)}><Plus className="mr-1 h-4 w-4" />Add amount / loan</Button>
              <Button onClick={() => setPayOpen(true)}>{isAR ? "Receive payment" : "Make payment"}</Button>
            </div>
          }
        />
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Bills & loans</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>PO number</TableHead>
                <TableHead>Product</TableHead><TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Due</TableHead>{role === "admin" && <TableHead />}
              </TableRow></TableHeader>
              <TableBody>
                {charges.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No entries yet</TableCell></TableRow>}
                {charges.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{formatDate(c.date)}</TableCell>
                    <TableCell><Badge variant={c.entry_type === "loan" ? "secondary" : "outline"} className="capitalize">{c.entry_type === "invoice" ? "Bill" : "Loan"}</Badge></TableCell>
                    <TableCell>{c.po_number || "—"}</TableCell>
                    <TableCell>{c.product_name || "—"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(c.amount)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(openBalance(c, own))}</TableCell>
                    {role === "admin" && <TableCell><Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Payments</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Against PO</TableHead><TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Discount</TableHead><TableHead className="text-right">VAT / Tax</TableHead>
                <TableHead className="text-right">Total cleared</TableHead><TableHead>Note</TableHead>{role === "admin" && <TableHead />}
              </TableRow></TableHeader>
              <TableBody>
                {payments.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No payments yet</TableCell></TableRow>}
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.date)}</TableCell>
                    <TableCell>{poOf(p.parent_id)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.amount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.discount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.tax)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(settledBy(p))}</TableCell>
                    <TableCell>{p.note || "—"}</TableCell>
                    {role === "admin" && <TableCell><Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <ChargeDialog open={chargeOpen} onOpenChange={setChargeOpen} partyId={party.id} onSaved={reload} />
        <PaymentDialog open={payOpen} onOpenChange={setPayOpen} partyId={party.id}
          charges={charges.map((c) => ({ c, due: openBalance(c, own) })).filter((x) => x.due > 0)}
          onSaved={reload} title={isAR ? "Receive payment" : "Make payment"} />
      </>
    );
  }

  const total = list.reduce((s, p) => s + partyBalance(p.id, entries), 0);
  return (
    <>
      <PageHeader
        title={title}
        description={isAR ? "People and companies who owe you, including loans you gave." : "People and companies you owe, including loans you took."}
        actions={<Button onClick={() => setPartyOpen(true)}><Plus className="mr-1 h-4 w-4" />Add {isAR ? "customer" : "vendor"}</Button>}
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">{list.length} {isAR ? "customers" : "vendors"}</CardTitle>
          <Input className="max-w-xs" placeholder="Search name…" value={q} onChange={(e) => setQ(e.target.value)} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
            <TableBody>
              {list.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">None yet</TableCell></TableRow>}
              {list.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelected(p.id)}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.phone || "—"}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(partyBalance(p.id, entries))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            {role === "admin" && list.length > 0 && (
              <TableFooter><TableRow><TableCell colSpan={2}>Total</TableCell><TableCell className="text-right">{formatCurrency(total)}</TableCell></TableRow></TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
      <PartyDialog open={partyOpen} onOpenChange={setPartyOpen} kind={kind} onSaved={reload} />
    </>
  );
}

type DlgProps = { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void | Promise<void> };

function PartyDialog({ open, onOpenChange, kind, onSaved }: DlgProps & { kind: FinanceKind }) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const save = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    const { error } = await db.from("finance_parties").insert({ kind, name: name.trim(), phone: phone.trim() || null });
    setBusy(false);
    if (error) return toast.error(error.message);
    setName(""); setPhone(""); onOpenChange(false); await onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add person or company</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Phone (optional)</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={save} disabled={busy || !name.trim()}>{busy ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChargeDialog({ open, onOpenChange, partyId, onSaved }: DlgProps & { partyId: string }) {
  const [type, setType] = React.useState<"invoice" | "loan">("invoice");
  const [po, setPo] = React.useState("");
  const [date, setDate] = React.useState(today());
  const [product, setProduct] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const save = async () => {
    if (num(amount) <= 0 || busy) return;
    setBusy(true);
    const { error } = await db.from("finance_entries").insert({
      party_id: partyId, entry_type: type, po_number: po.trim() || null, date,
      product_name: product.trim() || null, amount: num(amount), note: note.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setPo(""); setProduct(""); setAmount(""); setNote(""); onOpenChange(false); await onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add amount</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as "invoice" | "loan")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="invoice">Bill / PO</SelectItem><SelectItem value="loan">Loan</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label>PO number</Label><Input value={po} onChange={(e) => setPo(e.target.value)} /></div>
          <div><Label>Amount</Label><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Product name</Label><Input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Typed manually, not linked to stock" /></div>
          <div className="sm:col-span-2"><Label>Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={save} disabled={busy || num(amount) <= 0}>{busy ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({ open, onOpenChange, partyId, charges, onSaved, title }: DlgProps & {
  partyId: string; charges: { c: FinanceEntry; due: number }[]; title: string;
}) {
  const [chargeId, setChargeId] = React.useState("");
  const [date, setDate] = React.useState(today());
  const [amount, setAmount] = React.useState("");
  const [discount, setDiscount] = React.useState("");
  const [tax, setTax] = React.useState("");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const due = charges.find((x) => x.c.id === chargeId)?.due ?? 0;
  const cleared = num(amount) + num(discount) + num(tax);
  const invalid = !chargeId || cleared <= 0 || cleared > due + 0.001 || [amount, discount, tax].some((v) => num(v) < 0 || Number.isNaN(num(v)));
  const save = async () => {
    if (invalid || busy) return;
    setBusy(true);
    const { error } = await db.from("finance_entries").insert({
      party_id: partyId, entry_type: "payment", parent_id: chargeId, date,
      amount: num(amount), discount: num(discount), tax: num(tax), note: note.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setChargeId(""); setAmount(""); setDiscount(""); setTax(""); setNote(""); onOpenChange(false); await onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Against PO / loan</Label>
            <Select value={chargeId} onValueChange={setChargeId}>
              <SelectTrigger><SelectValue placeholder={charges.length ? "Select" : "Nothing due"} /></SelectTrigger>
              <SelectContent>
                {charges.map(({ c, due }) => (
                  <SelectItem key={c.id} value={c.id}>
                    {(c.po_number || (c.entry_type === "loan" ? "Loan" : "Bill"))} · {formatDate(c.date)}{c.product_name ? ` · ${c.product_name}` : ""} — due {formatCurrency(due)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label>Amount paid</Label><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><Label>Discount</Label><Input inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
          <div><Label>VAT / Tax deducted</Label><Input inputMode="decimal" value={tax} onChange={(e) => setTax(e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Clears {formatCurrency(cleared)} of {formatCurrency(due)} due · remaining {formatCurrency(Math.max(0, due - cleared))}
            {cleared > due + 0.001 && <span className="text-destructive"> — more than what is due</span>}
          </p>
        </div>
        <DialogFooter><Button onClick={save} disabled={busy || invalid}>{busy ? "Saving…" : "Save payment"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
