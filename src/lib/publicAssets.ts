/** Login / marketing images in Supabase Storage (public bucket). */

export const LOGIN_HERO_STORAGE_PATH =
  process.env.NEXT_PUBLIC_LOGIN_HERO_STORAGE_PATH?.trim() || "hostel.jpeg";

const LOCAL_HERO_FALLBACK = "/hostel-hero.png";

export function getSupabaseLoginHeroUrl(supabaseUrl?: string): string | null {
  const base = supabaseUrl?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/hostel-public/${LOGIN_HERO_STORAGE_PATH}`;
}

export function resolveLoginHeroUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_LOGIN_HERO_URL?.trim();
  if (fromEnv) return fromEnv;
  return getSupabaseLoginHeroUrl() ?? LOCAL_HERO_FALLBACK;
}

export { LOCAL_HERO_FALLBACK };
