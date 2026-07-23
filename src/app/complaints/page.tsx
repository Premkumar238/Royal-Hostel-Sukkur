"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Header } from "@/components/layout/Header";
import { useHostel } from "@/contexts/HostelContext";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import type { Complaint, Student } from "@/types/database";
import {
  Search,
  Plus,
  X,
  Filter,
  Loader2,
  CheckCircle2,
  MessageSquareWarning,
} from "lucide-react";

export default function ComplaintsPage() {
  const { currentHostel } = useHostel();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [description, setDescription] = useState("");

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    if (!currentHostel) return;
    setLoading(true);

    const [complaintsRes, studentsRes] = await Promise.all([
      supabase
        .from("complaints")
        .select("*, students(*)")
        .eq("hostel_id", currentHostel.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("students")
        .select("*")
        .eq("hostel_id", currentHostel.id)
        .eq("status", "active")
        .order("full_name", { ascending: true }),
    ]);

    if (complaintsRes.data) setComplaints(complaintsRes.data as unknown as Complaint[]);
    if (studentsRes.data) setStudents(studentsRes.data);

    setLoading(false);
  }, [currentHostel, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAddModal = () => {
    setSelectedStudentId("");
    setDescription("");
    setShowModal(true);
  };

  const handleRegisterComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHostel || !selectedStudentId || !description.trim()) return;

    setFormLoading(true);

    const { error } = await supabase.from("complaints").insert([
      {
        hostel_id: currentHostel.id,
        student_id: selectedStudentId,
        description: description.trim(),
        status: "open",
      },
    ]);

    setFormLoading(false);

    if (!error) {
      setShowModal(false);
      fetchData();
    } else {
      alert(error.message);
    }
  };

  const handleCompleteComplaint = async (complaint: Complaint) => {
    if (!confirm("Mark this complaint as completed?")) return;

    setFormLoading(true);

    const { error } = await supabase
      .from("complaints")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", complaint.id);

    setFormLoading(false);

    if (!error) {
      fetchData();
    } else {
      alert(error.message);
    }
  };

  const filteredComplaints = complaints.filter((complaint) => {
    const studentName = complaint.students?.full_name?.toLowerCase() ?? "";
    const studentCode = complaint.students?.student_code?.toLowerCase() ?? "";
    const complaintText = complaint.description.toLowerCase();
    const matchesSearch =
      studentName.includes(search.toLowerCase()) ||
      studentCode.includes(search.toLowerCase()) ||
      complaintText.includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || complaint.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openCount = complaints.filter((complaint) => complaint.status === "open").length;

  return (
    <AdminLayout>
      <Header title="Complaint Management" searchPlaceholder="Quick search..." />

      <div className="page-shell">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Complaints</span>
            <p className="mt-1 text-2xl font-bold text-gray-900">{complaints.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Open Complaints</span>
            <p className="mt-1 text-2xl font-bold text-amber-600">{openCount}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="toolbar-controls">
            <div className="toolbar-search">
              <Search className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search complaints..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-sm font-medium text-gray-600 focus:border-blue-400 focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="completed">Completed</option>
              </select>
              <Filter className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Register Complaint</span>
          </button>
        </div>

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <MessageSquareWarning className="mx-auto h-8 w-8 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No complaints found</p>
            <p className="text-xs text-gray-400 mt-1">Register a new complaint when a student reports an issue.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Registered</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredComplaints.map((complaint) => (
                    <tr key={complaint.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={complaint.students?.full_name ?? complaint.students?.student_code ?? "?"}
                            src={complaint.students?.student_image_url}
                            size="sm"
                          />
                          <div>
                            <span className="font-semibold text-gray-900 block">
                              {complaint.students?.full_name || "—"}
                            </span>
                            <span className="text-xs text-gray-400">{complaint.students?.student_code}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700 max-w-md">
                        <p className="line-clamp-3">{complaint.description}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                        {formatDate(complaint.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={complaint.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        {complaint.status === "open" ? (
                          <button
                            onClick={() => handleCompleteComplaint(complaint)}
                            disabled={formLoading}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 cursor-pointer shadow-xs active:scale-95 transition-all disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Complete</span>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {complaint.completed_at ? formatDate(complaint.completed_at) : "Completed"}
                          </span>
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

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setShowModal(false)} />
          <div className="modal-panel max-w-lg">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-base font-bold text-gray-900 mb-6">Register New Complaint</h3>

            <form onSubmit={handleRegisterComplaint} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Student
                </label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 focus:border-blue-400 focus:outline-none cursor-pointer"
                >
                  <option value="">Select student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name || student.student_code} ({student.student_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Description
                </label>
                <textarea
                  required
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={formLoading || !selectedStudentId || !description.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register Complaint"}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
