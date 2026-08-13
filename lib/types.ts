// Shared domain types (build spec §5).

export type Trimester = 1 | 2 | 3;
export type DepartmentSlug = string;

export interface Department {
  slug: DepartmentSlug;
  name: string;
}

export interface WeekInfo {
  week: number;
  trimester: Trimester;
  sizeComparison: string;
  lengthCm?: number;
  weightG?: number;
  milestone: string;
  tip: string;
}

// G1 content ops: Article / VideoItem / EventItem / DirectoryListing /
// AdPlacement (and DirectoryCategory) are now defined once, as zod schemas,
// in lib/content/schemas.ts — that's what validates the JSON seed files.
// They're re-exported here so every existing `from "@/lib/types"` import
// keeps working unchanged.
export type {
  Article,
  AdPlacement,
  DirectoryListing,
  EventItem,
  VideoItem,
  FoodEntry,
  FoodVerdict,
  FaqEntry,
  FaqTopic,
} from "./content/schemas";
import type { DirectoryCategorySchema } from "./content/schemas";
import type { z } from "zod";

// Broadened in v3 ("Cerca tuyo", build spec §6).
export type DirectoryCategory = z.infer<typeof DirectoryCategorySchema>;

export type EventType = "charla" | "taller" | "feria" | "clase" | "encuentro";
