/** Two-hostel owner platform — one login per property. */

export const PLATFORM_NAME =
  process.env.NEXT_PUBLIC_PLATFORM_NAME?.trim() || "Royal Girls Hostels";

export type HostelLoginAccount = {
  displayName: string;
  email: string;
  hostelSlug: string;
};

export const HOSTEL_LOGIN_ACCOUNTS: HostelLoginAccount[] = [
  {
    displayName: "Royal Girls Hostel 1",
    email:
      process.env.NEXT_PUBLIC_HOSTEL1_LOGIN_EMAIL?.trim() ||
      "royal-girls-hostel-1@hostel.local",
    hostelSlug: "royal-girls-hostel-1",
  },
  {
    displayName: "Royal Girls Hostel 2",
    email:
      process.env.NEXT_PUBLIC_HOSTEL2_LOGIN_EMAIL?.trim() ||
      "royal-girls-hostel-2@hostel.local",
    hostelSlug: "royal-girls-hostel-2",
  },
];

export function resolveHostelLoginAccount(username: string): HostelLoginAccount | null {
  const q = username.trim().toLowerCase();
  if (!q) return null;

  return (
    HOSTEL_LOGIN_ACCOUNTS.find((account) => {
      const name = account.displayName.toLowerCase();
      const slug = account.hostelSlug.toLowerCase();
      const asSlug = q.replace(/\s+/g, "-");
      return name === q || slug === q || slug === asSlug;
    }) ?? null
  );
}

/** @deprecated Use PLATFORM_NAME */
export const APP_NAME = PLATFORM_NAME;
