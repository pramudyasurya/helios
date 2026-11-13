import { NextRequest } from "next/server";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { runEventBus, type RunStreamEvent } from "@/lib/server/infrastructure/events/run-event-bus";
import { sanitizeTrailSteps } from "@/lib/server/infrastructure/runner/trail";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: runId } = await params;

  let run = null;
  try {
    run = await prisma.run.findUnique({
      where: { id: runId },
      select: {
        id: true,
        status: true,
        summary: true,
        trail: true,
        _count: {
          select: {
            evidence: true,
          },
        },
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to retrieve run details" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!run) {
    return new Response(JSON.stringify({ error: "Run not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawTrail = Array.isArray(run.trail)
    ? (run.trail as unknown[])
    : typeof run.trail === "string"
      ? (() => {
          try {
            return JSON.parse(run.trail);
          } catch {
            return [];
          }
        })()
      : [];
  const initialTrail = sanitizeTrailSteps(rawTrail);
  const isTerminal = run.status === "Completed" || run.status === "Failed";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      function send(event: { type: string; [key: string]: unknown }) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      function sendComment(comment: string) {
        controller.enqueue(encoder.encode(`: ${comment}\n\n`));
      }

      // Initial snapshot
      send({
        type: "init",
        status: run.status,
        summary: run.summary,
        trail: initialTrail,
        evidenceCount: run._count.evidence,
      });

      if (isTerminal) {
        controller.close();
        return;
      }

      const unsubscribe = runEventBus.subscribeToRun(
        runId,
        (event: RunStreamEvent) => {
          try {
            send(event);
            if (
              event.type === "status" &&
              (event.status === "Completed" || event.status === "Failed")
            ) {
              unsubscribe();
              clearInterval(heartbeatTimer);
              controller.close();
            }
          } catch {
            unsubscribe();
            clearInterval(heartbeatTimer);
          }
        },
      );

      const heartbeatTimer = setInterval(() => {
        try {
          sendComment("keepalive");
        } catch {
          unsubscribe();
          clearInterval(heartbeatTimer);
        }
      }, 15000);

      request.signal.addEventListener("abort", () => {
        unsubscribe();
        clearInterval(heartbeatTimer);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
