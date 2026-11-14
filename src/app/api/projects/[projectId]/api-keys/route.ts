import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { generateApiKey } from "@/lib/server/infrastructure/auth/api-key";

interface RouteParams {
  params: Promise<{
    projectId: string;
  }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const apiKeys = await prisma.apiKey.findMany({
    where: { projectId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ apiKeys });
}

export async function POST(request: Request, { params }: RouteParams) {
  const { projectId } = await params;

  let body: { name?: string; expiresInDays?: number };
  try {
    body = (await request.json()) as { name?: string; expiresInDays?: number };
  } catch {
    return Response.json(
      { error: "Invalid JSON", message: "Please submit a JSON body with a name." },
      { status: 400 }
    );
  }

  const name = body.name?.trim();
  if (!name || name.length < 2) {
    return Response.json(
      {
        error: "Validation error",
        message: "API key name must be at least 2 characters.",
      },
      { status: 400 }
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  let expiresAt: Date | null = null;
  if (body.expiresInDays && body.expiresInDays > 0) {
    expiresAt = new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000);
  }

  const generated = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      projectId,
      name,
      keyHash: generated.keyHash,
      keyPrefix: generated.keyPrefix,
      expiresAt,
    },
  });

  return Response.json(
    {
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
      rawKey: generated.rawKey,
    },
    { status: 201 }
  );
}
