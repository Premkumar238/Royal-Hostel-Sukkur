import { HOSTEL_LOGIN_ACCOUNTS } from "@/lib/appConfig";
import type { Hostel } from "@/types/database";

export const ACTIVE_HOSTEL_STORAGE_KEY = "royal_active_hostel_id";

export const ROYAL_GIRLS_HOSTEL_SLUGS = HOSTEL_LOGIN_ACCOUNTS.map((a) => a.hostelSlug);

export function readStoredActiveHostelId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_HOSTEL_STORAGE_KEY);
}

export function writeStoredActiveHostelId(hostelId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_HOSTEL_STORAGE_KEY, hostelId);
}

export function pickActiveHostel(
  hostels: Hostel[],
  preferredId: string | null,
  fallbackId: string | null
): Hostel | null {
  if (hostels.length === 0) return null;
  if (preferredId) {
    const saved = hostels.find((h) => h.id === preferredId);
    if (saved) return saved;
  }
  if (fallbackId) {
    const memberHostel = hostels.find((h) => h.id === fallbackId);
    if (memberHostel) return memberHostel;
  }
  return hostels[0];
}

export function getPeerHostelFromList(current: Hostel | null, hostels: Hostel[]): Hostel | null {
  if (!current || hostels.length < 2) return null;
  return hostels.find((h) => h.id !== current.id) ?? null;
}
