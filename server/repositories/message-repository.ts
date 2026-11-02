import { asc, eq, inArray } from "drizzle-orm";
import type { Database } from "../db/client";
import { messages, type NewMessage } from "../db/schema";

// 留言表的数据访问
// create / deleteById 返回未执行的查询，可以放进 db.batch() 中与其他写入一起执行
export function createMessageRepository(db: Database) {
  return {
    findById(id: number) {
      return db.query.messages.findFirst({ where: eq(messages.id, id) });
    },

    // 一节课的留言（时间升序）
    listByLesson(lessonId: number) {
      return db
        .select()
        .from(messages)
        .where(eq(messages.lessonId, lessonId))
        .orderBy(asc(messages.createdAt), asc(messages.id));
    },

    // 有留言的课程 id
    async lessonIdsWithMessages(lessonIds: number[]) {
      if (lessonIds.length === 0) return new Set<number>();
      const rows = await db
        .selectDistinct({ lessonId: messages.lessonId })
        .from(messages)
        .where(inArray(messages.lessonId, lessonIds));
      return new Set(rows.map((row) => row.lessonId));
    },

    create(values: NewMessage) {
      return db.insert(messages).values(values).returning();
    },

    deleteById(id: number) {
      return db.delete(messages).where(eq(messages.id, id));
    },
  };
}
