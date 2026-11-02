import { createMiddleware } from "hono/factory";
import { createDb } from "../db/client";
import type { AppEnv } from "../types";

// 为每个请求准备 Drizzle 实例，路由中通过 c.get("db") 使用
export const dbMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set("db", createDb(c.env.DB));
  await next();
});
