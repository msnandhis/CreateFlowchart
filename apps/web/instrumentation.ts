import * as Sentry from "@sentry/nextjs";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampler: (samplingContext) => {
        if (samplingContext.request?.url?.includes("/api/ai/")) {
          return 0.1;
        }
        return 0.05;
      },
    });
  }
}
