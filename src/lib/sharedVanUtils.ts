import type { SupabaseClient } from "@supabase/supabase-js";
import type { VanExpense, VanMonthlySummary, VanPayment } from "@/types/database";

export async function fetchSharedVanMonth(
  supabase: SupabaseClient,
  billingMonthDate: string
): Promise<{ data: VanMonthlySummary; error: string | null }> {
  const { data, error } = await supabase.rpc("get_shared_van_month", {
    p_billing_month: billingMonthDate,
  });

  if (error) {
    return {
      data: {
        payments: [],
        expenses: [],
        total_revenue: 0,
        total_expenses: 0,
        net_profit: 0,
      },
      error: error.message,
    };
  }

  const summary = (data ?? {}) as VanMonthlySummary;
  return {
    data: {
      payments: (summary.payments ?? []) as VanPayment[],
      expenses: (summary.expenses ?? []) as VanExpense[],
      total_revenue: Number(summary.total_revenue || 0),
      total_expenses: Number(summary.total_expenses || 0),
      net_profit: Number(summary.net_profit || 0),
    },
    error: null,
  };
}

export async function addSharedVanPayment(
  supabase: SupabaseClient,
  params: {
    billingMonthDate: string;
    passengerName: string;
    paymentDate: string;
    amount: number;
    notes?: string | null;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("add_shared_van_payment", {
    p_billing_month: params.billingMonthDate,
    p_passenger_name: params.passengerName.trim(),
    p_payment_date: params.paymentDate,
    p_amount: params.amount,
    p_notes: params.notes?.trim() || null,
  });

  return { error: error?.message ?? null };
}

export async function deleteSharedVanPayment(
  supabase: SupabaseClient,
  vanPaymentId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("delete_shared_van_payment", {
    p_van_payment_id: vanPaymentId,
  });

  return { error: error?.message ?? null };
}

export async function addSharedVanExpense(
  supabase: SupabaseClient,
  params: {
    billingMonthDate: string;
    expenseDate: string;
    amount: number;
    description?: string | null;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("add_shared_van_expense", {
    p_billing_month: params.billingMonthDate,
    p_expense_date: params.expenseDate,
    p_amount: params.amount,
    p_description: params.description?.trim() || null,
  });

  return { error: error?.message ?? null };
}

export async function deleteSharedVanExpense(
  supabase: SupabaseClient,
  vanExpenseId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("delete_shared_van_expense", {
    p_van_expense_id: vanExpenseId,
  });

  return { error: error?.message ?? null };
}
