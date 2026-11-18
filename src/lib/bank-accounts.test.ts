import { test } from "node:test";
import assert from "node:assert/strict";
import { accountBalance, canAccessBankAccounts, canViewBankAccount, runningRows, totalBalance, type BankTransaction } from "./bank-accounts";
const acc = (hidden: boolean) => ({ id: "a", name: "A", account_number: null, bank_name: null, hidden_from_manager: hidden });
const tx = (d: "in" | "out", amount: number, date: string): BankTransaction => ({ id: date + d, account_id: "a", date, direction: d, amount, note: null, created_at: date });
test("staff cannot access accounts", () => assert.equal(canAccessBankAccounts("staff"), false));
test("admin and manager can access", () => { assert.equal(canAccessBankAccounts("admin"), true); assert.equal(canAccessBankAccounts("manager"), true); });
test("hidden account is not visible to manager", () => assert.equal(canViewBankAccount(acc(true), "manager"), false));
test("hidden account stays visible to admin", () => assert.equal(canViewBankAccount(acc(true), "admin"), true));
test("add and subtract give the balance", () => {
  const t = [tx("in", 1000, "2026-01-01"), tx("out", 250.5, "2026-01-02")];
  assert.equal(accountBalance(t, "a"), 749.5);
  assert.deepEqual(runningRows(t, "a").map((r) => r.balance), [1000, 749.5]);
});
test("total balance adds every account", () => {
  const accts = [
    { id: "a", name: "A", account_number: null, bank_name: null, hidden_from_manager: false },
    { id: "b", name: "B", account_number: null, bank_name: null, hidden_from_manager: true },
  ];
  const t = [
    tx("in", 1000, "2026-01-01"),
    { ...tx("in", 500, "2026-01-02"), account_id: "b" },
    { ...tx("out", 200, "2026-01-03"), account_id: "b" },
  ];
  assert.equal(totalBalance(t, accts), 1300);
  assert.equal(totalBalance(t, [accts[1]]), 300);
  assert.equal(totalBalance(t, []), 0);
});
