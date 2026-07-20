/** Two-hostel owner platform — one login per property. */

export const PLATFORM_NAME =
  process.env.NEXT_PUBLIC_PLATFORM_NAME?.trim() || "Royal Girls Hostels";

/** Supabase Auth emails; login screen uses hostel name or hostel1 / hostel2. */
const AUTH_LOGIN_DOMAIN =
  process.env.NEXT_PUBLIC_AUTH_LOGIN_DOMAIN?.trim() || "royalgirls.com";

function defaultAuthEmail(localPart: string, overrideEnv?: string): string {
  const override = overrideEnv?.trim();
  if (override) return override;
  return `${localPart}@${AUTH_LOGIN_DOMAIN}`;
}

export type HostelLoginAccount = {
  displayName: string;
  email: string;
  hostelSlug: string;
  /** Short login id, e.g. hostel1 */
  loginId: string;
};

export const HOSTEL_LOGIN_ACCOUNTS: HostelLoginAccount[] = [
  {
    displayName: "Royal Girls Hostel 1",
    email: defaultAuthEmail("hostel1", process.env.NEXT_PUBLIC_HOSTEL1_LOGIN_EMAIL),
    hostelSlug: "royal-girls-hostel-1",
    loginId: "hostel1",
  },
  {
    displayName: "Royal Girls Hostel 2",
    email: defaultAuthEmail("hostel2", process.env.NEXT_PUBLIC_HOSTEL2_LOGIN_EMAIL),
    hostelSlug: "royal-girls-hostel-2",
    loginId: "hostel2",
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
      const emailLocal = account.email.split("@")[0]?.toLowerCase();
      return (
        name === q ||
        slug === q ||
        slug === asSlug ||
        account.loginId === q ||
        emailLocal === q ||
        account.email.toLowerCase() === q
      );
    }) ?? null
  );
}

/** @deprecated Use PLATFORM_NAME */
export const APP_NAME = PLATFORM_NAME;
