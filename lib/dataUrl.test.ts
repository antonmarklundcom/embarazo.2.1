import { describe, expect, it } from "vitest";

import {
  InlineImageError,
  base64ToBlob,
  dataUrlToBlob,
} from "./dataUrl";

const JPEG_HEAD = "/9j/4AAQSkZJRgABAQAAAQABAAD/2w==";

async function bytesOf(blob: Blob): Promise<number[]> {
  return [...new Uint8Array(await blob.arrayBuffer())];
}

describe("dataUrlToBlob — local decoding, no fetch (N1)", () => {
  it("decodes a jpeg data URL into the same bytes and type", async () => {
    const blob = dataUrlToBlob(`data:image/jpeg;base64,${JPEG_HEAD}`);
    expect(blob.type).toBe("image/jpeg");
    expect((await bytesOf(blob)).slice(0, 3)).toEqual([0xff, 0xd8, 0xff]);
  });

  it("round-trips arbitrary bytes", async () => {
    const original = Uint8Array.from({ length: 300 }, (_, i) => (i * 37) % 256);
    let binary = "";
    for (const b of original) binary += String.fromCharCode(b);
    const blob = dataUrlToBlob(`data:image/png;base64,${btoa(binary)}`);
    expect(await bytesOf(blob)).toEqual([...original]);
  });

  it("keeps a typeless blob typeless (readAsDataURL writes octet-stream)", () => {
    expect(dataUrlToBlob(`data:application/octet-stream;base64,${JPEG_HEAD}`).type).toBe("");
  });

  it("accepts MIME parameters before ;base64", () => {
    expect(dataUrlToBlob(`data:image/webp;name=a.webp;base64,${JPEG_HEAD}`).type).toBe("image/webp");
  });

  it.each([
    ["a remote URL", "https://example.test/photo.jpg"],
    ["a blob URL", "blob:https://app.example.test/1234"],
    ["a non-image type", `data:text/html;base64,${btoa("<script>")}`],
    ["a non-base64 data URL", "data:image/jpeg,raw-bytes"],
    ["malformed base64", "data:image/jpeg;base64,@@@@"],
    ["a non-string", 42],
  ])("rejects %s", (_label, value) => {
    expect(() => dataUrlToBlob(value)).toThrow(InlineImageError);
  });

  it("enforces the size bound before decoding", () => {
    const big = "A".repeat(4 * 1024);
    expect(() => dataUrlToBlob(`data:image/jpeg;base64,${big}`, { maxBytes: 1024 })).toThrow(
      /demasiado grande/,
    );
  });
});

describe("base64ToBlob", () => {
  it("decodes the AI render shape (bare base64 + mime)", async () => {
    const blob = base64ToBlob(JPEG_HEAD, "image/png");
    expect(blob.type).toBe("image/png");
    expect((await bytesOf(blob)).length).toBeGreaterThan(0);
  });
});
