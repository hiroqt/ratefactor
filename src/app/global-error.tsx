"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4 border border-rose-500/20">
          ⚠️
        </div>
        <h2 className="text-2xl font-bold mb-2">Something went wrong!</h2>
        <p className="text-slate-400 mb-6 max-w-md text-sm">
          A critical root error occurred. Sentry has captured this exception for diagnosis.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition text-sm"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
