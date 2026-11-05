import { MOCK_USER_ID_HEADER, MOCK_USER_ID_QUERY } from "@shared/constants/headers";
import { REALTIME_PROTOCOL } from "@shared/constants/realtime";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import type { Database } from "../db/client";
import type { User } from "../db/schema";
import { isRegistered } from "../lib/access";
import { ApiError } from "../lib/errors";
import { type LineUser, verifyLineIdToken } from "../lib/line/id-token";
import { createUserRepository } from "../repositories/user-repository";

// 模拟用户的默认 userId（前端可通过 MOCK_USER_ID_HEADER 请求头切换）
const DEFAULT_MOCK_USER_ID = "U_mock_user";

// 只有在非生产环境且 AUTH_MOCK=true 时才允许使用模拟用户
function isMockAuthEnabled(env: Env): boolean {
  return env.AUTH_MOCK === "true" && env.APP_ENV !== "production";
}

/**
 * 取得请求中的 LINE ID token：一般在 Authorization: Bearer <token> 中。
 * WebSocket 连接（实时通知）不能设置请求头，放在 Sec-WebSocket-Protocol 中：「<子协议名>, <token>」。
 */
function readIdToken(c: Context): string | undefined {
  const bearer = c.req.header("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer || c.req.header("Upgrade")?.toLowerCase() !== "websocket") return bearer;
  return c.req
    .header("Sec-WebSocket-Protocol")
    ?.split(",")
    .map((value) => value.trim())
    .find((value) => value !== "" && value !== REALTIME_PROTOCOL);
}

/**
 * 需要登录的接口使用此中间件。
 * 校验 LINE ID token（见 readIdToken），通过后可用 c.get("lineUser") 取得 LINE 用户信息。
 */
export const requireAuth = createMiddleware<{
  Bindings: Env;
  Variables: { lineUser: LineUser };
}>(async (c, next) => {
  const token = readIdToken(c);
  if (!token) {
    throw new ApiError(401, "UNAUTHORIZED", "缺少 Authorization 请求头");
  }

  if (isMockAuthEnabled(c.env)) {
    const userId =
      c.req.header(MOCK_USER_ID_HEADER) || c.req.query(MOCK_USER_ID_QUERY) || DEFAULT_MOCK_USER_ID;
    c.set("lineUser", { userId, displayName: `模拟用户（${userId}）`, pictureUrl: null });
  } else {
    c.set("lineUser", await verifyLineIdToken(token, c.env.LINE_CHANNEL_ID));
  }

  await next();
});

/**
 * 在 requireAuth 之后使用：按 LINE userId 取得本系统的用户，之后可用 c.get("currentUser") 取得。
 * 用户记录由 GET /api/me 创建（前端启动时一定先调用），找不到时视为未完成首次设置。
 */
export const loadCurrentUser = createMiddleware<{
  Bindings: Env;
  Variables: { db: Database; lineUser: LineUser; currentUser: User };
}>(async (c, next) => {
  const user = await createUserRepository(c.get("db")).findByLineUserId(c.get("lineUser").userId);
  if (!user) {
    throw new ApiError(403, "NOT_REGISTERED", "用户不存在，请先调用 GET /api/me");
  }
  c.set("currentUser", user);
  await next();
});

/**
 * 在 loadCurrentUser 之后使用：要求已完成首次设置（身份和名字都已填写）。
 * 除了首次设置和查看邀请，其他接口都需要。
 * 用法：.use(requireAuth, loadCurrentUser, requireRegistered)
 */
export const requireRegistered = createMiddleware<{
  Variables: { currentUser: User };
}>(async (c, next) => {
  if (!isRegistered(c.get("currentUser"))) {
    throw new ApiError(403, "NOT_REGISTERED", "未完成首次设置");
  }
  await next();
});
