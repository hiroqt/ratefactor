"use client";

import React from "react";
import { ToastProvider } from "./ToastContext";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";

export interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SmoothScrollProvider>
      <ToastProvider>{children}</ToastProvider>
    </SmoothScrollProvider>
  );
}
