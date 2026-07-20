"use client";

import { Search, Bell, HelpCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "@/components/ui/Avatar";

interface HeaderProps {
  title: string;
  searchPlaceholder?: string;
}

export function Header({ title, searchPlaceholder = "Search..." }: HeaderProps) {
  const { profile } = useAuth();

  const roleLabel = profile?.role
    ?.replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Admin";

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>

        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="w-72 rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="button"
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <Bell className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <HelpCircle className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
            <Avatar name={profile?.full_name ?? "User"} size="sm" src={profile?.avatar_url} />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">
                {profile?.full_name ?? "User"}
              </p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                {roleLabel}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
