import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import { createUserService } from "../services/user-service";
import type { AppEnv } from "../types";

// 当前登录用户：校验 LINE 登录 → 同步到数据库 → 返回用户信息
export const meRoutes = new Hono<AppEnv>().use(requireAuth).get("/", async (c) => {
  const user = await createUserService(c.get("db")).syncLineUser(c.get("lineUser"));
  return c.json({ user });
});
