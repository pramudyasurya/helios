import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/infrastructure/db/prisma";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    // Verify database connectivity
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        timestamp,
        database: "connected",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        timestamp,
        database: "disconnected",
        error: error instanceof Error ? error.message : "Database connection failed",
      },
      { status: 503 }
    );
  }
}
