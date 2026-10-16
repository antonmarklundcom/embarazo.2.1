import { describe, expect, it } from "vitest";
import { installDevice } from "./installDevice";

describe("installation device", () => {
  it("recognizes iPhone browsers, iPad desktop mode and Android", () => {
    expect(installDevice("iPhone CriOS Safari")).toBe("iphone");
    expect(installDevice("Macintosh Safari", 5)).toBe("iphone");
    expect(installDevice("Android Chrome", 5)).toBe("android");
  });
  it("keeps desktop and unknown visitors on the manual selector", () => {
    expect(installDevice("Macintosh Safari")).toBe("desktop");
    expect(installDevice("Windows Chrome")).toBe("desktop");
    expect(installDevice("")).toBe("desktop");
  });
});
