import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmployeeRole } from "@/types/database";

export const STAFF_ROLES: EmployeeRole[] = [
  "Watchman",
  "Cook",
  "Cleaner",
  "Manager",
  "Other",
];

export async function ensureStaffCategory(
  supabase: SupabaseClient,
  hostelId: string,
  role: EmployeeRole
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("expense_categories")
    .select("id")
    .eq("hostel_id", hostelId)
    .eq("name", role)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("expense_categories")
    .insert([{ hostel_id: hostelId, name: role }])
    .select("id")
    .single();

  if (error) return null;
  return data.id;
}
