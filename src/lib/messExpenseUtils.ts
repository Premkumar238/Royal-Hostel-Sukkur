import type { SupabaseClient } from "@supabase/supabase-js";
import type { MessExpenseType } from "@/types/database";
import { formatMonth } from "@/lib/utils";

const MESS_CATEGORY_NAMES: Record<MessExpenseType, string> = {
  initial: "Mess - Initial",
  daily: "Mess - Daily",
};

export async function ensureMessExpenseCategory(
  supabase: SupabaseClient,
  hostelId: string,
  type: MessExpenseType
): Promise<string | null> {
  const name = MESS_CATEGORY_NAMES[type];

  const { data: existing } = await supabase
    .from("expense_categories")
    .select("id")
    .eq("hostel_id", hostelId)
    .eq("name", name)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("expense_categories")
    .insert([{ hostel_id: hostelId, name }])
    .select("id")
    .single();

  if (error) return null;
  return data.id;
}

export function buildMessExpenseTitle(type: MessExpenseType, billingMonth: string): string {
  if (type === "initial") {
    return `Initial Mess Expense - ${formatMonth(billingMonth)}`;
  }
  return "Daily Mess Expense";
}

export async function createLinkedMessExpenseRecord(
  supabase: SupabaseClient,
  params: {
    hostelId: string;
    type: MessExpenseType;
    billingMonth: string;
    expenseDate: string;
    amount: number;
    description?: string | null;
  }
): Promise<{ expenseId: string | null; error: string | null }> {
  const categoryId = await ensureMessExpenseCategory(supabase, params.hostelId, params.type);
  const title = buildMessExpenseTitle(params.type, params.billingMonth);

  const { data, error } = await supabase
    .from("expenses")
    .insert([
      {
        hostel_id: params.hostelId,
        category_id: categoryId,
        title,
        description: params.description || null,
        vendor: "Mess",
        amount: params.amount,
        expense_date: params.expenseDate,
        status: "paid",
      },
    ])
    .select("id")
    .single();

  if (error) return { expenseId: null, error: error.message };
  return { expenseId: data.id, error: null };
}
