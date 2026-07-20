"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface LayoutShellContextType {
  mobileNavOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleMobileNav: () => void;
}

const LayoutShellContext = createContext<LayoutShellContextType | null>(null);

export function LayoutShellProvider({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const openMobileNav = useCallback(() => setMobileNavOpen(true), []);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const toggleMobileNav = useCallback(() => setMobileNavOpen((open) => !open), []);

  return (
    <LayoutShellContext.Provider
      value={{ mobileNavOpen, openMobileNav, closeMobileNav, toggleMobileNav }}
    >
      {children}
    </LayoutShellContext.Provider>
  );
}

export function useLayoutShell() {
  const ctx = useContext(LayoutShellContext);
  if (!ctx) {
    throw new Error("useLayoutShell must be used within LayoutShellProvider");
  }
  return ctx;
}
