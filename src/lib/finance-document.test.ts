import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFinanceInvoice, buildFinanceStatement, invoiceShops } from "./finance-document";
import { encodeBillItems, encodeFinancePartyPrivacy, type FinanceEntry, type FinanceParty } from "./finance";

const party: FinanceParty = { id: "p", kind: "receivable", name: "Customer" };
const entry = (id: string, date: string, amount: number, extra: Partial<FinanceEntry> = {}): FinanceEntry => ({ id, date, amount, party_id: "p", entry_type: "invoice", parent_id: null, po_number: id, product_name: null, discount: 0, tax: 0, note: null, ...extra });
const entries = [entry("old", "2026-11-01", 1000), entry("prior-payment", "2026-11-02", 300, { entry_type: "payment", parent_id: "old", discount: 50, tax: 50 }), entry("bill", "2026-11-03", 350, { product_name: encodeBillItems([{ name: "Motor", quantity: 2, unitPrice: 100 }, { name: "Wheel", quantity: 3, unitPrice: 50 }]) }), entry("paid", "2026-11-04", 100, { entry_type: "payment", parent_id: "bill", discount: 20, tax: 30 }), entry("later", "2026-11-05", 500)];
test("shop headers retain the user's exact company details", () => {
  assert.deepEqual(invoiceShops.map(({ name, address, phone }) => ({ name, address, phone })), [
    { name: "SCALE HOUSE", address: "261 BANGSHAL ROAD DHAKA", phone: "+880 1764-523321" },
    { name: "AL HABIB", address: "65 NAWABPUR ROAD DHAKA", phone: "01922795120" },
  ]);
});
test("invoice previous balance includes prior payments, discounts and tax but excludes later bills", () => {
  const report = buildFinanceInvoice(party, entries, "bill", "staff");
  assert.equal(report.previousBalance, 600);
  assert.equal(report.subtotal, 350);
  assert.equal(report.totalDue, 950);
  assert.equal(report.paid, 100);
  assert.equal(report.discount, 20);
  assert.equal(report.tax, 30);
  assert.equal(report.outstanding, 800);
  assert.equal(report.items?.length, 2);
});
test("AR and AP statements include all loans, bills and settlement deductions in running balances", () => {
  for (const kind of ["receivable", "payable"] as const) {
    const report = buildFinanceStatement({ ...party, kind }, [...entries, entry("loan", "2026-11-06", 200, { entry_type: "loan" })], "staff");
    assert.deepEqual(report.rows.map((row) => row.balance), [1000, 600, 950, 800, 1300, 1500]);
    assert.equal(report.balance, 1500);
  }
});
test("document exports reject hidden recipients for staff and unrelated bills", () => {
  const hidden = { ...party, notes: encodeFinancePartyPrivacy(null, true) };
  assert.throws(() => buildFinanceInvoice(hidden, entries, "bill", "staff"));
  assert.throws(() => buildFinanceStatement(hidden, entries, "staff"));
  assert.equal(buildFinanceInvoice(hidden, entries, "bill", "admin").subtotal, 350);
  assert.throws(() => buildFinanceInvoice(party, [entry("other", "2026-11-03", 10, { party_id: "other" })], "other", "admin"));
});
test("legacy product names and same-day saved ordering remain readable", () => {
  const sameDay = [entry("first", "2026-11-01", 120), entry("second", "2026-11-01", 50, { product_name: "Legacy item" })];
  assert.equal(buildFinanceInvoice(party, sameDay, "second", "admin").previousBalance, 120);
  assert.equal(buildFinanceStatement(party, sameDay, "admin").rows[1].description, "Legacy item");
});