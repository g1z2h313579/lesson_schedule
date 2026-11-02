import { env } from "cloudflare:test";
import { LINE_ACCESS_TOKEN_HEADER, MOCK_USER_ID_HEADER } from "@shared/constants/headers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { app } from "../app";
import { createDb } from "../db/client";
import { authHeaders, createRegisteredUser, createUser } from "../test/factories";

type MeBody = {
  user: {
    lineDisplayName: string;
    pictureUrl: string | null;
    name: string | null;
    introduction: string | null;
    role: string | null;
    isAdmin: boolean;
    registered: boolean;
  };
};

// 以某个用户的身份发送 JSON 请求
function sendJson(
  method: "POST" | "PATCH",
  path: string,
  user: { lineUserId: string },
  body: unknown,
) {
  return app.request(
    path,
    {
      method,
      headers: { ...authHeaders(user), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    env,
  );
}

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
    // 新用户还没有完成首次设置；不返回 LINE userId 等用不到的字段
    const body = await first.json<MeBody>();
    expect(body.user).toMatchObject({ role: null, name: null, isAdmin: false, registered: false });
    expect(body.user).not.toHaveProperty("lineUserId");

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
      lineDisplayName: "山田",
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

    expect((await res.json<MeBody>()).user.lineDisplayName).toBe("模拟用户（U_mismatch）");
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
    expect((await res.json<MeBody>()).user.lineDisplayName).toBe("模拟用户（U_no_profile）");
  });
});

describe("POST /api/me/registration", () => {
  it("选择身份、填写名字后完成首次设置（名字去掉首尾空格，空白的自我介绍保存为 null）", async () => {
    const user = await createUser();
    const res = await sendJson("POST", "/api/me/registration", user, {
      role: "teacher",
      name: "  山田 花子  ",
      introduction: "   ",
    });

    expect(res.status).toBe(200);
    expect((await res.json<MeBody>()).user).toMatchObject({
      role: "teacher",
      name: "山田 花子",
      introduction: null,
      registered: true,
    });
  });

  it("不能通过请求体把自己设为管理员", async () => {
    const user = await createUser();
    const res = await sendJson("POST", "/api/me/registration", user, {
      role: "student",
      name: "王",
      isAdmin: true,
    });

    expect((await res.json<MeBody>()).user.isAdmin).toBe(false);
  });

  it("已完成首次设置时返回 409 ALREADY_REGISTERED，身份不会被改掉", async () => {
    const user = await createRegisteredUser("student");
    const res = await sendJson("POST", "/api/me/registration", user, {
      role: "teacher",
      name: "改名",
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: { code: "ALREADY_REGISTERED" } });
    const row = await createDb(env.DB).query.users.findFirst({
      where: (users, { eq }) => eq(users.id, user.id),
    });
    expect(row).toMatchObject({ role: "student", name: "测试学生" });
  });

  it.each([
    ["名字为空", { role: "student", name: "   " }],
    ["名字超过 50 字", { role: "student", name: "あ".repeat(51) }],
    ["自我介绍超过 1000 字", { role: "student", name: "王", introduction: "あ".repeat(1001) }],
    ["身份不正确", { role: "admin", name: "王" }],
  ])("%s时返回 400", async (_, body) => {
    const user = await createUser();
    const res = await sendJson("POST", "/api/me/registration", user, body);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });
});

describe("PATCH /api/me", () => {
  it("修改名字和自我介绍（身份不变）", async () => {
    const user = await createRegisteredUser("teacher");
    const res = await sendJson("PATCH", "/api/me", user, {
      name: "新名字",
      introduction: "よろしくお願いします。",
      role: "student",
    });

    expect(res.status).toBe(200);
    expect((await res.json<MeBody>()).user).toMatchObject({
      name: "新名字",
      introduction: "よろしくお願いします。",
      role: "teacher",
    });
  });

  it("自我介绍清空后保存为 null", async () => {
    const user = await createRegisteredUser("student", { introduction: "旧的介绍" });
    const res = await sendJson("PATCH", "/api/me", user, { name: "王", introduction: "" });
    expect((await res.json<MeBody>()).user.introduction).toBeNull();
  });

  it("未完成首次设置时返回 403 NOT_REGISTERED", async () => {
    const user = await createUser();
    const res = await sendJson("PATCH", "/api/me", user, { name: "王", introduction: "" });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: { code: "NOT_REGISTERED" } });
  });
});
