"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Header } from "@/components/layout/Header";
import { useHostel } from "@/contexts/HostelContext";
import { createClient } from "@/lib/supabase/client";
import type { PoliceVerification } from "@/types/database";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  User,
  ShieldCheck,
  Loader2,
  Save,
  BadgeCheck,
} from "lucide-react";

export default function PoliceVerificationPage() {
  const { currentHostel } = useHostel();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);

  const [ownerName, setOwnerName] = useState("");
  const [ownerContact, setOwnerContact] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerContact, setManagerContact] = useState("");
  const [hostelName, setHostelName] = useState("");
  const [address, setAddress] = useState("");
  const [policeVerificationId, setPoliceVerificationId] = useState("");

  const supabase = createClient();

  useEffect(() => {
    const fetchRecord = async () => {
      if (!currentHostel) return;
      setLoading(true);

      const { data } = await supabase
        .from("police_verifications")
        .select("*")
        .eq("hostel_id", currentHostel.id)
        .maybeSingle();

      if (data) {
        const record = data as PoliceVerification;
        setRecordId(record.id);
        setOwnerName(record.owner_name ?? "");
        setOwnerContact(record.owner_contact ?? "");
        setOwnerEmail(record.owner_email ?? "");
        setManagerName(record.manager_name ?? "");
        setManagerContact(record.manager_contact ?? "");
        setHostelName(record.hostel_name ?? currentHostel.name);
        setAddress(record.address ?? currentHostel.address ?? "");
        setPoliceVerificationId(record.police_verification_id ?? "");
      } else {
        setRecordId(null);
        setOwnerName("");
        setOwnerContact("");
        setOwnerEmail("");
        setManagerName("");
        setManagerContact("");
        setHostelName(currentHostel.name);
        setAddress(currentHostel.address ?? "");
        setPoliceVerificationId("");
      }

      setLoading(false);
    };

    fetchRecord();
  }, [currentHostel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHostel) return;
    setSaving(true);

    const payload = {
      hostel_id: currentHostel.id,
      owner_name: ownerName.trim() || null,
      owner_contact: ownerContact.trim() || null,
      owner_email: ownerEmail.trim() || null,
      manager_name: managerName.trim() || null,
      manager_contact: managerContact.trim() || null,
      hostel_name: hostelName.trim() || null,
      address: address.trim() || null,
      police_verification_id: policeVerificationId.trim() || null,
    };

    let error;
    if (recordId) {
      const { error: err } = await supabase
        .from("police_verifications")
        .update(payload)
        .eq("id", recordId);
      error = err;
    } else {
      const { data, error: err } = await supabase
        .from("police_verifications")
        .insert([payload])
        .select("id")
        .single();
      error = err;
      if (data) setRecordId(data.id);
    }

    setSaving(false);

    if (!error) {
      alert("Police verification details saved successfully.");
    } else {
      alert(error.message);
    }
  };

  if (!currentHostel) {
    return (
      <AdminLayout>
        <Header title="Police Verification" />
        <div className="flex h-96 items-center justify-center text-gray-500">
          No hostel information found.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Header title="Police Verification" searchPlaceholder="Quick search..." />

      <div className="p-6 max-w-3xl">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4 mb-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <h3 className="text-base font-bold text-gray-900">Police Verification Details</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Store owner, manager, and hostel information for police verification records.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-4 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Hostel Owner
                </p>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Owner Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Owner Contact
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={ownerContact}
                        onChange={(e) => setOwnerContact(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Owner Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-4 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Hostel Manager
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Manager Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={managerName}
                        onChange={(e) => setManagerName(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Manager Contact
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={managerContact}
                        onChange={(e) => setManagerContact(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-4 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Hostel Information
                </p>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Hostel Name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={hostelName}
                      onChange={(e) => setHostelName(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Police Verification ID
                </label>
                <div className="relative">
                  <BadgeCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={policeVerificationId}
                    onChange={(e) => setPoliceVerificationId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Police Verification</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
