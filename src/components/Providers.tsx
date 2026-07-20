import type { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { HostelProvider } from "@/contexts/HostelContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <HostelProvider>{children}</HostelProvider>
    </AuthProvider>
  );
}
