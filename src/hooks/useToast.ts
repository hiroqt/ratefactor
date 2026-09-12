"use client";

import { useToastContext } from "@/context/ToastContext";

export function useToast() {
  const { showToast, dismissToast } = useToastContext();
  return {
    showToast,
    dismissToast,
    toast: {
      info: (msg: string, duration?: number) => showToast(msg, "info", duration),
      success: (msg: string, duration?: number) => showToast(msg, "success", duration),
      warning: (msg: string, duration?: number) => showToast(msg, "warning", duration),
      error: (msg: string, duration?: number) => showToast(msg, "error", duration),
    },
  };
}
