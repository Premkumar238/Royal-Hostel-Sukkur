type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

const variants: Record<BadgeVariant, string> = {
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  neutral: "bg-gray-100 text-gray-600",
};

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
}

export function StatusBadge({ status, variant }: StatusBadgeProps) {
  const autoVariant = variant ?? getAutoVariant(status);
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${variants[autoVariant]}`}>
      {status}
    </span>
  );
}

function getAutoVariant(status: string): BadgeVariant {
  const s = status.toLowerCase();
  if (["paid", "active", "available", "completed"].includes(s)) return "success";
  if (["pending", "partial", "due", "moving_out", "open"].includes(s)) return s === "partial" ? "danger" : "warning";
  if (["inactive", "full", "maintenance", "checked_out"].includes(s)) return "danger";
  return "neutral";
}
