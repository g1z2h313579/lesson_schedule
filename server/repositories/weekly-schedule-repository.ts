import { and, asc, eq, inArray, ne } from "drizzle-orm";
import type { Database } from "../db/client";
import { type NewWeeklySchedule, teacherStudents, weeklySchedules } from "../db/schema";

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

    // 这位老师在其他学生的关系中设置的时段（用于检查冲突）
    listOtherSlotsOfTeacher(teacherId: number, excludeRelationId: number) {
      return db
        .select({ weekday: weeklySchedules.weekday, startHour: weeklySchedules.startHour })
        .from(weeklySchedules)
        .innerJoin(teacherStudents, eq(weeklySchedules.teacherStudentId, teacherStudents.id))
        .where(
          and(eq(teacherStudents.teacherId, teacherId), ne(teacherStudents.id, excludeRelationId)),
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
