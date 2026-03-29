import { auth } from "@/shared/lib/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = jwt.sign(
    {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
    JWT_SECRET,
    { expiresIn: "1h" },
  );

  return NextResponse.json({
    token,
    user: {
      id: session.user.id,
      name: session.user.name ?? session.user.email ?? "User",
      email: session.user.email,
    },
  });
}
