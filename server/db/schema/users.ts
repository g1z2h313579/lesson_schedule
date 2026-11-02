import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
// 注意：schema 文件会被 drizzle-kit 直接加载，它不认识路径别名，所以这里用相对路径
import { USER_ROLES } from "../../../shared/constants/user";
import { timestamps } from "./columns";

// 用户表：通过 LINE 登录的老师和学生
// role 和 name 都不为空，表示已完成首次设置
export const users = sqliteTable("users", {
  id: integer().primaryKey({ autoIncrement: true }),
  // LINE 的 userId（以 U 开头的字符串）
  lineUserId: text().notNull().unique(),
  // LINE 昵称：每次打开时同步，取不到时为空字符串
  lineDisplayName: text().notNull(),
  // LINE 头像网址：每次打开时同步
  pictureUrl: text(),
  // 首次设置时填写的名字（画面上显示这个名字），未完成首次设置时为空
  name: text(),
  // 自我介绍
  introduction: text(),
  // 身份（老师 / 学生），未完成首次设置时为空
  role: text({ enum: USER_ROLES }),
  // 是否管理员：只能直接修改数据库
  isAdmin: integer({ mode: "boolean" }).notNull().default(false),
  ...timestamps,
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
