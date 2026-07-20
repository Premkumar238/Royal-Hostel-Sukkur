"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
import { PLATFORM_NAME } from "@/lib/appConfig";

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

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex min-h-[48px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors active:bg-gray-100 ${
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
  );
}

function SidebarChrome({
  brandTitle,
  onClose,
  showClose,
  children,
  footer,
}: {
  brandTitle: string;
  onClose: () => void;
  showClose: boolean;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-4 py-4">
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
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      {children}
      {footer}
    </div>
  );
}

function MobileNavPortal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex lg:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close menu"
        className="min-h-0 min-w-0 flex-1 bg-black/55"
        onClick={onClose}
      />
      <aside className="flex h-full w-[min(100vw,20rem)] max-w-[85vw] shrink-0 flex-col bg-white shadow-2xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {children}
      </aside>
    </div>,
    document.body
  );
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const { currentHostel } = useHostel();

  const brandTitle = currentHostel?.name ?? PLATFORM_NAME;
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    if (pathnameRef.current === pathname) return;
    pathnameRef.current = pathname;
    onClose();
  }, [pathname, onClose]);

  const handleSignOut = async () => {
    onClose();
    await signOut();
    router.push("/login");
  };

  const logoutFooter = (
    <div className="shrink-0 border-t border-gray-100 p-3">
      <button
        type="button"
        onClick={handleSignOut}
        className="flex min-h-[48px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600 active:bg-red-100"
      >
        <LogOut className="h-[18px] w-[18px]" />
        Logout
      </button>
    </div>
  );

  const nav = <NavLinks pathname={pathname} onNavigate={onClose} />;

  return (
    <>
      <aside className="fixed left-0 top-0 z-30 hidden h-[100dvh] w-64 flex-col border-r border-gray-200 bg-white lg:flex">
        <SidebarChrome brandTitle={brandTitle} onClose={onClose} showClose={false} footer={logoutFooter}>
          {nav}
        </SidebarChrome>
      </aside>

      <MobileNavPortal open={mobileOpen} onClose={onClose}>
        <SidebarChrome brandTitle={brandTitle} onClose={onClose} showClose footer={logoutFooter}>
          {nav}
        </SidebarChrome>
      </MobileNavPortal>
    </>
  );
}
