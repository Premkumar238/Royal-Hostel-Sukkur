import { Sidebar } from "@/components/layout/Sidebar";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64">{children}</main>
    </div>
  );
}
