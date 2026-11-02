import type { Database } from "../db/client";
import type { TeacherStudent, User } from "../db/schema";
import { toCreditRequest, toLesson, toProfile } from "../lib/serializers";
import { createCreditRequestRepository } from "../repositories/credit-request-repository";
import { createLessonRepository, PAST_LESSONS_PAGE_SIZE } from "../repositories/lesson-repository";
import { createRelationRepository } from "../repositories/relation-repository";
import { createUserRepository } from "../repositories/user-repository";
import { createWeeklyScheduleRepository } from "../repositories/weekly-schedule-repository";
import { getViewableRelation } from "./relation-access";

// 师生关系：列表、详情、统计（统计计算方法见 docs/implementation-plan.md 第 5.1 节）
export function createRelationService(db: Database) {
  const relationRepository = createRelationRepository(db);
  const userRepository = createUserRepository(db);
  const creditRequestRepository = createCreditRequestRepository(db);
  const lessonRepository = createLessonRepository(db);
  const weeklyScheduleRepository = createWeeklyScheduleRepository(db);

  // 一次算出多个关系的双方资料和统计（按关系分组查询，不逐个查询）
  async function summarize(relations: TeacherStudent[], now: Date) {
    const ids = relations.map((relation) => relation.id);
    const [usersById, totals, counts, nextLessons, pendingIds] = await Promise.all([
      userRepository.findByIds(relations.flatMap((r) => [r.teacherId, r.studentId])),
      creditRequestRepository.approvedTotals(ids),
      lessonRepository.countsByRelations(ids, now),
      lessonRepository.nextByRelations(ids, now),
      creditRequestRepository.pendingRelationIds(ids),
    ]);

    return relations.map((relation) => {
      const teacher = usersById.get(relation.teacherId);
      const student = usersById.get(relation.studentId);
      if (!teacher || !student) throw new Error(`师生关系 ${relation.id} 的用户不存在`);
      const totalCredits = totals.get(relation.id) ?? 0;
      const { scheduled = 0, done = 0 } = counts.get(relation.id) ?? {};
      const nextLesson = nextLessons.get(relation.id);
      return {
        id: relation.id,
        teacher: toProfile(teacher),
        student: toProfile(student),
        stats: {
          totalCredits,
          scheduledCount: scheduled,
          doneCount: done,
          remainingCredits: totalCredits - scheduled,
          nextLesson: nextLesson ? toLesson(nextLesson) : null,
        },
        hasPendingCreditRequest: pendingIds.has(relation.id),
        createdAt: relation.createdAt,
      };
    });
  }

  return {
    /** 师生关系列表：自己参与的关系（管理员为全部），按下一节课的时间排序 */
    async list(user: User, now: Date) {
      const relations = await relationRepository.list(user.isAdmin ? null : user.id);
      const items = await summarize(relations, now);
      const nextTime = (item: (typeof items)[number]) =>
        item.stats.nextLesson?.startsAt.getTime() ?? Number.POSITIVE_INFINITY;
      return items.sort((a, b) => nextTime(a) - nextTime(b) || a.id - b.id);
    },

    /** 详情：双方资料、统计、待处理的课时申请、每周课程的时段 */
    async get(user: User, relationId: number, now: Date) {
      const relation = await getViewableRelation(db, user, relationId);
      const [[summary], pending, weeklySchedules] = await Promise.all([
        summarize([relation], now),
        creditRequestRepository.findPending(relation.id),
        weeklyScheduleRepository.listByRelation(relation.id),
      ]);
      if (!summary) throw new Error("师生关系的统计计算失败");
      return {
        ...summary,
        pendingCreditRequest: pending ? toCreditRequest(pending) : null,
        weeklySlots: weeklySchedules.map(({ weekday, startHour }) => ({ weekday, startHour })),
      };
    },

    /** 课程列表：即将上的课（全部），或已上的课（分页，before 为上一页最后一节课的开始时间） */
    async listLessons(
      user: User,
      relationId: number,
      scope: "upcoming" | "past",
      now: Date,
      before?: number,
    ) {
      const relation = await getViewableRelation(db, user, relationId);
      const lessons = await lessonRepository.listByRelation(relation.id, scope, now, before);
      return {
        lessons: lessons.map(toLesson),
        hasMore: scope === "past" && lessons.length === PAST_LESSONS_PAGE_SIZE,
      };
    },
  };
}
