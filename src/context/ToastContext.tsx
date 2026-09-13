"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Toast, ToastType } from "@/components/ui/Toast";

export interface ToastOptions {
  message: string;
  title?: string;
  type?: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastItem {
  id: string;
  message: string;
  title?: string;
  type: ToastType;
  duration: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  showToast: (
    optionsOrMessage: string | ToastOptions,
    type?: ToastType,
    duration?: number
  ) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      optionsOrMessage: string | ToastOptions,
      type: ToastType = "info",
      duration: number = 4000
    ) => {
      const id = "toast-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);

      let item: ToastItem;
      if (typeof optionsOrMessage === "string") {
        item = {
          id,
          message: optionsOrMessage,
          type,
          duration,
        };
      } else {
        item = {
          id,
          message: optionsOrMessage.message,
          title: optionsOrMessage.title,
          type: optionsOrMessage.type || type,
          duration: optionsOrMessage.duration !== undefined ? optionsOrMessage.duration : duration,
          action: optionsOrMessage.action,
        };
      }

      setToasts((prev) => {
        // Limit maximum concurrent visible toasts to 4 to prevent screen clutter
        const next = [...prev, item];
        if (next.length > 4) {
          return next.slice(next.length - 4);
        }
        return next;
      });
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div
        className="fixed top-5 right-5 sm:top-6 sm:right-6 z-[999999] flex flex-col gap-2.5 max-w-[420px] w-[calc(100%-2.5rem)] pointer-events-none"
        aria-live="polite"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <Toast
              key={t.id}
              id={t.id}
              type={t.type}
              title={t.title}
              message={t.message}
              duration={t.duration}
              action={t.action}
              onClose={() => dismissToast(t.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToastContext must be used within a ToastProvider");
  }
  return context;
}
