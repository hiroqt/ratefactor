"use client";

import React from "react";
import { ToastProvider } from "./ToastContext";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { PostHogProvider } from "@/components/providers/PostHogProvider";

export interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <PostHogProvider>
      <SmoothScrollProvider>
        <ToastProvider>{children}</ToastProvider>
      </SmoothScrollProvider>
    </PostHogProvider>
  );
}
