import type { DirectoryCategory } from "./types";

// es-PY labels for the "Cerca tuyo" category filter (build spec §6).
// `label` is the chip text; `plural` titles each grouped section.
export const DIRECTORY_CATEGORIES: {
  key: DirectoryCategory;
  label: string;
  plural: string;
}[] = [
  { key: "sanatorio", label: "Sanatorios", plural: "Sanatorios" },
  { key: "obstetra", label: "Obstetras", plural: "Obstetras" },
  { key: "ecografia", label: "Ecografías", plural: "Ecografías" },
  { key: "cordon", label: "Cordón", plural: "Bancos de cordón" },
  { key: "pediatra", label: "Pediatras", plural: "Pediatras" },
  { key: "lactancia", label: "Lactancia", plural: "Apoyo a la lactancia" },
  { key: "vacunatorio", label: "Vacunatorios", plural: "Vacunatorios" },
  { key: "tienda_bebe", label: "Tiendas", plural: "Tiendas para bebé" },
  { key: "farmacia", label: "Farmacias", plural: "Farmacias" },
];

export function directoryCategoryLabel(key: DirectoryCategory): string {
  return DIRECTORY_CATEGORIES.find((c) => c.key === key)?.plural ?? key;
}
