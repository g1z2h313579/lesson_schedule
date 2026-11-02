import { sql } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "../types";

// 健康检查：确认 Worker 和数据库都能正常工作
export const healthRoutes = new Hono<AppEnv>().get("/", async (c) => {
  await c.get("db").run(sql`select 1`);
  return c.json({ status: "ok" as const, time: new Date().toISOString() });
});
