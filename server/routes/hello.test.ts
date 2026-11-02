import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { app } from "../app";

describe("GET /api/hello", () => {
  it("不传 name 时返回默认问候", async () => {
    const res = await app.request("/api/hello", {}, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: "Hello, World!" });
  });

  it("传入 name 时返回对应问候", async () => {
    const res = await app.request("/api/hello?name=Tanaka", {}, env);
    expect(await res.json()).toEqual({ message: "Hello, Tanaka!" });
  });

  it("参数不合法时返回 400 和统一的错误格式", async () => {
    const res = await app.request(`/api/hello?name=${"a".repeat(51)}`, {}, env);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });
});
