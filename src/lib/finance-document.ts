import { billProductLabel, decodeBillItems, itemTotal, settledBy, canViewFinanceParty, isReturnEntry, returnLabel, type FinanceEntry, type FinanceParty } from "./finance";

export const invoiceShops = [
  { id: "scale-house", name: "SCALE HOUSE", address: "261 BANGSHAL ROAD DHAKA", phone: "+880 1764-523321" },
  { id: "al-habib", name: "AL HABIB", address: "65 NAWABPUR ROAD DHAKA", phone: "01922795120" },
] as const;
export type InvoiceShop = typeof invoiceShops[number];
const money = (value: number) => Math.round(value * 100) / 100;
const change = (entry: FinanceEntry) => entry.entry_type === "payment" ? -settledBy(entry) : Number(entry.amount);

export function orderedPartyEntries(partyId: string, entries: FinanceEntry[]) {
  return entries.filter((entry) => entry.party_id === partyId)
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => a.entry.date.localeCompare(b.entry.date) ||
      ((a.entry as FinanceEntry & { created_at?: string }).created_at ?? "").localeCompare((b.entry as FinanceEntry & { created_at?: string }).created_at ?? "") || a.index - b.index)
    .map(({ entry }) => entry);
}

export function buildFinanceInvoice(party: FinanceParty, entries: FinanceEntry[], billId: string, role: string | null) {
  if (!canViewFinanceParty(party, role)) throw new Error("Recipient is not available to this account.");
  const own = orderedPartyEntries(party.id, entries);
  const index = own.findIndex((entry) => entry.id === billId && entry.entry_type !== "payment");
  if (index < 0) throw new Error("Select a bill or loan for this recipient.");
  const bill = own[index];
  const previousBalance = money(own.slice(0, index).reduce((sum, entry) => sum + change(entry), 0));
  const settlements = own.filter((entry) => entry.entry_type === "payment" && entry.parent_id === bill.id);
  const payments = settlements.filter((e) => !isReturnEntry(e));
  const returned = money(settlements.filter(isReturnEntry).reduce((sum, entry) => sum + settledBy(entry), 0));
  const paid = money(payments.reduce((sum, entry) => sum + Number(entry.amount), 0));
  const discount = money(payments.reduce((sum, entry) => sum + Number(entry.discount), 0));
  const tax = money(payments.reduce((sum, entry) => sum + Number(entry.tax), 0));
  const subtotal = Number(bill.amount);
  const totalDue = money(previousBalance + subtotal);
  return { bill, items: decodeBillItems(bill.product_name), previousBalance, subtotal, totalDue, paid, discount, tax, returned,
    outstanding: money(totalDue - paid - discount - tax - returned) };
}

export function buildFinanceStatement(party: FinanceParty, entries: FinanceEntry[], role: string | null) {
  if (!canViewFinanceParty(party, role)) throw new Error("Recipient is not available to this account.");
  const own = orderedPartyEntries(party.id, entries);
  let balance = 0;
  const rows = own.map((entry) => {
    balance = money(balance + change(entry));
    const parent = own.find((item) => item.id === entry.parent_id);
    const isReturn = isReturnEntry(entry);
    const isPay = entry.entry_type === "payment" && !isReturn;
    const details = decodeBillItems(entry.product_name)?.map((item) => `${item.name} — ${item.quantity} × ${item.unitPrice.toFixed(2)} = ${itemTotal(item).toFixed(2)}`).join("\n") ?? billProductLabel(entry.product_name);
    return { entry, reference: entry.po_number || parent?.po_number || "—",
      description: isReturn ? `Goods return\n${returnLabel(entry.product_name)}` : isPay ? "Payment" : entry.entry_type === "loan" ? "Loan" : details || "Bill",
      charge: entry.entry_type === "payment" ? 0 : Number(entry.amount),
      paid: isPay ? Number(entry.amount) : 0,
      returned: isReturn ? settledBy(entry) : 0,
      discount: isPay ? Number(entry.discount) : 0,
      tax: isPay ? Number(entry.tax) : 0, balance };
  });
  return { rows, balance };
}
