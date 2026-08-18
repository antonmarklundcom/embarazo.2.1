import { describe, expect, it } from "vitest";

import {
  combineDateTime,
  companionReminderSentence,
  daysUntil,
  formatAppointment,
  hasTimeOfDay,
  isAccompanying,
  ownReminderSentence,
  toDateInput,
  toTimeInput,
} from "./appointments";

// BUILD-PLAN K8. Everything here is computed in LOCAL time, which is the whole
// reason this module exists rather than a few inline `toISOString()` calls.

const at = (
  y: number,
  m: number,
  d: number,
  h = 0,
  min = 0,
): number => new Date(y, m - 1, d, h, min).getTime();

describe("date-only is local midnight", () => {
  it("reports a midnight appointment as having no time", () => {
    expect(hasTimeOfDay(at(2026, 8, 21))).toBe(false);
  });

  it("reports any other minute as having one", () => {
    expect(hasTimeOfDay(at(2026, 8, 21, 9, 0))).toBe(true);
    expect(hasTimeOfDay(at(2026, 8, 21, 0, 30))).toBe(true);
    expect(hasTimeOfDay(at(2026, 8, 21, 23, 59))).toBe(true);
  });
});

describe("the inputs round-trip in local time", () => {
  it("keeps the local calendar day for a late appointment", () => {
    // The bug this module exists to avoid: 21:00 in Asunción (UTC-3) is the
    // NEXT day in UTC, so `toISOString().slice(0, 10)` would report the 22nd.
    const evening = at(2026, 8, 21, 21, 0);
    expect(toDateInput(evening)).toBe("2026-08-21");
    expect(toTimeInput(evening)).toBe("21:00");
  });

  it("round-trips through combineDateTime", () => {
    for (const ts of [
      at(2026, 8, 21),
      at(2026, 8, 21, 9, 0),
      at(2026, 1, 1, 23, 45),
      at(2026, 12, 31, 0, 5),
    ]) {
      expect(combineDateTime(toDateInput(ts), toTimeInput(ts))).toBe(ts);
    }
  });

  it("reports no time for a date-only appointment", () => {
    expect(toTimeInput(at(2026, 8, 21))).toBe("");
    expect(toDateInput(undefined)).toBe("");
    expect(toTimeInput(null)).toBe("");
  });
});

describe("combineDateTime", () => {
  it("treats a missing date as no appointment, whatever the time says", () => {
    // A time with no date is not an appointment.
    expect(combineDateTime("", "09:00")).toBeUndefined();
    expect(combineDateTime("", "")).toBeUndefined();
  });

  it("falls back to midnight, which then reads as date-only", () => {
    const ts = combineDateTime("2026-08-21", "")!;
    expect(hasTimeOfDay(ts)).toBe(false);
    expect(toDateInput(ts)).toBe("2026-08-21");
  });

  it("refuses a malformed date rather than inventing one", () => {
    expect(combineDateTime("no-es-fecha", "09:00")).toBeUndefined();
    expect(combineDateTime("2026-08", "")).toBeUndefined();
  });

  it("ignores a malformed time instead of losing the date", () => {
    const ts = combineDateTime("2026-08-21", "nueve")!;
    expect(toDateInput(ts)).toBe("2026-08-21");
    expect(hasTimeOfDay(ts)).toBe(false);
  });
});

describe("daysUntil counts calendar days, not hours", () => {
  it("calls 08:00 tomorrow 'mañana' even though it is 20 hours away", () => {
    expect(daysUntil(at(2026, 8, 22, 8, 0), at(2026, 8, 21, 12, 0))).toBe(1);
  });

  it("calls 23:00 tonight 'hoy' even though it is 21 hours away", () => {
    expect(daysUntil(at(2026, 8, 21, 23, 0), at(2026, 8, 21, 2, 0))).toBe(0);
  });

  it("goes negative once it has passed", () => {
    expect(daysUntil(at(2026, 8, 20), at(2026, 8, 21, 12, 0))).toBe(-1);
  });
});

describe("formatAppointment", () => {
  it("adds the time only when there is one", () => {
    expect(formatAppointment(at(2026, 8, 21, 9, 0))).toMatch(/a las/);
    expect(formatAppointment(at(2026, 8, 21))).not.toMatch(/a las/);
  });
});

describe("the two reminder sentences", () => {
  const now = at(2026, 8, 21, 12, 0);

  it("addresses the mamá about her own control", () => {
    const sentence = ownReminderSentence(at(2026, 8, 22, 9, 0), now)!;
    expect(sentence.title).toBe("Mañana tenés control prenatal");
    expect(sentence.body).toContain("carné perinatal");
    expect(sentence.body).toContain("09:00");
  });

  it("invites the companion instead of announcing something", () => {
    // The plan's own line. It is an invitation to be there, not a notice that
    // an appointment exists.
    const sentence = companionReminderSentence(at(2026, 8, 22, 9, 0), now)!;
    expect(sentence.title).toBe("Acompañala al control");
    expect(sentence.body).toBe("Es mañana a las 09:00.");
  });

  it("says 'hoy' on the day", () => {
    expect(ownReminderSentence(at(2026, 8, 21, 16, 0), now)!.title).toBe(
      "Hoy tenés control prenatal",
    );
    expect(companionReminderSentence(at(2026, 8, 21, 16, 0), now)!.body).toBe(
      "Es hoy a las 16:00.",
    );
  });

  it("drops the time when the control is date-only", () => {
    expect(ownReminderSentence(at(2026, 8, 22), now)!.body).toBe(
      "Llevá tu carné perinatal.",
    );
    expect(companionReminderSentence(at(2026, 8, 22), now)!.body).toBe(
      "Es mañana.",
    );
  });

  it("returns null when the appointment cannot explain the poke", () => {
    // Moved, cleared, or already past between scheduling and firing. The
    // caller then shows something true and useless rather than something
    // specific and wrong — `userVisibleOnly: true` means it must show
    // something.
    for (const fn of [ownReminderSentence, companionReminderSentence]) {
      expect(fn(null, now)).toBeNull();
      expect(fn(at(2026, 8, 20), now)).toBeNull();
      expect(fn(at(2026, 9, 1), now)).toBeNull();
    }
  });
});

describe("isAccompanying", () => {
  const appointment = at(2026, 8, 22, 9, 0);

  it("is true only for the appointment that was actually agreed to", () => {
    expect(isAccompanying(appointment, appointment)).toBe(true);
  });

  it("goes false the moment the control moves", () => {
    // A boolean would have silently reassigned him to a date nobody agreed to;
    // she sees an empty list and asks again, which is the safe direction.
    expect(isAccompanying(appointment, at(2026, 8, 23, 9, 0))).toBe(false);
    expect(isAccompanying(appointment, at(2026, 8, 22, 10, 0))).toBe(false);
  });

  it("is false with nothing on either side", () => {
    expect(isAccompanying(null, appointment)).toBe(false);
    expect(isAccompanying(appointment, null)).toBe(false);
    expect(isAccompanying(undefined, undefined)).toBe(false);
    expect(isAccompanying(0, appointment)).toBe(false);
  });
});
