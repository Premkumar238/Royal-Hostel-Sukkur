"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Header } from "@/components/layout/Header";
import { useHostel } from "@/contexts/HostelContext";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import type { Student } from "@/types/database";
import {
  Search,
  Plus,
  X,
  BedDouble,
  Calendar,
  Loader2,
  CheckCircle,
} from "lucide-react";

interface BedWithRoom {
  id: string;
  bed_label: string;
  room_id: string;
  rooms?: {
    id: string;
    room_number: string;
    room_type: string;
  };
}

interface AllocationWithDetails {
  id: string;
  student_id: string;
  bed_id: string;
  check_in_date: string;
  check_out_date: string | null;
  status: "active" | "moving_out" | "checked_out";
  students?: {
    id: string;
    full_name: string;
    student_code: string;
  };
  beds?: BedWithRoom;
}

export default function AllocationsPage() {
  const { currentHostel } = useHostel();
  const [allocations, setAllocations] = useState<AllocationWithDetails[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [availableBeds, setAvailableBeds] = useState<BedWithRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Form Fields
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedBedId, setSelectedBedId] = useState("");
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split("T")[0]);

  const supabase = createClient();

  const fetchData = async () => {
    if (!currentHostel) return;
    setLoading(true);

    // Fetch allocations with nested details
    const { data: allocData } = await supabase
      .from("allocations")
      .select("*, students(*), beds(*, rooms(*))")
      .eq("hostel_id", currentHostel.id)
      .order("created_at", { ascending: false });

    // Fetch unallocated active students
    const { data: studData } = await supabase
      .from("students")
      .select("*")
      .eq("hostel_id", currentHostel.id)
      .eq("status", "active");

    // Fetch available beds
    const { data: bedData } = await supabase
      .from("beds")
      .select("*, rooms(*)")
      .eq("hostel_id", currentHostel.id)
      .eq("is_available", true);

    if (allocData) setAllocations(allocData as unknown as AllocationWithDetails[]);
    if (studData) {
      // Filter out students who already have an active allocation
      const activeAllocatedIds = new Set(
        (allocData || [])
          .filter((a) => a.status === "active")
          .map((a) => a.student_id)
      );
      setStudents(studData.filter((s) => !activeAllocatedIds.has(s.id)));
    }
    if (bedData) setAvailableBeds(bedData as unknown as BedWithRoom[]);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentHostel]);

  const openAddModal = () => {
    setSelectedStudentId("");
    setSelectedBedId("");
    setCheckInDate(new Date().toISOString().split("T")[0]);
    setShowModal(true);
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHostel || !selectedStudentId || !selectedBedId) return;
    setFormLoading(true);

    // 1. Insert allocation
    const { error: allocError } = await supabase.from("allocations").insert([
      {
        hostel_id: currentHostel.id,
        student_id: selectedStudentId,
        bed_id: selectedBedId,
        check_in_date: checkInDate,
        status: "active",
      },
    ]);

    if (!allocError) {
      // 2. Update bed to unavailable
      await supabase
        .from("beds")
        .update({ is_available: false })
        .eq("id", selectedBedId);

      setShowModal(false);
      fetchData();
    } else {
      alert(allocError.message);
    }
    setFormLoading(false);
  };

  const handleCheckOut = async (allocation: AllocationWithDetails) => {
    if (!confirm("Are you sure you want to check out this student? This will set their bed to available.")) return;

    const today = new Date().toISOString().split("T")[0];

    // 1. Update allocation status
    const { error } = await supabase
      .from("allocations")
      .update({
        status: "checked_out",
        check_out_date: today,
      })
      .eq("id", allocation.id);

    if (!error) {
      // 2. Update bed status
      await supabase
        .from("beds")
        .update({ is_available: true })
        .eq("id", allocation.bed_id);

      fetchData();
    } else {
      alert(error.message);
    }
  };

  const filteredAllocations = allocations.filter((a) => {
    const studentName = a.students?.full_name?.toLowerCase() || "";
    const studentCode = a.students?.student_code?.toLowerCase() || "";
    const roomNumber = a.beds?.rooms?.room_number?.toLowerCase() || "";
    const query = search.toLowerCase();

    return studentName.includes(query) || studentCode.includes(query) || roomNumber.includes(query);
  });

  return (
    <AdminLayout>
      <Header title="Room Allocations" searchPlaceholder="Quick search..." />

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student, ID code or room number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Allocation</span>
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredAllocations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-sm font-medium text-gray-500">No allocations found</p>
            <p className="text-xs text-gray-400 mt-1">Allocate rooms and beds to registered students.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Room & Bed</th>
                    <th className="px-6 py-4">Check In</th>
                    <th className="px-6 py-4">Check Out</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAllocations.map((alloc) => (
                    <tr key={alloc.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={alloc.students?.full_name ?? "?"} size="sm" />
                          <div>
                            <span className="font-semibold text-gray-900 block">{alloc.students?.full_name}</span>
                            <span className="text-xs text-gray-400">{alloc.students?.student_code}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-700 block">
                          Room {alloc.beds?.rooms?.room_number ?? "—"}
                        </span>
                        <span className="text-xs text-gray-400">{alloc.beds?.bed_label ?? "—"}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{formatDate(alloc.check_in_date)}</td>
                      <td className="px-6 py-4 text-gray-600">{alloc.check_out_date ? formatDate(alloc.check_out_date) : "—"}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={alloc.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        {alloc.status === "active" && (
                          <button
                            onClick={() => handleCheckOut(alloc)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>Check Out</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-gray-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-base font-bold text-gray-900 mb-6">Allocate Student to Bed</h3>

            <form onSubmit={handleAllocate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Select Student
                </label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 focus:border-blue-400 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose active unallocated student --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.student_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Select Room & Bed
                </label>
                <select
                  required
                  value={selectedBedId}
                  onChange={(e) => setSelectedBedId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 focus:border-blue-400 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose available bed --</option>
                  {availableBeds.map((b) => (
                    <option key={b.id} value={b.id}>
                      Room {b.rooms?.room_number} - {b.bed_label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Check-in Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    required
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={formLoading || !selectedStudentId || !selectedBedId}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-60 cursor-pointer mt-6"
              >
                {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>
                    <BedDouble className="h-4 w-4" />
                    <span>Allocate Room</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
