import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// 基于 D1 绑定创建 Drizzle 实例（每个请求创建一次，开销很小）
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema, casing: "snake_case" });
}

export type Database = ReturnType<typeof createDb>;
