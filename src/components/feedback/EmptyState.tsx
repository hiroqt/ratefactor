"use client";

import React from "react";
import Link from "next/link";
import { FolderSearch } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  secondaryAction?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30",
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-400 mb-4 shadow-sm">
        {icon || <FolderSearch className="w-6 h-6" />}
      </div>

      <h3 className="text-base sm:text-lg font-semibold text-zinc-100 mb-1.5">
        {title}
      </h3>

      {description && (
        <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {action && (
            action.href ? (
              <Link href={action.href}>
                <Button variant="primary" size="sm">
                  {action.label}
                </Button>
              </Link>
            ) : (
              <Button variant="primary" size="sm" onClick={action.onClick}>
                {action.label}
              </Button>
            )
          )}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
