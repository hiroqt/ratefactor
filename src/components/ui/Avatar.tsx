"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarStatus = "online" | "available" | "busy" | "focusing" | "offline";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string; status: string }> = {
  xs: { container: "w-6 h-6", text: "text-[10px]", status: "w-1.5 h-1.5 ring-1" },
  sm: { container: "w-8 h-8", text: "text-xs", status: "w-2 h-2 ring-1.5" },
  md: { container: "w-10 h-10", text: "text-sm", status: "w-2.5 h-2.5 ring-2" },
  lg: { container: "w-14 h-14", text: "text-lg", status: "w-3 h-3 ring-2" },
  xl: { container: "w-20 h-20", text: "text-2xl", status: "w-4 h-4 ring-2" },
};

const statusColors: Record<AvatarStatus, string> = {
  online: "bg-emerald-400",
  available: "bg-emerald-400",
  busy: "bg-rose-500",
  focusing: "bg-amber-400",
  offline: "bg-zinc-500",
};

export function Avatar({
  src,
  alt = "Avatar",
  fallback = "U",
  size = "md",
  status,
  className,
  ...props
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  const sizeConfig = sizeStyles[size];

  const initials = fallback
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className={cn("relative inline-block shrink-0", className)} {...props}>
      <div
        className={cn(
          "rounded-full overflow-hidden flex items-center justify-center bg-zinc-800 border border-zinc-700/60 font-semibold text-zinc-300 select-none",
          sizeConfig.container
        )}
      >
        {src && !hasError ? (
          <img
            src={src}
            alt={alt}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className={sizeConfig.text}>{initials}</span>
        )}
      </div>

      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-zinc-900",
            sizeConfig.status,
            statusColors[status]
          )}
          title={`Status: ${status}`}
        />
      )}
    </div>
  );
}
