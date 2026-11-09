import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { runRecordToLatestRun } from "@/lib/server/infrastructure/runner/run-record";
import { generateStandaloneHtmlReport } from "@/lib/server/report/html-report-generator";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  try {
    const run = await prisma.run.findUnique({
      where: { id },
      include: {
        evidence: true,
        pageResults: true,
        environment: { include: { project: true } },
      },
    });

    if (!run) {
      return NextResponse.json(
        { error: "Run not found." },
        { status: 404 },
      );
    }

    const latestRun = runRecordToLatestRun(run);
    const htmlContent = await generateStandaloneHtmlReport(latestRun, {
      embedScreenshotsBase64: true,
    });

    return new Response(htmlContent, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="helios-audit-${id}.html"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
