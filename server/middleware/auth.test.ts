import { env } from "cloudflare:test";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { authHeaders, createRegisteredUser, createUser, uniqueLineUserId } from "../test/factories";
import type { AppEnv } from "../types";
import { loadCurrentUser, requireAuth, requireRegistered } from "./auth";
import { dbMiddleware } from "./db";
import { errorHandler } from "./error-handler";

// 测试用的接口：需要已完成首次设置，返回当前用户的 id
const testApp = new Hono<AppEnv>()
  .use(dbMiddleware)
  .use(requireAuth, loadCurrentUser, requireRegistered)
  .get("/", (c) => c.json({ userId: c.get("currentUser").id }));
testApp.onError(errorHandler);

describe("loadCurrentUser / requireRegistered", () => {
  it("已完成首次设置的用户可以访问", async () => {
    const user = await createRegisteredUser("student");
    const res = await testApp.request("/", { headers: authHeaders(user) }, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: user.id });
  });

  it("未完成首次设置的用户返回 403 NOT_REGISTERED", async () => {
    const user = await createUser();
    const res = await testApp.request("/", { headers: authHeaders(user) }, env);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: { code: "NOT_REGISTERED" } });
  });

  it("只选了身份、没有名字时也视为未完成", async () => {
    const user = await createUser({ role: "teacher" });
    const res = await testApp.request("/", { headers: authHeaders(user) }, env);
    expect(res.status).toBe(403);
  });

  it("数据库中没有这个用户（还没调用过 GET /api/me）时返回 403 NOT_REGISTERED", async () => {
    const res = await testApp.request(
      "/",
      { headers: authHeaders({ lineUserId: uniqueLineUserId() }) },
      env,
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: { code: "NOT_REGISTERED" } });
  });
});
