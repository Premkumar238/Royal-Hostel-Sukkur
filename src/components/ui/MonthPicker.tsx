"use client";

import { Calendar } from "lucide-react";
import { formatMonth } from "@/lib/utils";

type MonthPickerProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
};

export function MonthPicker({ value, onChange, className = "", id }: MonthPickerProps) {
  const labelDate = /^\d{4}-\d{2}$/.test(value)
    ? `${value}-01`
    : new Date().toISOString().slice(0, 7) + "-01";

  return (
    <label
      htmlFor={id}
      className={`relative inline-flex w-full min-w-0 cursor-pointer items-center rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 sm:w-auto sm:min-w-[9.5rem] ${className}`}
    >
      <Calendar
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        aria-hidden
      />
      <span className="pointer-events-none truncate text-sm font-semibold text-gray-900">
        {formatMonth(labelDate)}
      </span>
      <input
        id={id}
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label="Select month"
      />
    </label>
  );
}
