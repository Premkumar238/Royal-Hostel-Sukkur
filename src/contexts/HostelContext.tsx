"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  pickActiveHostel,
  readStoredActiveHostelId,
  writeStoredActiveHostelId,
} from "@/lib/hostelSwitch";
import type { Hostel } from "@/types/database";

interface HostelContextType {
  currentHostel: Hostel | null;
  switchableHostels: Hostel[];
  loading: boolean;
  switchHostel: (hostelId: string) => void;
}

const HostelContext = createContext<HostelContextType | undefined>(undefined);

export function HostelProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [currentHostel, setCurrentHostel] = useState<Hostel | null>(null);
  const [switchableHostels, setSwitchableHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchHostel = useCallback(async () => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setCurrentHostel(null);
      setSwitchableHostels([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const [{ data: switchableJson, error: switchableError }, { data: member }] = await Promise.all([
      supabase.rpc("get_switchable_hostels"),
      supabase
        .from("hostel_members")
        .select("hostel_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    if (switchableError) {
      console.error("Failed to load hostels:", switchableError.message);
      setCurrentHostel(null);
      setSwitchableHostels([]);
      setLoading(false);
      return;
    }

    const hostels = (switchableJson ?? []) as Hostel[];
    setSwitchableHostels(hostels);

    const active = pickActiveHostel(
      hostels,
      readStoredActiveHostelId(),
      member?.hostel_id ?? null
    );

    setCurrentHostel(active);
    if (active) {
      writeStoredActiveHostelId(active.id);
    }

    setLoading(false);
  }, [user, authLoading, supabase]);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    fetchHostel();
  }, [authLoading, fetchHostel]);

  const switchHostel = useCallback(
    (hostelId: string) => {
      const next = switchableHostels.find((h) => h.id === hostelId);
      if (!next) return;
      writeStoredActiveHostelId(next.id);
      setCurrentHostel(next);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("hostel:switched", { detail: { hostelId: next.id } })
        );
      }
    },
    [switchableHostels]
  );

  return (
    <HostelContext.Provider value={{ currentHostel, switchableHostels, loading, switchHostel }}>
      {children}
    </HostelContext.Provider>
  );
}

export function useHostel() {
  const context = useContext(HostelContext);
  if (!context) throw new Error("useHostel must be used within HostelProvider");
  return context;
}
