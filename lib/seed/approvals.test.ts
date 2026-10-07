import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { REVIEW_REGISTRY } from "./approvals";
import { approvedInsightTemplate, insightTemplate } from "./insights";
import { FOOD, PUBLISHED_FOOD } from "./food";
import {
  contentHash,
  insightClinicalText,
  insightContentId,
  type ApprovalRegistry,
} from "../content/approvals";

// F22 — the shipped registry, and the rule that nothing else grants review.

describe("the shipped review registry", () => {
  it("only approves content that a registered reviewer signed", () => {
    for (const approval of REVIEW_REGISTRY.approvals) {
      expect(
        REVIEW_REGISTRY.reviewers.some((reviewer) => reviewer.id === approval.reviewerId),
        approval.contentId,
      ).toBe(true);
    }
  });

  it("publishes no food entry without a current approval behind its reviewedBy", () => {
    const approvedIds = new Set(
      REVIEW_REGISTRY.approvals.map((approval) => approval.contentId),
    );
    for (const entry of PUBLISHED_FOOD) {
      expect(approvedIds.has(`food:${entry.id}`), entry.id).toBe(true);
    }
    expect(PUBLISHED_FOOD.length).toBeLessThanOrEqual(FOOD.length);
  });
});

describe("NEXT_PUBLIC_MEDICAL_REVIEWER grants nothing", () => {
  it("is not read by any app, component or lib code", () => {
    // Attribution comes from lib/seed/approvals.json only. A build-time name
    // that signs every screen at once is what F22 removed; this keeps a future
    // edit from quietly bringing it back.
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry) || /\.test\.tsx?$/.test(entry)) continue;
        const code = readFileSync(full, "utf8")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\/\/.*$/gm, "");
        if (code.includes("NEXT_PUBLIC_MEDICAL_REVIEWER")) offenders.push(full);
      }
    };
    for (const root of ["app", "components", "lib"]) walk(join(process.cwd(), root));
    expect(offenders).toEqual([]);
  });
});

describe("insight templates are approved one by one", () => {
  const ANA = { id: "ana-gimenez", name: "Dra. Ana Giménez", profession: "gineco-obstetra" };

  it("unlocks only the approved template, and only its exact text", () => {
    const sleep = insightTemplate("sleep")!;
    const registry: ApprovalRegistry = {
      reviewers: [ANA],
      approvals: [
        {
          contentId: insightContentId("sleep"),
          reviewerId: ANA.id,
          reviewedAt: "2026-10-07",
          contentHash: contentHash(insightClinicalText(sleep)),
        },
      ],
    };
    expect(approvedInsightTemplate("sleep", registry)?.review.reviewerName).toBe(ANA.name);
    expect(approvedInsightTemplate("mood", registry)).toBeNull();
    expect(approvedInsightTemplate("frequent", registry)).toBeNull();

    const edited: ApprovalRegistry = {
      ...registry,
      approvals: [{ ...registry.approvals[0]!, contentHash: contentHash(`${sleep.line} x`) }],
    };
    expect(approvedInsightTemplate("sleep", edited)).toBeNull();
  });
});
