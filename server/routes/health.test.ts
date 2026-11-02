import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { app } from "../app";

describe("GET /api/health", () => {
  it("Worker 与数据库正常时返回 ok", async () => {
    const res = await app.request("/api/health", {}, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok" });
  });

  it("不存在的接口返回 404", async () => {
    const res = await app.request("/api/not-exists", {}, env);
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
  });
});
