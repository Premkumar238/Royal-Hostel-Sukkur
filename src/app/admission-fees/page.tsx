"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Header } from "@/components/layout/Header";
import { Avatar } from "@/components/ui/Avatar";
import { useHostel } from "@/contexts/HostelContext";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { AdmissionFee, Student } from "@/types/database";
import { Calendar, DollarSign, GraduationCap, Loader2, Plus, Trash2, X } from "lucide-react";

export default function AdmissionFeesPage() {
  const { currentHostel } = useHostel();
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AdmissionFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const supabase = createClient();
  const currency = currentHostel?.currency ?? "PKR";

  const fetchData = useCallback(async () => {
    if (!currentHostel) return;
    setLoading(true);

    const [studentRes, feeRes] = await Promise.all([
      supabase
        .from("students")
        .select("*")
        .eq("hostel_id", currentHostel.id)
        .eq("status", "active")
        .order("full_name", { ascending: true }),
      supabase
        .from("admission_fees")
        .select("*, students(*)")
        .eq("hostel_id", currentHostel.id)
        .order("payment_date", { ascending: false }),
    ]);

    if (studentRes.data) setStudents(studentRes.data as Student[]);
    if (feeRes.data) setRecords(feeRes.data as unknown as AdmissionFee[]);
    setLoading(false);
  }, [currentHostel, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const recordedStudentIds = useMemo(
    () => new Set(records.map((r) => r.student_id)),
    [records]
  );

  const eligibleStudents = useMemo(
    () => students.filter((s) => !recordedStudentIds.has(s.id)),
    [recordedStudentIds, students]
  );

  const totalCollected = useMemo(
    () => records.reduce((sum, r) => sum + Number(r.amount), 0),
    [records]
  );

  const openModal = () => {
    setStudentId("");
    setAmount("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHostel || !studentId) return;

    if (recordedStudentIds.has(studentId)) {
      alert("This student already has an admission fee record.");
      return;
    }

    setFormLoading(true);
    const { error } = await supabase.from("admission_fees").insert([
      {
        hostel_id: currentHostel.id,
        student_id: studentId,
        amount: Number(amount) || 0,
        payment_date: paymentDate,
        notes: notes.trim() || null,
      },
    ]);

    setFormLoading(false);
    if (!error) {
      setShowModal(false);
      fetchData();
    } else {
      alert(error.message.includes("unique") ? "This student already has an admission fee." : error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this admission fee record?")) return;
    const { error } = await supabase.from("admission_fees").delete().eq("id", id);
    if (!error) fetchData();
    else alert(error.message);
  };

  return (
    <AdminLayout>
      <Header title="Admission Fees" searchPlaceholder="Quick search..." />

      <div className="page-shell space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-900">Admission Fee Records</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              One admission fee per student · counted separately in hostel income
            </p>
          </div>
          <button
            onClick={openModal}
            disabled={eligibleStudents.length === 0}
            className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer shadow-sm sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Record Admission Fee</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:max-w-xs">
          <div className="flex h-full flex-col rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
              Total Collected
            </span>
            <p className="mt-1 text-2xl font-bold text-blue-900">{formatCurrency(totalCollected, currency)}</p>
            <p className="mt-auto pt-1 text-xs text-blue-700/80">{records.length} students</p>
          </div>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <GraduationCap className="mx-auto h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm font-medium text-gray-500">No admission fees recorded yet</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Payment Date</th>
                    <th className="px-6 py-4">Notes</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Avatar name={row.students?.full_name ?? "?"} size="sm" />
                          <span className="font-semibold text-gray-900">
                            {row.students?.full_name ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-emerald-700">
                        {formatCurrency(row.amount, currency)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{formatDate(row.payment_date)}</td>
                      <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{row.notes ?? "—"}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
          <div className="modal-panel max-w-md">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-base font-bold text-gray-900 mb-6">Record Admission Fee</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Student
                </label>
                <select
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm focus:border-blue-400 focus:outline-none cursor-pointer"
                >
                  <option value="">Select enrolled student</option>
                  {eligibleStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.student_code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Admission Fee Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    required
                    min={0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Payment Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-blue-400 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm focus:border-blue-400 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={formLoading || !studentId}
                className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
              >
                {formLoading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Save Admission Fee"}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
