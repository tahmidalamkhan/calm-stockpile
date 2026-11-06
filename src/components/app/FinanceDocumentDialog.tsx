import * as React from "react";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { invoiceShops, orderedPartyEntries } from "@/lib/finance-document";
import { createFinanceDocumentPdf } from "@/lib/finance-document-pdf";
import { canViewFinanceParty, type FinanceEntry, type FinanceParty } from "@/lib/finance";
import { formatDate } from "@/lib/format";

export function FinanceDocumentDialog({ open, onOpenChange, party, entries, role, initialBillId }: {
  open: boolean; onOpenChange: (open: boolean) => void; party: FinanceParty; entries: FinanceEntry[]; role: string | null; initialBillId: string | null;
}) {
  const [shopId, setShopId] = React.useState<string>(invoiceShops[0].id);
  const [mode, setMode] = React.useState("invoice");
  const [billId, setBillId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const running = React.useRef(false);
  const bills = orderedPartyEntries(party.id, entries).filter((entry) => entry.entry_type !== "payment").reverse();
  React.useEffect(() => {
    if (!open) return;
    try {
      const saved = window.localStorage.getItem("stockhub.invoice-shop");
      if (invoiceShops.some((shop) => shop.id === saved) && saved) setShopId(saved);
    } catch { /* Storage is optional. */ }
    setMode(initialBillId || bills.length ? "invoice" : "statement");
    setBillId(initialBillId ?? bills[0]?.id ?? "");
  }, [open, party.id, initialBillId]);
  const shop = invoiceShops.find((item) => item.id === shopId) ?? invoiceShops[0];
  const invalid = busy || !canViewFinanceParty(party, role) || (mode === "invoice" && !bills.some((bill) => bill.id === billId));
  const generate = async (preview: boolean) => {
    if (invalid || running.current) return;
    // Open synchronously so browsers do not block the preview after PDF generation.
    const tab = preview ? window.open("about:blank", "_blank") : null;
    if (preview && !tab) { toast.error("Allow pop-ups to open the print preview."); return; }
    running.current = true; setBusy(true);
    try {
      const doc = await createFinanceDocumentPdf(party, entries, shop, role, mode === "invoice" ? billId : undefined);
      const filename = `${shop.id}-${mode}-${party.name.replace(/[^a-z0-9-]/gi, "_")}.pdf`;
      if (preview && tab) {
        tab.opener = null;
        const url = URL.createObjectURL(doc.output("blob"));
        tab.location.href = url;
        window.setTimeout(() => URL.revokeObjectURL(url), 300000);
      } else doc.save(filename);
    } catch (error) {
      tab?.close(); toast.error(error instanceof Error ? error.message : "Could not generate this document.");
    } finally { running.current = false; setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={(value) => { if (!busy) onOpenChange(value); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto">
      <DialogHeader><DialogTitle>Invoice / Statement</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2"><Label>Shop header</Label>
          <Select value={shopId} onValueChange={(value) => { setShopId(value); try { window.localStorage.setItem("stockhub.invoice-shop", value); } catch { /* Optional. */ } }} disabled={busy}>
            <SelectTrigger aria-label="Shop header"><SelectValue /></SelectTrigger>
            <SelectContent>{invoiceShops.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground">{shop.address}<br />{shop.phone}</div>
        </div>
        <div className="space-y-2"><Label>Document</Label>
          <Select value={mode} onValueChange={setMode} disabled={busy}>
            <SelectTrigger aria-label="Document type"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="invoice" disabled={!bills.length}>Bill + previous balance</SelectItem><SelectItem value="statement">Full statement</SelectItem></SelectContent>
          </Select>
        </div>
        {mode === "invoice" && <div className="space-y-2"><Label>Bill / PO / Loan</Label>
          <Select value={billId} onValueChange={setBillId} disabled={busy}>
            <SelectTrigger aria-label="Bill to export"><SelectValue placeholder="Select bill" /></SelectTrigger>
            <SelectContent>{bills.map((bill) => <SelectItem key={bill.id} value={bill.id}>{bill.po_number || (bill.entry_type === "loan" ? "Loan" : "Bill")} · {formatDate(bill.date)} · {bill.id.slice(0, 8)}</SelectItem>)}</SelectContent>
          </Select>
        </div>}
      </div>
      <DialogFooter className="gap-2">
        <Button variant="outline" disabled={invalid} onClick={() => void generate(true)}><Printer className="mr-2 h-4 w-4" />Print preview</Button>
        <Button disabled={invalid} onClick={() => void generate(false)}><Download className="mr-2 h-4 w-4" />{busy ? "Generating…" : "Download PDF"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}