import { and, asc, eq, inArray, ne, or } from "drizzle-orm";
import type { Database } from "../db/client";
import {
  type NewWeeklySchedule,
  type TeacherStudent,
  teacherStudents,
  weeklySchedules,
} from "../db/schema";

// 每周课程规则表的数据访问
// 写入方法返回未执行的查询，调用方可以直接 await，也可以放进 db.batch() 中与其他写入一起执行
export function createWeeklyScheduleRepository(db: Database) {
  return {
    listByRelation(relationId: number) {
      return db
        .select()
        .from(weeklySchedules)
        .where(eq(weeklySchedules.teacherStudentId, relationId))
        .orderBy(asc(weeklySchedules.weekday), asc(weeklySchedules.startHour));
    },

    // 这位老师和这个学生在其他关系中设置的时段（老师的其他学生、学生的其他老师，用于检查冲突）
    listOtherSlotsOfPeople(relation: TeacherStudent) {
      return db
        .selectDistinct({
          weekday: weeklySchedules.weekday,
          startHour: weeklySchedules.startHour,
        })
        .from(weeklySchedules)
        .innerJoin(teacherStudents, eq(weeklySchedules.teacherStudentId, teacherStudents.id))
        .where(
          and(
            or(
              eq(teacherStudents.teacherId, relation.teacherId),
              eq(teacherStudents.studentId, relation.studentId),
            ),
            ne(teacherStudents.id, relation.id),
          ),
        );
    },

    // 设置了每周课程的关系 id（定时任务补齐时使用）
    async relationIdsWithRules() {
      const rows = await db
        .selectDistinct({ relationId: weeklySchedules.teacherStudentId })
        .from(weeklySchedules);
      return rows.map((row) => row.relationId);
    },

    insertMany(values: NewWeeklySchedule[]) {
      return db.insert(weeklySchedules).values(values);
    },

    deleteByIds(ids: number[]) {
      return db.delete(weeklySchedules).where(inArray(weeklySchedules.id, ids));
    },
  };
}
