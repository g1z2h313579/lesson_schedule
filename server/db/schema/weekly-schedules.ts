import { integer, sqliteTable, uniqueIndex } from "drizzle-orm/sqlite-core";
import { timestamps } from "./columns";
import { teacherStudents } from "./teacher-students";

// 每周课程规则：一行表示每周的一个时段（例如「每周一、周四 13:00」是 2 行）
// 时间按日本时间解释。系统按这些规则自动排课（见 docs/implementation-plan.md 第 5.2 节）
export const weeklySchedules = sqliteTable(
  "weekly_schedules",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    teacherStudentId: integer()
      .notNull()
      .references(() => teacherStudents.id),
    // 星期几：1 = 周一 … 7 = 周日
    weekday: integer().notNull(),
    // 开始时间：日本时间的几点（整点开始）
    startHour: integer().notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("weekly_schedules_slot_unique").on(t.teacherStudentId, t.weekday, t.startHour),
  ],
);

export type WeeklySchedule = typeof weeklySchedules.$inferSelect;
export type NewWeeklySchedule = typeof weeklySchedules.$inferInsert;
