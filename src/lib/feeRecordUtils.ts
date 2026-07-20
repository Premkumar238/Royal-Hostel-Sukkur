import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeeRecord, PaymentMethod } from "@/types/database";

type FeeRecordPayload = {
  hostel_id: string;
  student_id: string;
  billing_month: string;
  amount: number;
  fee_type: "rent" | "mess";
  invoice_code: string;
  status: FeeRecord["status"];
  payment_date: string | null;
  payment_method?: PaymentMethod;
  invoice_notes?: string | null;
};

export function formatSupabaseError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const message = String((err as { message: string }).message);
    const details =
      "details" in err && (err as { details?: string | null }).details
        ? String((err as { details: string }).details)
        : "";
    const hint =
      "hint" in err && (err as { hint?: string | null }).hint
        ? String((err as { hint: string }).hint)
        : "";
    return [message, details, hint].filter(Boolean).join(" — ");
  }
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

function isMissingPaymentColumnsError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("payment_method") ||
    lower.includes("invoice_notes") ||
    lower.includes("schema cache") ||
    lower.includes("could not find")
  );
}

export interface SaveFeeRecordInput {
  hostelId: string;
  studentId: string;
  billingMonthDate: string;
  feeType: "rent" | "mess";
  amount: number;
  existing: FeeRecord | null;
  invoiceCode: string;
  status: FeeRecord["status"];
  paymentDate: string | null;
  paymentMethod: PaymentMethod;
  invoiceNotes: string | null;
}

export async function saveFeeRecord(
  supabase: SupabaseClient,
  input: SaveFeeRecordInput
): Promise<{ ok: true; paymentMetaStored: boolean } | { ok: false; message: string }> {
  const basePayload: FeeRecordPayload = {
    hostel_id: input.hostelId,
    student_id: input.studentId,
    billing_month: input.billingMonthDate,
    amount: input.amount,
    fee_type: input.feeType,
    invoice_code: input.invoiceCode,
    status: input.status,
    payment_date: input.paymentDate,
  };

  const fullPayload: FeeRecordPayload = {
    ...basePayload,
    payment_method: input.paymentMethod,
    invoice_notes: input.invoiceNotes,
  };

  const attempt = async (payload: FeeRecordPayload) => {
    if (input.existing) {
      return supabase.from("fee_records").update(payload).eq("id", input.existing.id);
    }
    return supabase.from("fee_records").insert([payload]);
  };

  const { error: firstError } = await attempt(fullPayload);
  if (!firstError) return { ok: true, paymentMetaStored: true };

  const msg = formatSupabaseError(firstError);
  if (isMissingPaymentColumnsError(msg)) {
    const retry = await attempt(basePayload);
    if (!retry.error) {
      return { ok: true, paymentMetaStored: false };
    }
    return { ok: false, message: formatSupabaseError(retry.error) };
  }

  return { ok: false, message: msg };
}
