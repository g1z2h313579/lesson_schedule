import { env } from "cloudflare:test";
import { LINE_ACCESS_TOKEN_HEADER, MOCK_USER_ID_HEADER } from "@shared/constants/headers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { app } from "../app";
import { createDb } from "../db/client";

type MeBody = { user: { lineUserId: string; displayName: string; pictureUrl: string | null } };

// 模拟 LINE 个人资料接口的返回
function mockLineProfile(response: Response) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
}

describe("GET /api/me", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("没有 Authorization 请求头时返回 401", async () => {
    const res = await app.request("/api/me", {}, env);
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: { code: "UNAUTHORIZED" } });
  });

  it("登录后把 LINE 用户同步到数据库（重复访问不会重复创建）", async () => {
    const headers = { Authorization: "Bearer mock-token", [MOCK_USER_ID_HEADER]: "U_test_student" };

    const first = await app.request("/api/me", { headers }, env);
    expect(first.status).toBe(200);
    const body = await first.json<{ user: { lineUserId: string; role: string } }>();
    expect(body.user).toMatchObject({ lineUserId: "U_test_student", role: "student" });

    await app.request("/api/me", { headers }, env);
    const rows = await createDb(env.DB).query.users.findMany();
    expect(rows.filter((u) => u.lineUserId === "U_test_student")).toHaveLength(1);
  });

  it("附带 access token 时用 LINE 个人资料更新昵称和头像", async () => {
    const fetchSpy = mockLineProfile(
      Response.json({
        userId: "U_profile",
        displayName: "山田",
        pictureUrl: "https://example.com/a.png",
      }),
    );
    const res = await app.request(
      "/api/me",
      {
        headers: {
          Authorization: "Bearer mock-token",
          [MOCK_USER_ID_HEADER]: "U_profile",
          [LINE_ACCESS_TOKEN_HEADER]: "line-access-token",
        },
      },
      env,
    );

    expect(res.status).toBe(200);
    expect((await res.json<MeBody>()).user).toMatchObject({
      displayName: "山田",
      pictureUrl: "https://example.com/a.png",
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.line.me/v2/profile",
      expect.objectContaining({ headers: { Authorization: "Bearer line-access-token" } }),
    );
  });

  it("个人资料的 userId 与登录用户不一致时不采用", async () => {
    mockLineProfile(Response.json({ userId: "U_someone_else", displayName: "别人" }));
    const res = await app.request(
      "/api/me",
      {
        headers: {
          Authorization: "Bearer mock-token",
          [MOCK_USER_ID_HEADER]: "U_mismatch",
          [LINE_ACCESS_TOKEN_HEADER]: "other-access-token",
        },
      },
      env,
    );

    expect((await res.json<MeBody>()).user.displayName).toBe("模拟用户（U_mismatch）");
  });

  it("获取个人资料失败（未同意 profile 权限）时仍能正常登录", async () => {
    mockLineProfile(new Response(null, { status: 401 }));
    const res = await app.request(
      "/api/me",
      {
        headers: {
          Authorization: "Bearer mock-token",
          [MOCK_USER_ID_HEADER]: "U_no_profile",
          [LINE_ACCESS_TOKEN_HEADER]: "no-profile-token",
        },
      },
      env,
    );

    expect(res.status).toBe(200);
    expect((await res.json<MeBody>()).user.displayName).toBe("模拟用户（U_no_profile）");
  });
});
