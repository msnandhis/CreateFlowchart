import type { IncomingMessage } from "node:http";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export interface JWTPayload {
  userId: string;
  email?: string;
  name?: string;
  iat?: number;
  exp?: number;
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function extractToken(req: IncomingMessage): string | null {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const token = url.searchParams.get("token");
  if (token) return token;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
}

export function authWebSocket(req: IncomingMessage): {
  authorized: boolean;
  userId?: string;
  name?: string;
  error?: string;
} {
  const token = extractToken(req);

  if (!token) {
    return { authorized: false, error: "No token provided" };
  }

  const payload = verifyJWT(token);
  if (!payload) {
    return { authorized: false, error: "Invalid token" };
  }

  return {
    authorized: true,
    userId: payload.userId,
    name: payload.name,
  };
}
