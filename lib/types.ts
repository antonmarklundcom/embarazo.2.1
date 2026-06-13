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

export interface DirectoryListing {
  id: string;
  name: string;
  category: "sanatorio" | "obstetra" | "ecografia" | "cordon";
  department: DepartmentSlug;
  city: string;
  address?: string;
  whatsappNumber: string;
  mapsUrl?: string;
  isSponsored: boolean;
  priority: number;
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
