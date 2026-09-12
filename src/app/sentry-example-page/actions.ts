"use server";

import * as Sentry from "@sentry/nextjs";

export async function triggerServerActionError() {
  return Sentry.withServerActionInstrumentation(
    "triggerServerActionError",
    {},
    async () => {
      throw new Error("Sentry Server Action Test Error — Triggered from /sentry-example-page");
    }
  );
}
