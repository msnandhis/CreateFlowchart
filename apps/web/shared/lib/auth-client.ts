"use client";

import { useMemo } from "react";
import type { Session } from "./auth";

const DEV_SESSION: Session = {
  user: {
    id: "dev-user",
    email: "dev@createflowchart.local",
    name: "Dev User",
    image: null,
  },
  session: {
    id: "dev-session",
    expiresAt: "2099-12-31T23:59:59.000Z",
  },
};

export function useSession() {
  return useMemo(
    () => ({
      data: DEV_SESSION,
      isPending: false,
      error: null,
    }),
    [],
  );
}

async function resolveAuthAction() {
  return { data: DEV_SESSION, error: null };
}

export const signIn = {
  async email(_input: { email: string; password: string }) {
    return resolveAuthAction();
  },
  async social(_input: { provider: "github" | "google"; callbackURL?: string }) {
    return resolveAuthAction();
  },
};

export const signUp = {
  async email(_input: { name: string; email: string; password: string }) {
    return resolveAuthAction();
  },
};

export async function signOut() {
  return { data: true, error: null };
}
