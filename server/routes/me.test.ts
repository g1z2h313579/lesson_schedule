import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { app } from "../app";
import { createDb } from "../db/client";

describe("GET /api/me", () => {
  it("没有 Authorization 请求头时返回 401", async () => {
    const res = await app.request("/api/me", {}, env);
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: { code: "UNAUTHORIZED" } });
  });

  it("登录后把 LINE 用户同步到数据库（重复访问不会重复创建）", async () => {
    const headers = { Authorization: "Bearer mock-token", "X-Mock-User-Id": "U_test_student" };

    const first = await app.request("/api/me", { headers }, env);
    expect(first.status).toBe(200);
    const body = await first.json<{ user: { lineUserId: string; role: string } }>();
    expect(body.user).toMatchObject({ lineUserId: "U_test_student", role: "student" });

    await app.request("/api/me", { headers }, env);
    const rows = await createDb(env.DB).query.users.findMany();
    expect(rows.filter((u) => u.lineUserId === "U_test_student")).toHaveLength(1);
  });
});
