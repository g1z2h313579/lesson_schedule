import type { BatchItem } from "drizzle-orm/batch";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// 基于 D1 绑定创建 Drizzle 实例（每个请求创建一次，开销很小）
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema, casing: "snake_case" });
}

export type Database = ReturnType<typeof createDb>;

/**
 * 在同一个事务中依次执行多条写入（D1 的 batch：其中一条失败时全部回滚）。
 * D1 不支持跨多次请求的事务，需要同时写入多张表时使用。statements 为空时什么都不做。
 */
export async function runBatch(db: Database, statements: BatchItem<"sqlite">[]): Promise<void> {
  const [first, ...rest] = statements;
  if (!first) return;
  await db.batch([first, ...rest]);
}
