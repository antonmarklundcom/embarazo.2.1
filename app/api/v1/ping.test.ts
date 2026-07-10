import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./ping/route";

function post(body: unknown, ip = "test-ip"): NextRequest {
  return new NextRequest("http://localhost/api/v1/ping", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("/api/v1/ping (privacy boundary)", () => {
  it("accepts a whitelisted open event with 204 and no Set-Cookie", async () => {
    const res = await POST(
      post({ event: "open", mode: "embarazada", trimester: 2, department: "capital" }, "ip-ok"),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("Set-Cookie")).toBeNull();
  });

  it("rejects an unknown field with 400", async () => {
    const res = await POST(
      post({ event: "open", mode: "embarazada", email: "a@b.com" }, "ip-extra"),
    );
    expect(res.status).toBe(400);
  });

  it("rejects an invalid event with 400", async () => {
    const res = await POST(post({ event: "click", mode: "embarazada" }, "ip-evt"));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid department with 400", async () => {
    const res = await POST(
      post({ event: "open", mode: "planeando", department: "narnia" }, "ip-dep"),
    );
    expect(res.status).toBe(400);
  });

  it("rejects a non-JSON body with 400", async () => {
    const req = new NextRequest("http://localhost/api/v1/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "ip-bad" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rate-limits a flood of pings from one IP", async () => {
    let sawLimit = false;
    for (let i = 0; i < 40; i++) {
      const res = await POST(post({ event: "open", mode: "embarazada" }, "ip-flood"));
      if (res.status === 429) sawLimit = true;
    }
    expect(sawLimit).toBe(true);
  });
});
