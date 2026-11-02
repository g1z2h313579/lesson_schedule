import { asc, eq, inArray } from "drizzle-orm";
import type { Database } from "../db/client";
import { messageImages, type NewMessageImage } from "../db/schema";
import { chunk } from "../lib/chunk";

// 留言图片表的数据访问（文件本身在 R2 中）
export function createMessageImageRepository(db: Database) {
  return {
    findById(id: number) {
      return db.query.messageImages.findFirst({ where: eq(messageImages.id, id) });
    },

    // 多条留言的图片（按留言、顺序排列）
    async listByMessageIds(messageIds: number[]) {
      const rows = [];
      for (const ids of chunk(messageIds, 90)) {
        rows.push(
          ...(await db
            .select()
            .from(messageImages)
            .where(inArray(messageImages.messageId, ids))
            .orderBy(asc(messageImages.messageId), asc(messageImages.sortOrder))),
        );
      }
      return rows;
    },

    // 这些路径中已登记在数据库里的（清理没发出去的图片时使用）
    async existingKeys(keys: string[]) {
      const result = new Set<string>();
      for (const part of chunk(keys, 90)) {
        const rows = await db
          .select({ key: messageImages.r2Key })
          .from(messageImages)
          .where(inArray(messageImages.r2Key, part));
        for (const row of rows) result.add(row.key);
      }
      return result;
    },

    // 每行约 10 个参数，按 5 行一批写入（D1 每条 SQL 最多 100 个参数）
    async insertMany(values: NewMessageImage[]) {
      for (const rows of chunk(values, 5)) {
        await db.insert(messageImages).values(rows);
      }
    },

    // 删除一条留言的图片记录（返回未执行的查询，可以放进 db.batch() 中）
    deleteByMessage(messageId: number) {
      return db.delete(messageImages).where(eq(messageImages.messageId, messageId));
    },
  };
}
