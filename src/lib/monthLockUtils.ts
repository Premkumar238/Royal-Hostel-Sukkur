import type { SupabaseClient } from "@supabase/supabase-js";
import type { MonthClosure } from "@/types/database";

export async function fetchMonthClosures(
  supabase: SupabaseClient,
  hostelId: string
): Promise<MonthClosure[]> {
  const { data, error } = await supabase
    .from("month_closures")
    .select("*")
    .eq("hostel_id", hostelId)
    .order("billing_month", { ascending: false });

  if (error) {
    console.error("Failed to load month closures:", error.message);
    return [];
  }
  return (data ?? []) as MonthClosure[];
}

export async function isBillingMonthClosed(
  supabase: SupabaseClient,
  hostelId: string,
  billingMonthDate: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_hostel_month_closed", {
    p_hostel_id: hostelId,
    p_month: billingMonthDate,
  });

  if (error) {
    console.error("Month closed check failed:", error.message);
    return false;
  }
  return Boolean(data);
}

export async function downloadClosedMonthSnapshotJson(
  supabase: SupabaseClient,
  hostelId: string,
  billingMonthDate: string
): Promise<{ ok: true; snapshot: Record<string, unknown> } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc("get_month_closure_snapshot", {
    p_hostel_id: hostelId,
    p_billing_month: billingMonthDate,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true, snapshot: (data ?? {}) as Record<string, unknown> };
}
