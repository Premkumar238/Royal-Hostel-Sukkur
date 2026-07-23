"use client";

import { Search, Bell, HelpCircle, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLayoutShell } from "@/contexts/LayoutShellContext";
import { useHostel } from "@/contexts/HostelContext";
import { Avatar } from "@/components/ui/Avatar";

interface HeaderProps {
  title: string;
  searchPlaceholder?: string;
}

export function Header({ title, searchPlaceholder = "Search..." }: HeaderProps) {
  const { profile } = useAuth();
  const { currentHostel } = useHostel();
  const { toggleMobileNav, mobileNavOpen } = useLayoutShell();

  const roleLabel = profile?.role
    ?.replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Admin";

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
      <div className="flex items-center gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <button
          type="button"
          onClick={() => toggleMobileNav()}
          className="relative z-40 -ml-1 flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-gray-800 hover:bg-gray-100 active:bg-gray-200 lg:hidden"
          aria-label="Open menu"
          aria-expanded={mobileNavOpen}
        >
          <Menu className="h-6 w-6" />
        </button>

        <h1 className="min-w-0 flex-1 truncate text-base font-bold text-gray-900 sm:text-xl">
          {title}
        </h1>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <div className="relative hidden min-w-0 flex-1 md:block md:max-w-xs lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="button"
            className="hidden rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 sm:inline-flex"
          >
            <Bell className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="hidden rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 md:inline-flex"
          >
            <HelpCircle className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 border-l border-gray-200 pl-2 max-[380px]:hidden sm:gap-3 sm:pl-4">
            <Avatar name={profile?.full_name ?? "User"} size="sm" src={profile?.avatar_url} />
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold text-gray-900 max-w-[8rem] md:max-w-[12rem]">
                {profile?.full_name ?? "User"}
              </p>
              <p className="truncate text-[10px] font-medium uppercase tracking-wide text-gray-400 sm:text-[11px]">
                {roleLabel}
              </p>
            </div>
          </div>
        </div>
      </div>
      {currentHostel && (
        <div className="border-t border-gray-100 bg-gray-50/80 px-4 py-2 sm:px-6">
          <p className="truncate text-xs font-semibold text-gray-600">
            Logged in as: <span className="text-gray-900">{currentHostel.name}</span>
          </p>
        </div>
      )}
    </header>
  );
}
