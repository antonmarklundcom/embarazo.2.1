import type { Department } from "./types";

// The 17 departments of Paraguay + Asunción (Capital). Build spec §5.
export const DEPARTMENTS: Department[] = [
  { slug: "capital", name: "Asunción (Capital)" },
  { slug: "concepcion", name: "Concepción" },
  { slug: "san-pedro", name: "San Pedro" },
  { slug: "cordillera", name: "Cordillera" },
  { slug: "guaira", name: "Guairá" },
  { slug: "caaguazu", name: "Caaguazú" },
  { slug: "caazapa", name: "Caazapá" },
  { slug: "itapua", name: "Itapúa" },
  { slug: "misiones", name: "Misiones" },
  { slug: "paraguari", name: "Paraguarí" },
  { slug: "alto-parana", name: "Alto Paraná" },
  { slug: "central", name: "Central" },
  { slug: "neembucu", name: "Ñeembucú" },
  { slug: "amambay", name: "Amambay" },
  { slug: "canindeyu", name: "Canindeyú" },
  { slug: "presidente-hayes", name: "Presidente Hayes" },
  { slug: "boqueron", name: "Boquerón" },
  { slug: "alto-paraguay", name: "Alto Paraguay" },
];

const SLUGS = new Set(DEPARTMENTS.map((d) => d.slug));

export function isValidDepartment(slug: string): boolean {
  return SLUGS.has(slug);
}

export function departmentName(slug: string): string {
  return DEPARTMENTS.find((d) => d.slug === slug)?.name ?? slug;
}
