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
import type { Hostel } from "@/types/database";

interface HostelContextType {
  currentHostel: Hostel | null;
  loading: boolean;
}

const HostelContext = createContext<HostelContextType | undefined>(undefined);

export function HostelProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [currentHostel, setCurrentHostel] = useState<Hostel | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchHostel = useCallback(async () => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setCurrentHostel(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: member, error: memberError } = await supabase
      .from("hostel_members")
      .select("hostel_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (memberError) {
      console.error("Failed to load hostel membership:", memberError.message);
      setCurrentHostel(null);
      setLoading(false);
      return;
    }

    if (!member?.hostel_id) {
      setCurrentHostel(null);
      setLoading(false);
      return;
    }

    const { data: hostel, error: hostelError } = await supabase
      .from("hostels")
      .select("*")
      .eq("id", member.hostel_id)
      .maybeSingle();

    if (hostelError) {
      console.error("Failed to load hostel:", hostelError.message);
      setCurrentHostel(null);
    } else {
      setCurrentHostel(hostel ?? null);
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

  return (
    <HostelContext.Provider value={{ currentHostel, loading }}>
      {children}
    </HostelContext.Provider>
  );
}

export function useHostel() {
  const context = useContext(HostelContext);
  if (!context) throw new Error("useHostel must be used within HostelProvider");
  return context;
}
