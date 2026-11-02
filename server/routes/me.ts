import { LINE_ACCESS_TOKEN_HEADER } from "@shared/constants/headers";
import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import { createUserService } from "../services/user-service";
import type { AppEnv } from "../types";

// 当前登录用户：校验 LINE 登录 → 同步到数据库（含昵称、头像）→ 返回用户信息
export const meRoutes = new Hono<AppEnv>().use(requireAuth).get("/", async (c) => {
  const user = await createUserService(c.get("db")).syncLineUser(
    c.get("lineUser"),
    c.req.header(LINE_ACCESS_TOKEN_HEADER),
  );
  return c.json({ user });
});
