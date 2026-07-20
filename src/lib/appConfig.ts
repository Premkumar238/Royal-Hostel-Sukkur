/** Single-client deployment — one hostel, one owner. */

export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Royal Girls Hostel 1";

/** Optional: pin a specific hostel row in Supabase. If unset, the first hostel is used. */
export const SINGLE_HOSTEL_ID =
  process.env.NEXT_PUBLIC_HOSTEL_ID?.trim() || null;
