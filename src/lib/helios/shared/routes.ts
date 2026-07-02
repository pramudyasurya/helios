export const HELIOS_ROUTES = {
  dashboard: "/",
  evidence: () => "/evidence",
  runDetail: (id: string) => `/runs/${id}`,
} as const;
