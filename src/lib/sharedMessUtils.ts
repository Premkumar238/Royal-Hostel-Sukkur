import type { SupabaseClient } from "@supabase/supabase-js";
import type { MessExpense } from "@/types/database";

export async function fetchSharedMessExpenses(
  supabase: SupabaseClient,
  billingMonthDate: string
): Promise<{ data: MessExpense[]; error: string | null }> {
  const { data, error } = await supabase.rpc("get_shared_mess_expenses", {
    p_billing_month: billingMonthDate,
  });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as MessExpense[], error: null };
}

export async function addSharedDailyMessExpense(
  supabase: SupabaseClient,
  params: {
    billingMonthDate: string;
    expenseDate: string;
    amount: number;
    description?: string | null;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("add_shared_mess_expense", {
    p_billing_month: params.billingMonthDate,
    p_expense_date: params.expenseDate,
    p_amount: params.amount,
    p_description: params.description?.trim() || null,
  });

  return { error: error?.message ?? null };
}

export async function deleteSharedMessExpense(
  supabase: SupabaseClient,
  messExpenseId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("delete_shared_mess_expense", {
    p_mess_expense_id: messExpenseId,
  });

  return { error: error?.message ?? null };
}
