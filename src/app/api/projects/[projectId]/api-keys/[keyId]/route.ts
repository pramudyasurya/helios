import { prisma } from "@/lib/server/infrastructure/db/prisma";

interface RouteParams {
  params: Promise<{
    projectId: string;
    keyId: string;
  }>;
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { projectId, keyId } = await params;

  const keyRecord = await prisma.apiKey.findFirst({
    where: {
      id: keyId,
      projectId,
    },
  });

  if (!keyRecord) {
    return Response.json(
      { error: "Not found", message: "API key not found for this project." },
      { status: 404 }
    );
  }

  await prisma.apiKey.delete({
    where: { id: keyId },
  });

  return Response.json({ success: true, message: "API key revoked successfully." });
}
