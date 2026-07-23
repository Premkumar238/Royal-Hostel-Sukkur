import type { SupabaseClient } from "@supabase/supabase-js";

export const PAYOUT_RECIPIENTS = [
  "Ameet Lalwani",
  "Khairpur Home",
  "Sain Amjad",
] as const;

export type PayoutRecipient = (typeof PAYOUT_RECIPIENTS)[number];

export function isPayoutRecipient(name: string | null | undefined): name is PayoutRecipient {
  if (!name) return false;
  return (PAYOUT_RECIPIENTS as readonly string[]).includes(name);
}

export async function ensurePayoutCategory(
  supabase: SupabaseClient,
  hostelId: string,
  recipientName: PayoutRecipient
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("expense_categories")
    .select("id")
    .eq("hostel_id", hostelId)
    .eq("name", recipientName)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("expense_categories")
    .insert([{ hostel_id: hostelId, name: recipientName }])
    .select("id")
    .single();

  if (error) return null;
  return data.id;
}

export function payoutTitle(recipientName: PayoutRecipient): string {
  return `Payment — ${recipientName}`;
}

/** Both Royal Girls hostels use one shared people ledger */
export const SHARED_LEDGER_HOSTEL_SLUGS = [
  "royal-girls-hostel-1",
  "royal-girls-hostel-2",
] as const;

export type SharedLedgerPayment = {
  id: string;
  hostel_id: string;
  category_id: string | null;
  employee_id: string | null;
  title: string;
  description: string | null;
  vendor: string | null;
  amount: number;
  expense_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  hostel_name: string;
};

export async function fetchSharedLedgerPayments(
  supabase: SupabaseClient,
  start: string,
  end: string
): Promise<{ data: SharedLedgerPayment[]; error: string | null }> {
  const { data, error } = await supabase.rpc("get_shared_ledger_payments", {
    p_start: start,
    p_end: end,
  });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as SharedLedgerPayment[], error: null };
}

export async function deleteSharedLedgerPayment(
  supabase: SupabaseClient,
  expenseId: string
): Promise<string | null> {
  const { error } = await supabase.rpc("delete_shared_ledger_payment", {
    p_expense_id: expenseId,
  });

  return error?.message ?? null;
}
