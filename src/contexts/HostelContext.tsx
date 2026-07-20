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
import { SINGLE_HOSTEL_ID } from "@/lib/appConfig";
import type { Hostel } from "@/types/database";

interface HostelContextType {
  currentHostel: Hostel | null;
  loading: boolean;
}

const HostelContext = createContext<HostelContextType | undefined>(undefined);

export function HostelProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentHostel, setCurrentHostel] = useState<Hostel | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchHostel = useCallback(async () => {
    if (!user) {
      setCurrentHostel(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = SINGLE_HOSTEL_ID
      ? await supabase.from("hostels").select("*").eq("id", SINGLE_HOSTEL_ID).maybeSingle()
      : await supabase
          .from("hostels")
          .select("*")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

    if (error) {
      console.error("Failed to load hostel:", error.message);
      setCurrentHostel(null);
    } else {
      setCurrentHostel(data);
    }

    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    fetchHostel();
  }, [fetchHostel]);

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
