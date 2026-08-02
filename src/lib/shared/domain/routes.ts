export const HELIOS_ROUTES = {
  dashboard: "/",
  evidence: () => "/evidence",
  projects: () => "/projects",
  runDetail: (id: string) => `/runs/${id}`,
} as const;
