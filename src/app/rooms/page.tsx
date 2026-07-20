"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Header } from "@/components/layout/Header";
import { useHostel } from "@/contexts/HostelContext";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Room, RoomStatus } from "@/types/database";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Filter,
  DoorOpen,
  Layers,
  Users,
  Loader2,
  UserPlus,
  Receipt,
  BedDouble,
} from "lucide-react";

interface StudentWithPricing {
  id: string;
  full_name: string;
  student_code: string;
  monthly_rent: number;
  has_mess: boolean;
  mess_fee: number;
}

interface AllocationWithStudent {
  id: string;
  status: "active" | "moving_out" | "checked_out";
  check_in_date: string;
  students?: StudentWithPricing;
}

interface BedWithAllocation {
  id: string;
  bed_label: string;
  is_available: boolean;
  allocations?: AllocationWithStudent[];
}

export default function RoomsPage() {
  const router = useRouter();
  const { currentHostel } = useHostel();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [totalBeds, setTotalBeds] = useState(0);
  const [availableBeds, setAvailableBeds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Detail Modal States
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [beds, setBeds] = useState<BedWithAllocation[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [unallocatedStudents, setUnallocatedStudents] = useState<StudentWithPricing[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedBedId, setSelectedBedId] = useState("");
  const [rentPaidStudentIds, setRentPaidStudentIds] = useState<Set<string>>(new Set());

  // Add Room Form fields
  const [roomNumber, setRoomNumber] = useState("");
  const [floor, setFloor] = useState<number | "">("");
  const [roomType, setRoomType] = useState("Single Standard");
  const [capacity, setCapacity] = useState<number | "">("");
  const [status, setStatus] = useState<RoomStatus>("available");

  const supabase = createClient();

  const fetchRooms = async () => {
    if (!currentHostel) return;
    setLoading(true);

    const [{ data, error }, { data: bedData }] = await Promise.all([
      supabase
        .from("rooms")
        .select("*")
        .eq("hostel_id", currentHostel.id)
        .order("room_number", { ascending: true }),
      supabase
        .from("beds")
        .select("is_available")
        .eq("hostel_id", currentHostel.id),
    ]);

    if (!error && data) {
      setRooms(data);
    }

    if (bedData) {
      setTotalBeds(bedData.length);
      setAvailableBeds(bedData.filter((bed) => bed.is_available).length);
    } else {
      setTotalBeds(0);
      setAvailableBeds(0);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
  }, [currentHostel]);

  const handleOpenDetail = async (room: Room) => {
    setSelectedRoom(room);
    setDetailLoading(true);
    setSelectedStudentId("");
    setSelectedBedId("");

    const { data: bedData } = await supabase
      .from("beds")
      .select("*, allocations(*, students(*))")
      .eq("room_id", room.id);

    const { data: studentData } = await supabase
      .from("students")
      .select("*")
      .eq("hostel_id", currentHostel!.id)
      .eq("status", "active");

    const { data: activeAllocations } = await supabase
      .from("allocations")
      .select("student_id")
      .eq("status", "active");

    if (bedData) {
      setBeds(bedData as unknown as BedWithAllocation[]);

      const billingMonth = `${new Date().toISOString().slice(0, 7)}-01`;
      const occupiedStudentIds = (bedData as unknown as BedWithAllocation[])
        .flatMap((bed) => bed.allocations ?? [])
        .filter((alloc) => alloc.status === "active" && alloc.students?.id)
        .map((alloc) => alloc.students!.id);

      if (occupiedStudentIds.length > 0) {
        const { data: paidRentRows } = await supabase
          .from("fee_records")
          .select("student_id")
          .eq("hostel_id", currentHostel!.id)
          .eq("billing_month", billingMonth)
          .eq("fee_type", "rent")
          .eq("status", "paid")
          .in("student_id", occupiedStudentIds);

        setRentPaidStudentIds(new Set(paidRentRows?.map((row) => row.student_id) ?? []));
      } else {
        setRentPaidStudentIds(new Set());
      }
    } else {
      setRentPaidStudentIds(new Set());
    }

    if (studentData) {
      const activeAllocatedIds = new Set(activeAllocations?.map((a) => a.student_id) || []);
      const unallocated = studentData.filter((s) => !activeAllocatedIds.has(s.id));
      setUnallocatedStudents(unallocated as unknown as StudentWithPricing[]);
    }

    setDetailLoading(false);
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !selectedStudentId || !selectedBedId) return;
    setFormLoading(true);

    const today = new Date().toISOString().split("T")[0];

    const { error: allocError } = await supabase.from("allocations").insert([
      {
        hostel_id: currentHostel!.id,
        student_id: selectedStudentId,
        bed_id: selectedBedId,
        check_in_date: today,
        status: "active",
      },
    ]);

    if (!allocError) {
      await supabase.from("beds").update({ is_available: false }).eq("id", selectedBedId);
      handleOpenDetail(selectedRoom);
    } else {
      alert(allocError.message);
    }
    setFormLoading(false);
  };

  const handleGoToPayRent = (studentId: string) => {
    const month = new Date().toISOString().slice(0, 7);
    router.push(`/fees/pay?studentId=${studentId}&month=${month}&include=rent`);
  };

  const handleCheckOut = async (allocationId: string, bedId: string) => {
    if (!confirm("Check out this student?")) return;
    setFormLoading(true);
    const today = new Date().toISOString().split("T")[0];

    await supabase
      .from("allocations")
      .update({ status: "checked_out", check_out_date: today })
      .eq("id", allocationId);

    await supabase.from("beds").update({ is_available: true }).eq("id", bedId);

    setFormLoading(false);
    if (selectedRoom) handleOpenDetail(selectedRoom);
  };

  const openAddModal = () => {
    setEditingRoom(null);
    setRoomNumber("");
    setFloor("");
    setRoomType("Single Standard");
    setCapacity("");
    setStatus("available");
    setShowAddModal(true);
  };

  const openEditModal = (room: Room, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRoom(room);
    setRoomNumber(room.room_number);
    setFloor(room.floor);
    setRoomType(room.room_type);
    setCapacity(room.capacity);
    setStatus(room.status);
    setShowAddModal(true);
  };

  const handleRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHostel) return;
    setFormLoading(true);

    const payload = {
      hostel_id: currentHostel.id,
      room_number: roomNumber,
      floor: Number(floor || 0),
      room_type: roomType,
      capacity: Number(capacity || 1),
      price_per_month: 0,
      status,
    };

    let error;
    let roomData: Room | null = null;

    if (editingRoom) {
      const { data, error: err } = await supabase
        .from("rooms")
        .update(payload)
        .eq("id", editingRoom.id)
        .select()
        .single();
      error = err;
      if (data) roomData = data;
    } else {
      const { data, error: err } = await supabase
        .from("rooms")
        .insert([payload])
        .select()
        .single();
      error = err;
      if (data) roomData = data;
    }

    if (!error && roomData) {
      const roomId = roomData.id;
      const { data: existingBeds } = await supabase
        .from("beds")
        .select("*")
        .eq("room_id", roomId);

      const currentBedsCount = existingBeds?.length ?? 0;
      const targetCapacity = Number(capacity || 1);

      if (currentBedsCount < targetCapacity) {
        const bedsToCreate = [];
        for (let i = currentBedsCount; i < targetCapacity; i++) {
          const bedLabel = targetCapacity === 1 ? "Single" : `Bed ${String.fromCharCode(65 + i)}`;
          bedsToCreate.push({
            room_id: roomId,
            hostel_id: currentHostel.id,
            bed_label: bedLabel,
            is_available: true,
          });
        }
        await supabase.from("beds").insert(bedsToCreate);
      }
    }

    setFormLoading(false);
    if (!error) {
      setShowAddModal(false);
      fetchRooms();
    } else {
      alert(error.message);
    }
  };

  const handleDeleteRoom = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this room?")) return;
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (!error) {
      fetchRooms();
    } else {
      alert(error.message);
    }
  };

  const activeBedsWithStudents = beds.map((bed) => {
    const activeAlloc = bed.allocations?.find((a) => a.status === "active");
    return {
      bedId: bed.id,
      bedLabel: bed.bed_label,
      isAvailable: bed.is_available,
      allocationId: activeAlloc?.id,
      student: activeAlloc?.students,
    };
  });

  const occupiedBedsCount = activeBedsWithStudents.filter((b) => !b.isAvailable).length;
  const vacantBedsCount = beds.length - occupiedBedsCount;

  const totalRoomRevenue = activeBedsWithStudents.reduce((sum, item) => {
    if (item.student) {
      return sum + Number(item.student.monthly_rent || 0);
    }
    return sum;
  }, 0);

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch = r.room_number.toLowerCase().includes(search.toLowerCase()) || 
                          r.room_type.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout>
      <Header title="Room Inventory" searchPlaceholder="Quick search..." />

      <div className="page-shell">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Rooms</span>
            <p className="mt-1 text-2xl font-bold text-gray-900">{rooms.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Beds</span>
            <p className="mt-1 text-2xl font-bold text-blue-700">{totalBeds}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Available Beds</span>
                <p className="mt-1 text-2xl font-bold text-emerald-700">{availableBeds}</p>
              </div>
              <Link
                href="/rooms/available"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                <BedDouble className="h-3.5 w-3.5" />
                View Vacant
              </Link>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search rooms by room number or type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-sm font-medium text-gray-600 focus:border-blue-400 focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="available">Available</option>
                <option value="full">Full</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <Filter className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Room</span>
          </button>
        </div>

        {/* Room Cards Grid */}
        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-sm font-medium text-gray-500">No rooms found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => handleOpenDetail(room)}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <DoorOpen className="h-5 w-5" />
                    </span>
                    <StatusBadge status={room.status} />
                  </div>

                  <h4 className="text-lg font-bold text-gray-900">Room {room.room_number}</h4>
                  <p className="text-sm text-gray-400 mb-4">{room.room_type}</p>

                  <div className="space-y-2 border-t border-gray-100 pt-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Floor Level:</span>
                      <span className="font-semibold text-gray-700">{room.floor}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Total Beds:</span>
                      <span className="font-semibold text-gray-700">{room.capacity} beds</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-gray-50 pt-4 mt-4">
                  <button
                    onClick={(e) => openEditModal(room, e)}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={(e) => handleDeleteRoom(room.id, e)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Room Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-gray-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-base font-bold text-gray-900 mb-6">
              {editingRoom ? "Edit Room Details" : "Create New Room"}
            </h3>

            <form onSubmit={handleRoomSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Room Number
                  </label>
                  <input
                    type="text"
                    required
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="e.g. 101"
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Floor
                  </label>
                  <div className="relative">
                    <Layers className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      required
                      min={0}
                      value={floor}
                      onChange={(e) => setFloor(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="e.g. 1"
                      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Room Type / Tagline
                </label>
                <input
                  type="text"
                  required
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  placeholder="e.g. Single Deluxe, Double Occupancy"
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Bed Capacity
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      required
                      min={1}
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="e.g. 2"
                      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Availability Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as RoomStatus)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 focus:border-blue-400 focus:outline-none cursor-pointer"
                  >
                    <option value="available">Available</option>
                    <option value="full">Full</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-60 cursor-pointer mt-6"
              >
                {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : editingRoom ? "Save Room" : "Create Room"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Room Details & Management Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setSelectedRoom(null)} />
          <div className="relative w-full max-w-2xl rounded-xl border border-gray-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setSelectedRoom(null)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            {detailLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Room {selectedRoom.room_number} Management</h3>
                <p className="text-xs text-gray-400 mb-6">{selectedRoom.room_type} · Floor {selectedRoom.floor}</p>

                {/* Info Badges */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">Vacant Beds</span>
                    <span className="text-lg font-extrabold text-blue-600">{vacantBedsCount} / {beds.length}</span>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">Occupied Beds</span>
                    <span className="text-lg font-extrabold text-gray-800">{occupiedBedsCount}</span>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">Monthly Rent Roll</span>
                    <span className="text-lg font-extrabold text-green-700">{formatCurrency(totalRoomRevenue)}</span>
                  </div>
                </div>

                {/* Occupied list */}
                <div className="mb-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Allocated Students</h4>
                  {occupiedBedsCount === 0 ? (
                    <p className="text-xs text-gray-500 italic p-2 border border-dashed border-gray-200 rounded-lg">
                      No students allocated to this room yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {activeBedsWithStudents
                        .filter((b) => !b.isAvailable && b.student)
                        .map((item) => {
                          const s = item.student!;
                          const rentAmount = Number(s.monthly_rent || 0);
                          const rentPaidThisMonth = rentPaidStudentIds.has(s.id);
                          return (
                            <div
                              key={item.bedId}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors gap-3"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <strong className="text-sm font-semibold text-gray-900">{s.full_name}</strong>
                                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                                    {item.bedLabel}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  Code: {s.student_code} · Rent: {formatCurrency(rentAmount)}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {rentAmount > 0 &&
                                  (rentPaidThisMonth ? (
                                    <span className="inline-flex items-center rounded-lg bg-green-100 px-3 py-1.5 text-xs font-semibold uppercase text-green-700">
                                      Paid
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleGoToPayRent(s.id)}
                                      className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer shadow-xs active:scale-95 transition-all"
                                    >
                                      <Receipt className="h-3.5 w-3.5" />
                                      <span>Pay Rent</span>
                                    </button>
                                  ))}
                                <button
                                  onClick={() => handleCheckOut(item.allocationId!, item.bedId)}
                                  className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer transition-all"
                                >
                                  Check out
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Quick assign */}
                {vacantBedsCount > 0 && (
                  <div className="border-t border-gray-100 pt-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Quick Assign Student</h4>
                    <form onSubmit={handleAllocate} className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <select
                          required
                          value={selectedStudentId}
                          onChange={(e) => setSelectedStudentId(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-xs text-gray-900 focus:border-blue-400 focus:outline-none cursor-pointer"
                        >
                          <option value="">-- Choose active student --</option>
                          {unallocatedStudents.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.full_name} ({s.student_code} - Rent: {formatCurrency(s.monthly_rent)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-full sm:w-48">
                        <select
                          required
                          value={selectedBedId}
                          onChange={(e) => setSelectedBedId(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-xs text-gray-900 focus:border-blue-400 focus:outline-none cursor-pointer"
                        >
                          <option value="">-- Choose vacant bed --</option>
                          {activeBedsWithStudents
                            .filter((b) => b.isAvailable)
                            .map((b) => (
                              <option key={b.bedId} value={b.bedId}>
                                {b.bedLabel}
                              </option>
                            ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={formLoading || !selectedStudentId || !selectedBedId}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Assign Bed</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
