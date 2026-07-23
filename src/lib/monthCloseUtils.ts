import type { SupabaseClient } from "@supabase/supabase-js";

export interface MonthCloseResult {
  current_month: string;
  closed_months: string[];
  did_close: boolean;
  fees_created: number;
}

export async function autoCloseHostelMonths(
  supabase: SupabaseClient,
  hostelId: string
): Promise<MonthCloseResult | null> {
  const { data, error } = await supabase.rpc("auto_close_hostel_months", {
    p_hostel_id: hostelId,
  });

  if (error) {
    console.error("Month closing failed:", error.message);
    return null;
  }

  return data as MonthCloseResult;
}
