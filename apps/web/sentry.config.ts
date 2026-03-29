import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  tracesSampler: (samplingContext) => {
    if (samplingContext.request?.url?.includes("/api/ai/")) {
      return 0.1;
    }
    return 0.05;
  },

  replaysOnErrorSampleRate: 1.0,

  beforeSend(event) {
    if (process.env.NODE_ENV === "development") {
      return null;
    }
    return event;
  },
});
