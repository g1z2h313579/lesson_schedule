import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { MESSAGE_TYPES } from "../../../shared/constants/message";
import { timestamps } from "./columns";
import { lessons } from "./lessons";
import { users } from "./users";

// 留言：每节课一个留言板（created_at 就是发言时间）
export const messages = sqliteTable(
  "messages",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    lessonId: integer()
      .notNull()
      .references(() => lessons.id),
    senderId: integer()
      .notNull()
      .references(() => users.id),
    type: text({ enum: MESSAGE_TYPES }).notNull().default("text"),
    // 内容：只发图片时为空；取消、改时间的记录中为理由
    body: text(),
    ...timestamps,
  },
  (t) => [index("messages_lesson_created_at_idx").on(t.lessonId, t.createdAt)],
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
