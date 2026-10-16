import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/realistic-image-slots.json", () => ({
  default: {
    "/assets/ejercicios/caminar-1.webp": "caminar-realista",
    "/assets/bebe/bebe-0-2-meses.webp": "not-placed-yet",
  },
}));
vi.mock("@/public/assets/img/manifest.json", () => ({
  default: {
    images: [{
      filename_base: "caminar-realista",
      alt_text: "Una mujer caminando.",
      files: [
        { file: "caminar-960.webp", format: "webp", width: 960, height: 720 },
        { file: "caminar-480.webp", format: "webp", width: 480, height: 360 },
        { file: "caminar-480.avif", format: "avif", width: 480, height: 360 },
      ],
    }],
  },
}));

import { realisticImage } from "./realisticImages";

describe("canonical realistic image aliases", () => {
  it("selects local responsive derivatives while accepting the original path", () => {
    expect(realisticImage("/assets/ejercicios/caminar-1.webp")).toMatchObject({
      src: "/assets/img/caminar-480.webp",
      srcSet: "/assets/img/caminar-480.webp 480w, /assets/img/caminar-960.webp 960w",
      avifSrcSet: "/assets/img/caminar-480.avif 480w",
      alt: "Una mujer caminando.",
    });
  });

  it("keeps unmapped and not-yet-placed assets on their original renderer", () => {
    expect(realisticImage("/assets/comparaciones/mango.webp")).toBeNull();
    expect(realisticImage("/assets/bebe/bebe-0-2-meses.webp")).toBeNull();
  });

  it("allows a revision query without changing the canonical alias", () => {
    expect(realisticImage("/assets/ejercicios/caminar-1.webp?v=revision")).toEqual(
      realisticImage("/assets/ejercicios/caminar-1.webp"),
    );
  });
});