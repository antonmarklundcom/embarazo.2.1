import { describe, it, expect } from "vitest";

import { CHEERS } from "@/lib/sharing/cheers";
import { weeklyLine } from "@/lib/seed/weeklyLines";
import { MAX_WEEK, MIN_WEEK } from "@/lib/pregnancy";
import { cheerSentence, weeklyTipSentence } from "./sentences";

// PR-5b. The service worker is the hardest place in the app to assert
// anything about, so everything it *says* lives here instead.

describe("weeklyTipSentence", () => {
  it("says the same thing the home screen says", () => {
    // C2's one-liner, not a second pool of push copy. Two editorial surfaces
    // for the same week drift, and she taps the notification expecting the
    // sentence she was just shown.
    for (let week = MIN_WEEK; week <= MAX_WEEK; week += 1) {
      const line = weeklyLine(week);
      const sentence = weeklyTipSentence(week);
      if (line === null) {
        expect(sentence, `week ${week}`).toBeNull();
      } else {
        expect(sentence, `week ${week}`).toEqual({
          title: `Semana ${week}`,
          body: line,
        });
      }
    }
  });

  it("has nothing to say without a week", () => {
    // A companion's device can hold a `consejos` opt-in and no pregnancy row.
    // The caller falls back; "Semana null" is the failure this prevents.
    expect(weeklyTipSentence(null)).toBeNull();
  });
});

describe("cheerSentence", () => {
  it("renders the cheer's own words from the id", () => {
    for (const cheer of CHEERS) {
      const sentence = cheerSentence(cheer.id);
      expect(sentence.body).toContain(cheer.text);
      expect(sentence.body).toContain(cheer.emoji);
    }
  });

  it("never says who sent it", () => {
    // A lock screen is the one part of a phone other people read over your
    // shoulder. "Tu pareja te mandó un mimo" on a shared or borrowed phone
    // says more about her than she chose to say; the app shows who, behind
    // the lock.
    for (const cheer of CHEERS) {
      const { title, body } = cheerSentence(cheer.id);
      expect(`${title} ${body}`).not.toMatch(
        /tu pareja|tu mam|tu herman|tu familiar|de parte de/i,
      );
    }
  });

  it("degrades to a generic line for an id that no longer exists", () => {
    // Removing a phrase is handled at read time everywhere else in the app;
    // a poke is not the place it starts throwing.
    const sentence = cheerSentence("una-frase-retirada");
    expect(sentence.title).toBe("Te mandaron un mimo");
    expect(sentence.body).toBe("Alguien de tu familia te mandó ánimo.");
  });

  it("always has something to show, for every id in the list", () => {
    // `userVisibleOnly` means every poke must render something. An empty body
    // is a browser-generated "This site has been updated in the background".
    for (const cheer of [...CHEERS.map((c) => c.id), "", "??"]) {
      const sentence = cheerSentence(cheer);
      expect(sentence.title.length).toBeGreaterThan(0);
      expect(sentence.body.length).toBeGreaterThan(0);
    }
  });
});
