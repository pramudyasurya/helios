import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/infrastructure/db/prisma";
import { CreateProjectSchema } from "@/lib/shared/domain/validators";
import { getErrorMessage, uniqueConstraintResponse } from "@/lib/shared/domain/errors";

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
          select: { id: true, name: true, baseUrl: true },
        },
      },
    });

    if (projects.length === 0) {
      return NextResponse.json({ projects: [] });
    }

    const projectIds = projects.map((p) => p.id);
    const envIds = projects.flatMap((p) => p.environments.map((e) => e.id));

    // Single grouped query across all projects' environments — avoids N+1.
    const statusGroups = await prisma.run.groupBy({
      by: ["environmentId", "status"],
      where: { environmentId: { in: envIds } },
      _count: { _all: true },
    });

    const lastRuns = await prisma.run.findMany({
      where: { environmentId: { in: envIds } },
      orderBy: { createdAt: "desc" },
      // One latest run per environment via distinct + take.
      distinct: ["environmentId"],
      select: { environmentId: true, createdAt: true },
    });

    const lastRunByEnv = new Map(
      lastRuns
        .filter((r): r is { environmentId: string; createdAt: Date } => r.environmentId !== null)
        .map((r) => [r.environmentId, r.createdAt] as const),
    );

    // Aggregate counts per environment, then roll up per project.
    // group.environmentId is string | null (Run.environmentId is nullable),
    // but the where-clause already restricts to known envIds, so nulls are impossible here.
    const countsByEnv = new Map<string, { total: number; passed: number }>();
    for (const group of statusGroups) {
      if (group.environmentId === null) continue;
      const entry = countsByEnv.get(group.environmentId) ?? { total: 0, passed: 0 };
      entry.total += group._count._all;
      if (group.status === "Completed") entry.passed += group._count._all;
      countsByEnv.set(group.environmentId, entry);
    }

    const projectsWithStats = projects.map((project) => {
      let totalRuns = 0;
      let passedRuns = 0;
      let lastRunAt: Date | null = null;

      for (const env of project.environments) {
        const counts = countsByEnv.get(env.id);
        if (counts) {
          totalRuns += counts.total;
          passedRuns += counts.passed;
        }
        const envLastRun = lastRunByEnv.get(env.id);
        if (envLastRun && (!lastRunAt || envLastRun > lastRunAt)) {
          lastRunAt = envLastRun;
        }
      }

      const passRate =
        totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 1000) / 10 : 0;

      return {
        id: project.id,
        name: project.name,
        slug: project.slug,
        environments: project.environments,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        totalRuns,
        passRate,
        lastRunAt,
      };
    });

    return NextResponse.json({ projects: projectsWithStats });
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
    const uniqueConflict = uniqueConstraintResponse(
      error,
      "A project with this name already exists.",
      400,
    );
    if (uniqueConflict) return uniqueConflict;
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
