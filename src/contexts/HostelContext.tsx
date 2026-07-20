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
import type { Hostel, HostelMember } from "@/types/database";

interface HostelContextType {
  currentHostel: Hostel | null;
  memberships: HostelMember[];
  loading: boolean;
  switchHostel: (hostelId: string) => void;
}

const HostelContext = createContext<HostelContextType | undefined>(undefined);

const STORAGE_KEY = "hostelpro_current_hostel";

export function HostelProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentHostel, setCurrentHostel] = useState<Hostel | null>(null);
  const [memberships, setMemberships] = useState<HostelMember[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchMemberships = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setCurrentHostel(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("hostel_members")
      .select("*, hostel:hostels(*)")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (data && data.length > 0) {
      setMemberships(data as HostelMember[]);

      const savedId = localStorage.getItem(STORAGE_KEY);
      const saved = data.find((m) => m.hostel_id === savedId);
      const selected = saved ?? data[0];
      setCurrentHostel((selected as HostelMember).hostel as Hostel);
      localStorage.setItem(STORAGE_KEY, selected.hostel_id);
    } else {
      setMemberships([]);
      setCurrentHostel(null);
    }
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    fetchMemberships();
  }, [fetchMemberships]);

  const switchHostel = (hostelId: string) => {
    const member = memberships.find((m) => m.hostel_id === hostelId);
    if (member?.hostel) {
      setCurrentHostel(member.hostel as Hostel);
      localStorage.setItem(STORAGE_KEY, hostelId);
    }
  };

  return (
    <HostelContext.Provider
      value={{ currentHostel, memberships, loading, switchHostel }}
    >
      {children}
    </HostelContext.Provider>
  );
}

export function useHostel() {
  const context = useContext(HostelContext);
  if (!context) throw new Error("useHostel must be used within HostelProvider");
  return context;
}
