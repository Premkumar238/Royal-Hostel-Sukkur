"use client";

import { useMemo } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { currentYearMonth, formatMonth } from "@/lib/utils";

type MonthPickerProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  /** How many months back from maxMonth to list (inclusive of max month). */
  monthsBack?: number;
  /** Latest selectable month `YYYY-MM` (defaults to current month). */
  maxMonth?: string;
};

function buildMonthOptions(maxMonth: string, monthsBack: number) {
  const match = maxMonth.match(/^(\d{4})-(\d{2})$/);
  if (!match) return [];

  let year = Number(match[1]);
  let month = Number(match[2]);
  const options: { value: string; label: string }[] = [];

  for (let i = 0; i < monthsBack; i++) {
    const value = `${year}-${String(month).padStart(2, "0")}`;
    options.push({
      value,
      label: formatMonth(`${value}-01`),
    });

    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }

  return options;
}

export function MonthPicker({
  value,
  onChange,
  className = "",
  id,
  monthsBack = 48,
  maxMonth = currentYearMonth(),
}: MonthPickerProps) {
  const options = useMemo(
    () => buildMonthOptions(maxMonth, monthsBack),
    [maxMonth, monthsBack]
  );

  const safeValue = options.some((option) => option.value === value)
    ? value
    : (options[0]?.value ?? value);

  return (
    <div className={`relative inline-flex w-full min-w-0 sm:w-auto ${className}`}>
      <Calendar
        className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400"
        aria-hidden
      />
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400"
        aria-hidden
      />
      <select
        id={id}
        value={safeValue}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-[11rem] cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-9 text-sm font-semibold text-gray-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        aria-label="Select month"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
