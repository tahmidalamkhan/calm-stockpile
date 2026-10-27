import { test } from "node:test";
import assert from "node:assert/strict";
import { openBalance, partyBalance, kindTotal, type FinanceEntry } from "./finance";

const e = (o: Partial<FinanceEntry>): FinanceEntry => ({
  id: "x", party_id: "p1", entry_type: "invoice", parent_id: null, po_number: null,
  date: "2026-10-27", product_name: null, amount: 0, discount: 0, tax: 0, note: null, ...o,
});

const entries = [
  e({ id: "inv1", amount: 10000, po_number: "PO-1" }),
  e({ id: "pay1", entry_type: "payment", parent_id: "inv1", amount: 8500, discount: 500, tax: 500 }),
  e({ id: "loan1", entry_type: "loan", amount: 2000 }),
];

test("payment with discount and VAT deduction reduces that PO only", () => {
  assert.equal(openBalance(entries[0], entries), 500);
  assert.equal(openBalance(entries[2], entries), 2000);
});

test("party balance includes loans", () => {
  assert.equal(partyBalance("p1", entries), 2500);
});

test("totals only count parties of that kind", () => {
  const parties = [
    { id: "p1", kind: "receivable" as const, name: "A" },
    { id: "p2", kind: "payable" as const, name: "B" },
  ];
  assert.equal(kindTotal("receivable", parties, entries), 2500);
  assert.equal(kindTotal("payable", parties, entries), 0);
});
