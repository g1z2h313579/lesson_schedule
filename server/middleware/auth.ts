import { MOCK_USER_ID_HEADER } from "@shared/constants/headers";
import { createMiddleware } from "hono/factory";
import { ApiError } from "../lib/errors";
import { type LineUser, verifyLineIdToken } from "../lib/line/id-token";

// 模拟用户的默认 userId（前端可通过 MOCK_USER_ID_HEADER 请求头切换）
const DEFAULT_MOCK_USER_ID = "U_mock_user";

// 只有在非生产环境且 AUTH_MOCK=true 时才允许使用模拟用户
function isMockAuthEnabled(env: Env): boolean {
  return env.AUTH_MOCK === "true" && env.APP_ENV !== "production";
}

/**
 * 需要登录的接口使用此中间件。
 * 校验 Authorization: Bearer <LINE ID token>，通过后可用 c.get("lineUser") 取得 LINE 用户信息。
 */
export const requireAuth = createMiddleware<{
  Bindings: Env;
  Variables: { lineUser: LineUser };
}>(async (c, next) => {
  const token = c.req.header("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    throw new ApiError(401, "UNAUTHORIZED", "缺少 Authorization 请求头");
  }

  if (isMockAuthEnabled(c.env)) {
    const userId = c.req.header(MOCK_USER_ID_HEADER) || DEFAULT_MOCK_USER_ID;
    c.set("lineUser", { userId, displayName: `模拟用户（${userId}）`, pictureUrl: null });
  } else {
    c.set("lineUser", await verifyLineIdToken(token, c.env.LINE_CHANNEL_ID));
  }

  await next();
});
