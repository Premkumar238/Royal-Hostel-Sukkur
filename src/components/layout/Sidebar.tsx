"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  DoorOpen,
  CreditCard,
  Receipt,
  TrendingUp,
  LogOut,
  Building2,
  UtensilsCrossed,
  MessageSquareWarning,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useHostel } from "@/contexts/HostelContext";
import { APP_NAME } from "@/lib/appConfig";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/rooms", label: "Rooms", icon: DoorOpen },
  { href: "/mess", label: "Mess Management", icon: UtensilsCrossed },
  { href: "/fees", label: "Fees & Invoices", icon: CreditCard },
  { href: "/complaints", label: "Complaints", icon: MessageSquareWarning },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/police-verification", label: "Police Verification", icon: ShieldCheck },
  { href: "/profit", label: "Profit Dashboard", icon: TrendingUp },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const { currentHostel } = useHostel();

  const brandTitle = currentHostel?.name ?? APP_NAME;

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-[100dvh] w-[min(100%,17rem)] max-w-[85vw] flex-col border-r border-gray-200 bg-white shadow-xl transition-transform duration-200 ease-out lg:z-30 lg:w-64 lg:max-w-none lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-gray-900" title={brandTitle}>
              {brandTitle}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
              Hostel Admin
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 ${active ? "text-blue-600" : "text-gray-400"}`}
                />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
