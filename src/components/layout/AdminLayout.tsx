"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { useHostel } from "@/contexts/HostelContext";
import { Loader2 } from "lucide-react";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { currentHostel, loading } = useHostel();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!currentHostel) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-gray-900">Hostel not configured</p>
          <p className="mt-2 text-sm text-gray-500">
            Add one row in the <code className="text-xs">hostels</code> table in Supabase, or set{" "}
            <code className="text-xs">NEXT_PUBLIC_HOSTEL_ID</code> in your environment file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64">{children}</main>
    </div>
  );
}
