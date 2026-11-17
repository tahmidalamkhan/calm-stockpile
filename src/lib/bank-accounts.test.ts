import { describe, expect, it } from "vitest";
import { accountBalance, canAccessBankAccounts, canViewBankAccount, runningRows, type BankTransaction } from "./bank-accounts";
const acc = (hidden: boolean) => ({ id: "a", name: "A", account_number: null, bank_name: null, hidden_from_manager: hidden });
const tx = (d: "in" | "out", amount: number, date: string): BankTransaction => ({ id: date + d, account_id: "a", date, direction: d, amount, note: null, created_at: date });
describe("bank accounts", () => {
  it("staff cannot access accounts", () => expect(canAccessBankAccounts("staff")).toBe(false));
  it("admin and manager can access", () => { expect(canAccessBankAccounts("admin")).toBe(true); expect(canAccessBankAccounts("manager")).toBe(true); });
  it("hidden account is not visible to manager", () => expect(canViewBankAccount(acc(true), "manager")).toBe(false));
  it("hidden account stays visible to admin", () => expect(canViewBankAccount(acc(true), "admin")).toBe(true));
  it("add and subtract give the balance", () => {
    const t = [tx("in", 1000, "2026-01-01"), tx("out", 250.5, "2026-01-02")];
    expect(accountBalance(t, "a")).toBe(749.5);
    expect(runningRows(t, "a").map((r) => r.balance)).toEqual([1000, 749.5]);
  });
});
