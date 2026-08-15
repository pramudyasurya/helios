export const HELIOS_ROUTES = {
  dashboard: "/",
  evidence: () => "/evidence",
  projects: () => "/projects",
  runDetail: (id: string) => `/runs/${id}`,
  compare: (a: string, b: string) => `/runs/compare?a=${a}&b=${b}`,
} as const;
