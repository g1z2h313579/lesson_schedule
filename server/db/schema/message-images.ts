import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { timestamps } from "./columns";
import { messages } from "./messages";

// 留言图片：文件本身存在 R2（存储桶 lesson-schedule-images），这里只记录路径和尺寸
export const messageImages = sqliteTable(
  "message_images",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    // 留言删除时一起删除
    messageId: integer()
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    // 文件在 R2 中的路径：lessons/<课程 id>/<随机 ID>.jpg
    r2Key: text().notNull().unique(),
    contentType: text().notNull(),
    // 宽高（像素）：图片加载出来之前先按这个比例占好位置
    width: integer().notNull(),
    height: integer().notNull(),
    sizeBytes: integer().notNull(),
    // 在这条留言中的顺序（0 开始）
    sortOrder: integer().notNull(),
    ...timestamps,
  },
  (t) => [index("message_images_message_idx").on(t.messageId)],
);

export type MessageImage = typeof messageImages.$inferSelect;
export type NewMessageImage = typeof messageImages.$inferInsert;
