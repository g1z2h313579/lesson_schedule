import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { CREDIT_REQUEST_STATUSES } from "../../../shared/constants/credit-request";
import { timestamps } from "./columns";
import { teacherStudents } from "./teacher-students";

// 课时申请：学生申请增加课时，老师确认或拒绝（created_at 就是申请时间）
// 总课时 = 已确认申请的 amount 之和（不单独保存，查询时计算）
export const creditRequests = sqliteTable(
  "credit_requests",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    teacherStudentId: integer()
      .notNull()
      .references(() => teacherStudents.id),
    // 申请增加的课时数
    amount: integer().notNull(),
    // 学生的备注
    note: text(),
    status: text({ enum: CREDIT_REQUEST_STATUSES }).notNull().default("pending"),
    // 老师拒绝的理由
    rejectReason: text(),
    // 确认、拒绝或撤回的时间
    decidedAt: integer({ mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [
    index("credit_requests_teacher_student_idx").on(t.teacherStudentId),
    // 同一个师生关系中，待处理的申请最多 1 条
    uniqueIndex("credit_requests_one_pending_unique")
      .on(t.teacherStudentId)
      .where(sql`status = 'pending'`),
  ],
);

export type CreditRequest = typeof creditRequests.$inferSelect;
export type NewCreditRequest = typeof creditRequests.$inferInsert;
