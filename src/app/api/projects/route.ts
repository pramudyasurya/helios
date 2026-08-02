import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { CreateProjectSchema } from "@/lib/shared/domain/validators";
import { getErrorMessage } from "@/lib/shared/domain/errors";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { name: "asc" },
      include: {
        environments: {
          orderBy: { name: "asc" },
        },
      },
    });
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = CreateProjectSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name } = result.data;
    let baseSlug = slugify(name);
    if (!baseSlug) baseSlug = "project";

    let slug = baseSlug;
    let count = 1;

    while (await prisma.project.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${count}`;
      count++;
    }

    const project = await prisma.project.create({
      data: {
        name,
        slug,
      },
      include: {
        environments: true,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
