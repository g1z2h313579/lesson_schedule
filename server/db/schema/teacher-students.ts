import { index, integer, sqliteTable, uniqueIndex } from "drizzle-orm/sqlite-core";
import { timestamps } from "./columns";
import { users } from "./users";

// 师生关系：哪位老师和哪个学生关联（多对多）
// 课时申请、每周课程规则、课程都挂在师生关系上
export const teacherStudents = sqliteTable(
  "teacher_students",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    teacherId: integer()
      .notNull()
      .references(() => users.id),
    studentId: integer()
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (t) => [
    // 同一对师生只能关联一次
    uniqueIndex("teacher_students_pair_unique").on(t.teacherId, t.studentId),
    index("teacher_students_student_idx").on(t.studentId),
  ],
);

export type TeacherStudent = typeof teacherStudents.$inferSelect;
export type NewTeacherStudent = typeof teacherStudents.$inferInsert;
