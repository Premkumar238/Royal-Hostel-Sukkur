"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Header } from "@/components/layout/Header";
import { useHostel } from "@/contexts/HostelContext";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Room } from "@/types/database";
import {
  ArrowLeft,
  BedDouble,
  DoorOpen,
  Loader2,
  Search,
} from "lucide-react";

interface BedRow {
  id: string;
  bed_label: string;
  is_available: boolean;
}

interface RoomWithBeds extends Room {
  beds: BedRow[];
}

export default function AvailableBedsPage() {
  const { currentHostel } = useHostel();
  const [rooms, setRooms] = useState<RoomWithBeds[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const supabase = createClient();

  useEffect(() => {
    const fetchRooms = async () => {
      if (!currentHostel) return;
      setLoading(true);

      const { data } = await supabase
        .from("rooms")
        .select("*, beds(id, bed_label, is_available)")
        .eq("hostel_id", currentHostel.id)
        .order("room_number", { ascending: true });

      if (data) {
        const roomsWithVacancy = (data as RoomWithBeds[]).filter((room) =>
          room.beds?.some((bed) => bed.is_available)
        );
        setRooms(roomsWithVacancy);
      }

      setLoading(false);
    };

    fetchRooms();
  }, [currentHostel]);

  const filteredRooms = rooms.filter((room) => {
    const availableLabels = room.beds
      ?.filter((bed) => bed.is_available)
      .map((bed) => bed.bed_label.toLowerCase())
      .join(" ");

    return (
      room.room_number.toLowerCase().includes(search.toLowerCase()) ||
      room.room_type.toLowerCase().includes(search.toLowerCase()) ||
      availableLabels.includes(search.toLowerCase())
    );
  });

  const totalAvailableBeds = rooms.reduce(
    (sum, room) => sum + (room.beds?.filter((bed) => bed.is_available).length ?? 0),
    0
  );

  return (
    <AdminLayout>
      <Header title="Available Beds" searchPlaceholder="Quick search..." />

      <div className="page-shell">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/rooms"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Rooms
          </Link>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            {totalAvailableBeds} bed{totalAvailableBeds === 1 ? "" : "s"} available across {rooms.length} room
            {rooms.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search room number, type, or bed..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <BedDouble className="mx-auto h-8 w-8 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No available beds found</p>
            <p className="text-xs text-gray-400 mt-1">All beds are currently occupied or rooms are under maintenance.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredRooms.map((room) => {
              const availableBeds = room.beds?.filter((bed) => bed.is_available) ?? [];
              const occupiedCount = (room.beds?.length ?? 0) - availableBeds.length;

              return (
                <div key={room.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <DoorOpen className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Room {room.room_number}</h3>
                        <p className="text-xs text-gray-400">
                          {room.room_type} · Floor {room.floor}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={room.status} />
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="rounded-lg bg-gray-50 p-3 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Total Beds</span>
                      <span className="text-lg font-extrabold text-gray-800">{room.beds?.length ?? room.capacity}</span>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-3 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Available</span>
                      <span className="text-lg font-extrabold text-emerald-700">{availableBeds.length}</span>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Occupied</span>
                      <span className="text-lg font-extrabold text-gray-700">{occupiedCount}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Vacant Bed Spaces
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {availableBeds.map((bed) => (
                        <span
                          key={bed.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                        >
                          <BedDouble className="h-3.5 w-3.5" />
                          {bed.bed_label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
