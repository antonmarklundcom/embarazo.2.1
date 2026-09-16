// W4: the foot of "Hoy" — the medical-review byline, the department the
// profile is set to, and the privacy line — moved verbatim out of
// `app/(app)/page.tsx`. Returns a fragment, so the two blocks stay direct
// children of the page's `space-y-4` stack and keep their spacing.

import { departmentName } from "@/lib/departments";

import { PrivacyLine } from "@/components/PrivacyLine";

import { MedicalReviewByline } from "./dynamicSections";

export function HomeFooter({ department }: { department: string }) {
  return (
    <>
      <div className="flex items-center justify-between pt-2">
        <MedicalReviewByline />
        <span className="text-xs text-muted">{departmentName(department)}</span>
      </div>
      <PrivacyLine />
    </>
  );
}
