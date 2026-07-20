"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  { href: "/complaints", label: "Complaint Management", icon: MessageSquareWarning },
  { href: "/expenses", label: "Expense Management", icon: Receipt },
  { href: "/police-verification", label: "Police Verification", icon: ShieldCheck },
  { href: "/profit", label: "Profit Dashboard", icon: TrendingUp },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const { currentHostel } = useHostel();

  const brandTitle = currentHostel?.name ?? APP_NAME;

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate" title={brandTitle}>
            {brandTitle}
          </p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
            Hostel Admin
          </p>
        </div>
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
              <Icon className={`h-[18px] w-[18px] ${active ? "text-blue-600" : "text-gray-400"}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 p-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Logout
        </button>
      </div>
    </aside>
  );
}
