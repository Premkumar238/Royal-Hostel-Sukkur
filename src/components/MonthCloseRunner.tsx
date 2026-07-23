"use client";

import { useEffect, useRef } from "react";
import { useHostel } from "@/contexts/HostelContext";
import { createClient } from "@/lib/supabase/client";
import { autoCloseHostelMonths } from "@/lib/monthCloseUtils";

const SESSION_KEY = "month_close_checked";

export function MonthCloseRunner() {
  const { currentHostel } = useHostel();
  const ranRef = useRef(false);
  const supabase = createClient();

  useEffect(() => {
    if (!currentHostel || ranRef.current) return;

    const sessionKey = `${SESSION_KEY}:${currentHostel.id}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(sessionKey)) {
      ranRef.current = true;
      return;
    }

    ranRef.current = true;

    autoCloseHostelMonths(supabase, currentHostel.id).then((result) => {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(sessionKey, "1");
      }

      if (result && (result.did_close || result.fees_created > 0)) {
        window.dispatchEvent(
          new CustomEvent("hostel:month-closed", {
            detail: result,
          })
        );
      }
    });
  }, [currentHostel, supabase]);

  return null;
}
