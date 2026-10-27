// Browser-safe AR/AP ledger math (no inventory link).
export type FinanceKind = "receivable" | "payable";
export type FinanceParty = { id: string; kind: FinanceKind; name: string; phone?: string | null };
export type FinanceEntry = {
  id: string;
  party_id: string;
  entry_type: "invoice" | "loan" | "payment";
  parent_id: string | null;
  po_number: string | null;
  date: string;
  product_name: string | null;
  amount: number;
  discount: number;
  tax: number;
  note: string | null;
};

/** Amount a settlement clears: cash paid + discount + VAT/tax deducted. */
export const settledBy = (p: FinanceEntry) =>
  Number(p.amount) + Number(p.discount) + Number(p.tax);

export function openBalance(charge: FinanceEntry, entries: FinanceEntry[]): number {
  const settled = entries
    .filter((e) => e.entry_type === "payment" && e.parent_id === charge.id)
    .reduce((s, e) => s + settledBy(e), 0);
  return Math.round((Number(charge.amount) - settled) * 100) / 100;
}

export function partyBalance(partyId: string, entries: FinanceEntry[]): number {
  const own = entries.filter((e) => e.party_id === partyId);
  return own
    .filter((e) => e.entry_type !== "payment")
    .reduce((s, c) => s + openBalance(c, own), 0);
}

export function kindTotal(kind: FinanceKind, parties: FinanceParty[], entries: FinanceEntry[]) {
  return parties
    .filter((p) => p.kind === kind)
    .reduce((s, p) => s + partyBalance(p.id, entries), 0);
}
