"use client";

import { Search, Bell, HelpCircle, ChevronDown, Building2, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useHostel } from "@/contexts/HostelContext";
import { Avatar } from "@/components/ui/Avatar";
import { useState, useRef, useEffect } from "react";

interface HeaderProps {
  title: string;
  searchPlaceholder?: string;
}

export function Header({ title, searchPlaceholder = "Search..." }: HeaderProps) {
  const { profile } = useAuth();
  const { currentHostel, memberships, switchHostel } = useHostel();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const roleLabel = profile?.role
    ?.replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()) ?? "User";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

          <button className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
            <Bell className="h-5 w-5" />
          </button>
          <button className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
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
      {currentHostel && (
        <div className="border-t border-gray-100 px-6 py-2 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Current Hostel:
            </span>
            {memberships.length > 1 ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-55 hover:text-gray-900 active:scale-95 cursor-pointer"
                >
                  <Building2 className="h-3.5 w-3.5 text-blue-500" />
                  <span>{currentHostel.name}</span>
                  <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute left-0 mt-1 z-35 w-64 rounded-xl border border-gray-100 bg-white py-1.5 shadow-lg ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 duration-100">
                    <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Switch Hostel
                    </p>
                    <div className="h-px bg-gray-100 my-1" />
                    {memberships.map((member) => {
                      const hostel = member.hostel;
                      if (!hostel) return null;
                      const active = hostel.id === currentHostel.id;
                      return (
                        <button
                          key={hostel.id}
                          onClick={() => {
                            switchHostel(hostel.id);
                            setDropdownOpen(false);
                          }}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium transition-colors cursor-pointer ${
                            active
                              ? "bg-blue-50 text-blue-700 font-semibold"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          <span className="truncate">{hostel.name}</span>
                          {active && <Check className="h-3.5 w-3.5 text-blue-600" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-lg border border-gray-100 bg-white px-3 py-1 text-xs font-semibold text-gray-500 shadow-sm">
                <Building2 className="h-3.5 w-3.5 text-gray-400" />
                <span>{currentHostel.name}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
