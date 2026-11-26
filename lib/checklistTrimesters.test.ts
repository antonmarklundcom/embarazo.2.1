import { describe, expect, it } from "vitest";

import { trimesterToDos } from "./checklistTrimesters";
import { getTrimester } from "./pregnancy";
import { getWeek } from "./weeks";

describe("the checklist by trimester", () => {
  it("has at least five to-dos in each trimester", () => {
    for (const trimester of [1, 2, 3] as const) {
      expect(trimesterToDos(trimester).length, `trimestre ${trimester}`).toBeGreaterThanOrEqual(5);
    }
  });

  it("only quotes live week tips, each in its own trimester, linking to its week", () => {
    for (const trimester of [1, 2, 3] as const) {
      for (const item of trimesterToDos(trimester)) {
        expect(getTrimester(item.week)).toBe(trimester);
        expect(item.text).toBe(getWeek(item.week).tip);
        expect(item.href).toBe(`/semana/${item.week}`);
      }
    }
  });

  it("lists each week once, in order", () => {
    const weeks = [1, 2, 3].flatMap((t) => trimesterToDos(t as 1 | 2 | 3).map((i) => i.week));
    expect(new Set(weeks).size).toBe(weeks.length);
    expect([...weeks].sort((a, b) => a - b)).toEqual(weeks);
  });
});
