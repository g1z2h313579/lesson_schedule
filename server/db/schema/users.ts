import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
// 注意：schema 文件会被 drizzle-kit 直接加载，它不认识路径别名，所以这里用相对路径
import { USER_ROLES } from "../../../shared/constants/user";
import { timestamps } from "./columns";

// 用户表：通过 LINE 登录的老师和学生
export const users = sqliteTable("users", {
  id: integer().primaryKey({ autoIncrement: true }),
  // LINE 的 userId（以 U 开头的字符串）
  lineUserId: text().notNull().unique(),
  displayName: text().notNull(),
  pictureUrl: text(),
  role: text({ enum: USER_ROLES }).notNull().default("student"),
  ...timestamps,
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
