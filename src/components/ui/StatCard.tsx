import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: { value: string; positive: boolean };
  children?: React.ReactNode;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  children,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-1 min-h-[2.5rem] text-xs leading-snug text-gray-400 line-clamp-2">
              {subtitle}
            </p>
          )}
          {!subtitle && !children && <div className="min-h-[2.5rem]" aria-hidden />}
          {trend && (
            <p className={`mt-2 text-xs font-medium ${trend.positive ? "text-green-600" : "text-red-600"}`}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
            <Icon className="h-5 w-5 text-blue-600" />
          </div>
        )}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
