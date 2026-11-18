// Browser-safe bank & cash account rules and balance math.
export type BankAccount = { id: string; name: string; account_number: string | null; bank_name: string | null; hidden_from_manager: boolean };
export type BankTransaction = { id: string; account_id: string; date: string; direction: "in" | "out"; amount: number; note: string | null; created_at: string };

export const canAccessBankAccounts = (role: string | null) => role === "admin" || role === "manager";
export const canViewBankAccount = (a: BankAccount, role: string | null) =>
  role === "admin" || (role === "manager" && !a.hidden_from_manager);
export const signedAmount = (t: BankTransaction) => (t.direction === "in" ? 1 : -1) * Number(t.amount);
export const accountBalance = (txs: BankTransaction[], accountId: string) =>
  Math.round(txs.filter((t) => t.account_id === accountId).reduce((s, t) => s + signedAmount(t), 0) * 100) / 100;
/** Combined balance of the given accounts, rounded to two decimals. */
export const totalBalance = (txs: BankTransaction[], accounts: BankAccount[]) =>
  Math.round(accounts.reduce((s, a) => s + accountBalance(txs, a.id), 0) * 100) / 100;
/** Chronological rows with running balance. */
export function runningRows(txs: BankTransaction[], accountId: string) {
  let bal = 0;
  return txs.filter((t) => t.account_id === accountId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at))
    .map((t) => { bal = Math.round((bal + signedAmount(t)) * 100) / 100; return { ...t, balance: bal }; });
}
