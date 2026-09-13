import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";
const shouldEnableSentry = isProduction || process.env.NEXT_PUBLIC_ENABLE_DEV_SENTRY === "true";

if (shouldEnableSentry) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://examplePublicKey@o0.ingest.sentry.io/0",
    tracesSampleRate: isProduction ? 0.05 : 0,
    debug: false,
    replaysOnErrorSampleRate: isProduction ? 0.5 : 0,
    replaysSessionSampleRate: 0,
    integrations: isProduction
      ? [
          Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ]
      : [],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
