"use client";

import Image from "next/image";
import { getInitials } from "@/lib/utils";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  src?: string | null;
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export function Avatar({ name, size = "md", src }: AvatarProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size === "sm" ? 32 : size === "md" ? 40 : 48}
        height={size === "sm" ? 32 : size === "md" ? 40 : 48}
        className={`${sizes[size]} rounded-full object-cover`}
        unoptimized
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} flex items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700`}
    >
      {getInitials(name)}
    </div>
  );
}
