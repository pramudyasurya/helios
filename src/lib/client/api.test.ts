import { describe, expect, it } from "vitest";
import { parseJsonResponse } from "@/lib/client/api";

describe("parseJsonResponse", () => {
  it("parses valid 200 JSON responses correctly", async () => {
    const mockResponse = new Response(JSON.stringify({ success: true, count: 5 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

    const result = await parseJsonResponse<{ success: boolean; count: number }>(
      mockResponse,
    );
    expect(result).toEqual({ success: true, count: 5 });
  });

  it("handles 404 HTML response gracefully without SyntaxError", async () => {
    const htmlResponse = new Response("<!DOCTYPE html><html><body>404 Not Found</body></html>", {
      status: 404,
      statusText: "Not Found",
      headers: { "content-type": "text/html" },
    });

    await expect(parseJsonResponse(htmlResponse)).rejects.toEqual({
      error: "HTTP 404",
      message: "Request failed with status 404",
    });
  });

  it("preserves structured JSON error payload when status is 400 or 500", async () => {
    const errorJson = new Response(
      JSON.stringify({ error: "Invalid URL", message: "url is required" }),
      {
        status: 400,
        headers: { "content-type": "application/json" },
      },
    );

    await expect(parseJsonResponse(errorJson)).rejects.toEqual({
      error: "Invalid URL",
      message: "url is required",
    });
  });

  it("rejects empty response bodies cleanly", async () => {
    const emptyResponse = new Response("", {
      status: 200,
      headers: { "content-type": "application/json" },
    });

    await expect(parseJsonResponse(emptyResponse)).rejects.toEqual({
      error: "Invalid Response",
      message: "Server returned an empty response body",
    });
  });
});
