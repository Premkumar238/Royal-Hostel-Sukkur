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

/** Salary payments logged via Staff Management — not operational expense records. */
export function isSalaryExpenseRecord(expense: ExpenseLike): boolean {
  if (expense.employee_id) return true;
  return expense.title.toLowerCase().includes("salary");
}

/** Regular hostel expense records — excludes mess, ledger, and salary entries. */
export function isOperationalExpenseRecord(expense: ExpenseLike): boolean {
  return (
    !isMessExpenseRecord(expense) &&
    !isLedgerExpenseRecord(expense) &&
    !isSalaryExpenseRecord(expense)
  );
}
