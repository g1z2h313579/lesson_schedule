import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { LESSON_DURATION_MINUTES, LESSON_STATUSES } from "../../../shared/constants/lesson";
import { timestamps } from "./columns";
import { teacherStudents } from "./teacher-students";
import { users } from "./users";
import { weeklySchedules } from "./weekly-schedules";

// 课程：每一节课
// 已取消的课也保留，这样取消过的时段不会被自动排课重新排上
export const lessons = sqliteTable(
  "lessons",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    teacherStudentId: integer()
      .notNull()
      .references(() => teacherStudents.id),
    // 由哪条每周规则生成：单次课程为空，规则被删除后自动变为空
    weeklyScheduleId: integer().references(() => weeklySchedules.id, { onDelete: "set null" }),
    startsAt: integer({ mode: "timestamp_ms" }).notNull(),
    // 时长（分钟）：保存下来，以后改了时长，以前的课也能显示正确
    durationMinutes: integer().notNull().default(LESSON_DURATION_MINUTES),
    status: text({ enum: LESSON_STATUSES }).notNull().default("scheduled"),
    cancelledAt: integer({ mode: "timestamp_ms" }),
    // 取消的人（老师或学生）
    cancelledById: integer().references(() => users.id),
    // 取消的理由
    cancelReason: text(),
    // 改时间时，改到的那节新课（只有改时间取消的课才有值）
    rescheduledToId: integer().references((): AnySQLiteColumn => lessons.id),
    ...timestamps,
  },
  (t) => [
    // 详情页的课程列表
    index("lessons_teacher_student_starts_at_idx").on(t.teacherStudentId, t.startsAt),
    // 同一师生关系、同一开始时间，已安排的课只能有 1 节（防止定时任务和老师操作同时排课）
    uniqueIndex("lessons_scheduled_slot_unique")
      .on(t.teacherStudentId, t.startsAt)
      .where(sql`status = 'scheduled'`),
    // 课程表（日历）
    index("lessons_starts_at_idx").on(t.startsAt),
  ],
);

export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
