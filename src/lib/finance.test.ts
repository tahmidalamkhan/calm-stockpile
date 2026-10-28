import { test } from "node:test";
import assert from "node:assert/strict";
import { openBalance, partyBalance, kindTotal, billTotal, itemTotal, validBillItems, encodeBillItems, decodeBillItems, billProductLabel, type FinanceEntry } from "./finance";

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

const items = [{ name: "Motor", quantity: 2, unitPrice: 100 }, { name: "Wheel", quantity: 3, unitPrice: 50 }];
test("multiple manual products calculate a single PO total", () => {
  assert.equal(billTotal(items), 350);
  assert.equal(itemTotal({ name: "Part", quantity: 3, unitPrice: 0.1 }), 0.3);
});
test("multi-product bills round-trip through the existing field", () => {
  assert.deepEqual(decodeBillItems(encodeBillItems(items)), items);
  assert.equal(billProductLabel(encodeBillItems(items)), "Motor, Wheel");
});
test("legacy single-product entries remain readable", () => {
  assert.equal(decodeBillItems("Original motor"), null);
  assert.equal(billProductLabel("Original motor"), "Original motor");
  assert.equal(decodeBillItems('{"type":"stockhub-bill-items","version":1,"items":[null]}'), null);
});
test("incomplete or invalid product lines cannot be saved", () => {
  for (const bad of [[], [{ name: "", quantity: 1, unitPrice: 50 }], [{ name: "Part", quantity: 0, unitPrice: 50 }], [{ name: "Part", quantity: 1, unitPrice: -1 }], [{ name: "Part", quantity: NaN, unitPrice: 50 }], [{ name: "Part", quantity: 1, unitPrice: Infinity }]]) {
    assert.equal(validBillItems(bad), false);
    assert.throws(() => encodeBillItems(bad));
  }
});
test("settlements reduce the complete multi-product PO without affecting another PO", () => {
  const bill = e({ id: "multi", amount: billTotal(items), product_name: encodeBillItems(items) });
  const other = e({ id: "other", amount: 100 });
  const payment = e({ entry_type: "payment", parent_id: "multi", amount: 200, discount: 25, tax: 25 });
  assert.equal(openBalance(bill, [bill, other, payment]), 100);
  assert.equal(openBalance(other, [bill, other, payment]), 100);
});
