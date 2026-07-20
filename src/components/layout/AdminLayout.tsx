"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { useHostel } from "@/contexts/HostelContext";
import {
  LayoutShellProvider,
  useLayoutShell,
} from "@/contexts/LayoutShellContext";
import { Loader2 } from "lucide-react";

function AdminShell({ children }: { children: React.ReactNode }) {
  const { mobileNavOpen, closeMobileNav } = useLayoutShell();

  return (
    <div className="min-h-[100dvh] bg-gray-50">
      <Sidebar mobileOpen={mobileNavOpen} onClose={closeMobileNav} />
      <main className="min-w-0 lg:ml-64">{children}</main>
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { currentHostel, loading } = useHostel();

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!currentHostel) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 p-4 sm:p-6">
        <div className="max-w-md rounded-xl border border-gray-200 bg-white p-6 sm:p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-gray-900">Hostel not configured</p>
          <p className="mt-2 text-sm text-gray-500">
            Add both hostels and link each admin user in{" "}
            <code className="text-xs">hostel_members</code> (see setup SQL in project docs).
          </p>
        </div>
      </div>
    );
  }

  return (
    <LayoutShellProvider>
      <AdminShell>{children}</AdminShell>
    </LayoutShellProvider>
  );
}
