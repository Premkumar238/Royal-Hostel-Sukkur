"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Header } from "@/components/layout/Header";
import { useHostel } from "@/contexts/HostelContext";
import { createClient } from "@/lib/supabase/client";
import {
  Building2,
  Phone,
  MapPin,
  Coins,
  Globe,
  Loader2,
  Save,
} from "lucide-react";

export default function SettingsPage() {
  const { currentHostel } = useHostel();
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [timezone, setTimezone] = useState("Asia/Karachi");

  const supabase = createClient();

  useEffect(() => {
    if (currentHostel) {
      setName(currentHostel.name);
      setContactPhone(currentHostel.contact_phone ?? "");
      setAddress(currentHostel.address ?? "");
      setCurrency(currentHostel.currency);
      setTimezone(currentHostel.timezone);
    }
  }, [currentHostel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHostel) return;
    setLoading(true);

    const { error } = await supabase
      .from("hostels")
      .update({
        name,
        contact_phone: contactPhone || null,
        address: address || null,
        currency,
        timezone,
      })
      .eq("id", currentHostel.id);

    setLoading(false);

    if (!error) {
      alert("Settings updated successfully! Reloading page to apply updates...");
      window.location.reload();
    } else {
      alert(error.message);
    }
  };

  if (!currentHostel) {
    return (
      <AdminLayout>
        <Header title="Settings" />
        <div className="flex h-96 items-center justify-center text-gray-500">
          No hostel information found.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Header title="Settings" />

      <div className="p-6 max-w-2xl">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-6">Hostel Metadata & Configuration</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Hostel Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Royal Heights Residence"
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Contact Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+92 300 1234567"
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Address Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Hostel Location Address..."
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Local Currency Label
                </label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    placeholder="PKR"
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Timezone Standard
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="Asia/Karachi"
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-60 cursor-pointer mt-6"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Update Hostel Settings</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
