import type { Expense } from "@/types/database";
import { isPayoutRecipient } from "@/lib/payoutUtils";

type ExpenseLike = Pick<Expense, "title" | "vendor" | "employee_id"> & {
  expense_categories?: { name: string } | null;
};

export function isMessExpenseRecord(expense: ExpenseLike): boolean {
  const category = expense.expense_categories?.name ?? "";
  return (
    category === "Mess - Daily" ||
    category === "Mess - Initial" ||
    expense.vendor?.toLowerCase() === "mess" ||
    expense.title.toLowerCase().includes("mess expense")
  );
}

export function isLedgerExpenseRecord(expense: ExpenseLike): boolean {
  return (
    isPayoutRecipient(expense.vendor) ||
    expense.title.startsWith("Payment —")
  );
}

/** Regular hostel expense records — excludes mess and shared ledger entries. */
export function isOperationalExpenseRecord(expense: ExpenseLike): boolean {
  return !isMessExpenseRecord(expense) && !isLedgerExpenseRecord(expense);
}
