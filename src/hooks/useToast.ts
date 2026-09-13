"use client";

import { useToastContext, ToastOptions } from "@/context/ToastContext";
import { ToastType } from "@/components/ui/Toast";

export function useToast() {
  const { showToast, dismissToast } = useToastContext();
  return {
    showToast,
    dismissToast,
    toast: {
      info: (content: string | Omit<ToastOptions, "type">, duration?: number) => {
        if (typeof content === "string") {
          showToast(content, "info", duration);
        } else {
          showToast({ ...content, type: "info" }, "info", duration ?? content.duration);
        }
      },
      success: (content: string | Omit<ToastOptions, "type">, duration?: number) => {
        if (typeof content === "string") {
          showToast(content, "success", duration);
        } else {
          showToast({ ...content, type: "success" }, "success", duration ?? content.duration);
        }
      },
      warning: (content: string | Omit<ToastOptions, "type">, duration?: number) => {
        if (typeof content === "string") {
          showToast(content, "warning", duration);
        } else {
          showToast({ ...content, type: "warning" }, "warning", duration ?? content.duration);
        }
      },
      error: (content: string | Omit<ToastOptions, "type">, duration?: number) => {
        if (typeof content === "string") {
          showToast(content, "error", duration);
        } else {
          showToast({ ...content, type: "error" }, "error", duration ?? content.duration);
        }
      },
    },
  };
}

export type { ToastOptions, ToastType };

