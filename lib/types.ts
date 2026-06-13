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

export interface AdPlacement {
  id: string;
  sponsorName: string;
  type: "sanatorio" | "ecografia" | "cordon" | "nutricion";
  // trimester 0 = applies to all trimesters.
  trimester: 0 | 1 | 2 | 3;
  headline: string;
  body: string;
  offerTag?: string;
  whatsappNumber: string;
  ctaLabel: string;
  priority: number;
}

// Broadened in v3 ("Cerca tuyo", build spec §6).
export type DirectoryCategory =
  | "sanatorio"
  | "obstetra"
  | "ecografia"
  | "cordon"
  | "pediatra"
  | "lactancia"
  | "vacunatorio"
  | "tienda_bebe"
  | "farmacia";

export interface DirectoryListing {
  id: string;
  name: string;
  category: DirectoryCategory;
  department: DepartmentSlug;
  city: string;
  address?: string;
  whatsappNumber: string;
  mapsUrl?: string;
  isSponsored: boolean;
  priority: number;
}

// Curated events (build spec §7). Seed-only — never user-generated.
export type EventType = "charla" | "taller" | "feria" | "clase" | "encuentro";

export interface EventItem {
  id: string;
  title: string;
  type: EventType;
  department: DepartmentSlug;
  city: string;
  venue?: string;
  date: number;
  description: string;
  organizer: string;
  whatsappNumber?: string;
  mapsUrl?: string;
  isSponsored: boolean;
}

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  html: string;
  date: string;
  author: string;
  reviewedBy?: string;
  cluster?: string;
}
