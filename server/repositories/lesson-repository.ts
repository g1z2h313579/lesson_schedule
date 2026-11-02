import { and, asc, count, desc, eq, gt, gte, inArray, lt, lte, or, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { type Lesson, lessons, type NewLesson, teacherStudents } from "../db/schema";
import { chunk } from "../lib/chunk";

// 课程的结束时间（UTC 毫秒）：开始时间 + 时长
const endsAtMs = sql<number>`(${lessons.startsAt} + ${lessons.durationMinutes} * 60000)`;

// 已上的课：已安排且结束时间已过；还没结束的课：结束时间在现在之后
const isEnded = (now: Date) => lte(endsAtMs, now.getTime());
const isNotEnded = (now: Date) => gt(endsAtMs, now.getTime());

// 已结束的课每次返回的条数
export const PAST_LESSONS_PAGE_SIZE = 20;

// 课程表的数据访问
// 写入方法中，cancel / deleteByIds 返回未执行的查询，可以放进 db.batch() 中与其他写入一起执行
export function createLessonRepository(db: Database) {
  return {
    findById(id: number) {
      return db.query.lessons.findFirst({ where: eq(lessons.id, id) });
    },

    // 详情页的课程列表
    // upcoming：还没结束的课（含已取消），时间升序；past：已结束的课，时间降序，每次 PAST_LESSONS_PAGE_SIZE 条
    listByRelation(relationId: number, scope: "upcoming" | "past", now: Date, before?: number) {
      if (scope === "upcoming") {
        return db
          .select()
          .from(lessons)
          .where(and(eq(lessons.teacherStudentId, relationId), isNotEnded(now)))
          .orderBy(asc(lessons.startsAt));
      }
      return db
        .select()
        .from(lessons)
        .where(
          and(
            eq(lessons.teacherStudentId, relationId),
            isEnded(now),
            before === undefined ? undefined : lt(lessons.startsAt, new Date(before)),
          ),
        )
        .orderBy(desc(lessons.startsAt))
        .limit(PAST_LESSONS_PAGE_SIZE);
    },

    // 课程表：from（含）～ to（不含）之间开始的课（含已取消）；relationIds 为 null 时返回全部（管理员用）
    listInRange(relationIds: number[] | null, from: Date, to: Date) {
      if (relationIds?.length === 0) return Promise.resolve([] as Lesson[]);
      return db
        .select()
        .from(lessons)
        .where(
          and(
            relationIds === null ? undefined : inArray(lessons.teacherStudentId, relationIds),
            gte(lessons.startsAt, from),
            lt(lessons.startsAt, to),
          ),
        )
        .orderBy(asc(lessons.startsAt));
    },

    // 某位老师或某个学生（任意一方）在这段时间内已安排的课（检查时段冲突用）
    listScheduledOfPeople(people: { teacherId: number; studentId: number }, from: Date, to: Date) {
      return db
        .select({
          id: lessons.id,
          relationId: lessons.teacherStudentId,
          startsAt: lessons.startsAt,
        })
        .from(lessons)
        .innerJoin(teacherStudents, eq(lessons.teacherStudentId, teacherStudents.id))
        .where(
          and(
            eq(lessons.status, "scheduled"),
            gte(lessons.startsAt, from),
            lt(lessons.startsAt, to),
            or(
              eq(teacherStudents.teacherId, people.teacherId),
              eq(teacherStudents.studentId, people.studentId),
            ),
          ),
        );
    },

    // 这个关系在这段时间内所有课的开始时间（含已取消，自动排课时跳过这些时间）
    async startTimesOfRelation(relationId: number, from: Date, to: Date) {
      const rows = await db
        .select({ startsAt: lessons.startsAt })
        .from(lessons)
        .where(
          and(
            eq(lessons.teacherStudentId, relationId),
            gte(lessons.startsAt, from),
            lt(lessons.startsAt, to),
          ),
        );
      return new Set(rows.map((row) => row.startsAt.getTime()));
    },

    // 各关系已安排的课的节数（含已上）和已上的节数
    async countsByRelations(relationIds: number[], now: Date) {
      const result = new Map<number, { scheduled: number; done: number }>();
      if (relationIds.length === 0) return result;
      const rows = await db
        .select({
          relationId: lessons.teacherStudentId,
          scheduled: count(),
          done: sql<number>`sum(case when ${endsAtMs} <= ${now.getTime()} then 1 else 0 end)`,
        })
        .from(lessons)
        .where(and(inArray(lessons.teacherStudentId, relationIds), eq(lessons.status, "scheduled")))
        .groupBy(lessons.teacherStudentId);
      for (const row of rows) {
        result.set(row.relationId, { scheduled: row.scheduled, done: Number(row.done ?? 0) });
      }
      return result;
    },

    // 各关系的下一节课：已安排、还没结束的课中开始时间最早的一节（正在上的课也算）
    async nextByRelations(relationIds: number[], now: Date) {
      const result = new Map<number, Lesson>();
      if (relationIds.length === 0) return result;
      const rows = await db
        .select()
        .from(lessons)
        .where(
          and(
            inArray(lessons.teacherStudentId, relationIds),
            eq(lessons.status, "scheduled"),
            isNotEnded(now),
          ),
        )
        .orderBy(asc(lessons.startsAt));
      for (const row of rows) {
        if (!result.has(row.teacherStudentId)) result.set(row.teacherStudentId, row);
      }
      return result;
    },

    // 某些每周规则生成的、还没开始的已安排的课（修改每周课程时处理）
    listFutureScheduledByRules(ruleIds: number[], now: Date) {
      if (ruleIds.length === 0) return Promise.resolve([] as Lesson[]);
      return db
        .select()
        .from(lessons)
        .where(
          and(
            inArray(lessons.weeklyScheduleId, ruleIds),
            eq(lessons.status, "scheduled"),
            gt(lessons.startsAt, now),
          ),
        );
    },

    async create(values: NewLesson) {
      const [lesson] = await db.insert(lessons).values(values).returning();
      if (!lesson) throw new Error("课程写入失败");
      return lesson;
    },

    // 一次写入多节课：同一时间已有已安排的课时跳过（唯一索引），返回实际写入的课
    // 每行约 5 个参数，按 10 行一批写入（D1 每条 SQL 最多 100 个参数）
    async insertMany(values: NewLesson[]) {
      const inserted: Lesson[] = [];
      for (const rows of chunk(values, 10)) {
        inserted.push(...(await db.insert(lessons).values(rows).onConflictDoNothing().returning()));
      }
      return inserted;
    },

    // 取消课程（只取消已安排的课）
    cancel(
      id: number,
      values: {
        cancelledAt: Date;
        cancelledById: number;
        cancelReason: string | null;
        rescheduledToId?: number;
      },
    ) {
      return db
        .update(lessons)
        .set({ status: "cancelled", ...values })
        .where(and(eq(lessons.id, id), eq(lessons.status, "scheduled")));
    },

    deleteByIds(ids: number[]) {
      return db.delete(lessons).where(inArray(lessons.id, ids));
    },
  };
}
