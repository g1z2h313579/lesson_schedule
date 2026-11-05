import { createMiddleware } from "hono/factory";
import { createDb } from "../db/client";
import { createNotifier } from "../services/notifier";
import type { AppEnv } from "../types";

// 为每个请求准备 Drizzle 实例和实时通知，路由中通过 c.get("db")、c.get("notifier") 使用
export const dbMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const db = createDb(c.env.DB);
  c.set("db", db);
  c.set("notifier", createNotifier(db, c.env.NOTIFICATION_HUB));
  await next();
});
