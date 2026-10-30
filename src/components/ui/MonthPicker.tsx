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
  /** Months after maxMonth to include (advance fee / billing months). */
  monthsForward?: number;
};

function addCalendarMonths(yearMonth: string, delta: number): string {
  const match = yearMonth.match(/^(\d{4})-(\d{2})$/);
  if (!match) return yearMonth;
  let year = Number(match[1]);
  let month = Number(match[2]) + delta;
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  while (month < 1) {
    month += 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

function buildMonthOptions(maxMonth: string, monthsBack: number, monthsForward = 0) {
  const match = maxMonth.match(/^(\d{4})-(\d{2})$/);
  if (!match) return [];

  let cursor = addCalendarMonths(maxMonth, monthsForward);
  const total = monthsBack + monthsForward + 1;
  const options: { value: string; label: string }[] = [];

  for (let i = 0; i < total; i++) {
    options.push({
      value: cursor,
      label: formatMonth(`${cursor}-01`),
    });
    cursor = addCalendarMonths(cursor, -1);
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
  monthsForward = 0,
}: MonthPickerProps) {
  const options = useMemo(
    () => buildMonthOptions(maxMonth, monthsBack, monthsForward),
    [maxMonth, monthsBack, monthsForward]
  );

  const safeValue = options.some((option) => option.value === value)
    ? value
    : (options.find((o) => o.value === value)?.value ?? options[0]?.value ?? value);

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
