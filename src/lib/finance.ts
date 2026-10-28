// Browser-safe AR/AP ledger math (no inventory link).
export type FinanceKind = "receivable" | "payable";
export type FinanceParty = { id: string; kind: FinanceKind; name: string; phone?: string | null };
export type FinanceItem = { name: string; quantity: number; unitPrice: number };

export const itemTotal = (item: FinanceItem) => Math.round(item.quantity * item.unitPrice * 100) / 100;
export const billTotal = (items: FinanceItem[]) =>
  Math.round(items.reduce((sum, item) => sum + itemTotal(item), 0) * 100) / 100;

export function validBillItems(items: FinanceItem[]): boolean {
  return items.length > 0 && items.every((item) => item.name.trim().length > 0 &&
    Number.isFinite(item.quantity) && item.quantity > 0 &&
    Number.isFinite(item.unitPrice) && item.unitPrice >= 0) &&
    Number.isFinite(billTotal(items)) && billTotal(items) > 0;
}

/** Versioned payload in the existing text field; legacy product names remain plain text. */
export function encodeBillItems(items: FinanceItem[]): string {
  if (!validBillItems(items)) throw new Error("Enter a product name, positive quantity and valid unit price for every item.");
  return JSON.stringify({ type: "stockhub-bill-items", version: 1,
    items: items.map((item) => ({ ...item, name: item.name.trim() })) });
}

export function decodeBillItems(value: string | null): FinanceItem[] | null {
  if (!value) return null;
  try {
    const data = JSON.parse(value);
    if (data?.type !== "stockhub-bill-items" || data.version !== 1 || !Array.isArray(data.items)) return null;
    if (!data.items.every((item: FinanceItem) => item && typeof item.name === "string" &&
      typeof item.quantity === "number" && typeof item.unitPrice === "number") || !validBillItems(data.items)) return null;
    return data.items;
  } catch { return null; }
}

export function billProductLabel(value: string | null): string {
  return decodeBillItems(value)?.map((item) => item.name).join(", ") ?? value ?? "";
}
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
