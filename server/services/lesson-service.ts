import { type Database, runBatch } from "../db/client";
import type { Lesson, TeacherStudent, User } from "../db/schema";
import { isRelationStudent, isRelationTeacher } from "../lib/access";
import { ApiError } from "../lib/errors";
import { toLesson, toProfile } from "../lib/serializers";
import { createLessonRepository } from "../repositories/lesson-repository";
import { createMessageRepository } from "../repositories/message-repository";
import { createRelationRepository } from "../repositories/relation-repository";
import { createUserRepository } from "../repositories/user-repository";
import {
  assertRelationStudent,
  assertRelationTeacher,
  getViewableRelation,
} from "./relation-access";
import { assertLessonSlotAvailable } from "./schedule-service";

// 课程：课程表、课程详情、请假、取消、改时间
export function createLessonService(db: Database) {
  const relationRepository = createRelationRepository(db);
  const userRepository = createUserRepository(db);
  const lessonRepository = createLessonRepository(db);
  const messageRepository = createMessageRepository(db);

  // 取得课程和所属的师生关系（看不到时返回 404）
  async function load(user: User, lessonId: number) {
    const lesson = await lessonRepository.findById(lessonId);
    if (!lesson) throw new ApiError(404, "NOT_FOUND", "课程不存在");
    const relation = await getViewableRelation(db, user, lesson.teacherStudentId);
    return { lesson, relation };
  }

  // 只有开始之前、还没取消的课才能请假、取消、改时间
  function assertChangeable(lesson: Lesson, now: Date) {
    if (lesson.status === "cancelled") {
      throw new ApiError(409, "LESSON_ALREADY_CANCELLED", "课程已取消");
    }
    if (lesson.startsAt <= now) {
      throw new ApiError(409, "LESSON_ALREADY_STARTED", "课程已开始");
    }
  }

  // 当前用户对这节课能做的操作（前端按这些值显示按钮）
  function permissionsOf(user: User, lesson: Lesson, relation: TeacherStudent, now: Date) {
    const changeable = lesson.status === "scheduled" && lesson.startsAt > now;
    const isTeacher = isRelationTeacher(user, relation);
    const isStudent = isRelationStudent(user, relation);
    return {
      canLeave: isStudent && changeable,
      canCancel: isTeacher && changeable,
      canReschedule: isTeacher && changeable,
      canPost: isTeacher || isStudent,
    };
  }

  // 取消课程，并在留言板中写入记录（同一个事务）
  function cancelWithRecord(
    user: User,
    lesson: Lesson,
    type: "leave" | "cancel" | "reschedule",
    reason: string | null,
    now: Date,
    rescheduledToId?: number,
  ) {
    return runBatch(db, [
      lessonRepository.cancel(lesson.id, {
        cancelledAt: now,
        cancelledById: user.id,
        cancelReason: reason,
        rescheduledToId,
      }),
      messageRepository.create({ lessonId: lesson.id, senderId: user.id, type, body: reason }),
    ]);
  }

  return {
    /** 课程表：from ～ to 之间的课（自己参与的关系，管理员为全部），附带双方的名字和头像 */
    async listInRange(user: User, from: Date, to: Date) {
      const relations = await relationRepository.list(user.isAdmin ? null : user.id);
      const relationsById = new Map(relations.map((relation) => [relation.id, relation]));
      const [lessons, usersById] = await Promise.all([
        lessonRepository.listInRange(
          user.isAdmin ? null : relations.map((relation) => relation.id),
          from,
          to,
        ),
        userRepository.findByIds(relations.flatMap((r) => [r.teacherId, r.studentId])),
      ]);
      return lessons.flatMap((lesson) => {
        const relation = relationsById.get(lesson.teacherStudentId);
        const teacher = relation && usersById.get(relation.teacherId);
        const student = relation && usersById.get(relation.studentId);
        if (!teacher || !student) return [];
        return [{ ...toLesson(lesson), teacher: toProfile(teacher), student: toProfile(student) }];
      });
    },

    /** 课程详情：课程、双方资料、改时间后的新课、当前用户能做的操作 */
    async get(user: User, lessonId: number, now: Date) {
      const { lesson, relation } = await load(user, lessonId);
      const [usersById, rescheduledTo] = await Promise.all([
        userRepository.findByIds([relation.teacherId, relation.studentId]),
        lesson.rescheduledToId === null
          ? undefined
          : lessonRepository.findById(lesson.rescheduledToId),
      ]);
      const teacher = usersById.get(relation.teacherId);
      const student = usersById.get(relation.studentId);
      if (!teacher || !student) throw new Error(`师生关系 ${relation.id} 的用户不存在`);
      return {
        lesson: toLesson(lesson),
        teacher: toProfile(teacher),
        student: toProfile(student),
        rescheduledTo: rescheduledTo
          ? { id: rescheduledTo.id, startsAt: rescheduledTo.startsAt }
          : null,
        permissions: permissionsOf(user, lesson, relation, now),
      };
    },

    /** 学生请假：这节课变为已取消（不扣课时），留言板中留下请假记录 */
    async leave(user: User, lessonId: number, reason: string | null, now: Date) {
      const { lesson, relation } = await load(user, lessonId);
      assertRelationStudent(user, relation);
      assertChangeable(lesson, now);
      await cancelWithRecord(user, lesson, "leave", reason, now);
    },

    /** 老师取消：这节课变为已取消（不扣课时），留言板中留下取消记录 */
    async cancel(user: User, lessonId: number, reason: string | null, now: Date) {
      const { lesson, relation } = await load(user, lessonId);
      assertRelationTeacher(user, relation);
      assertChangeable(lesson, now);
      await cancelWithRecord(user, lesson, "cancel", reason, now);
    },

    /**
     * 老师改时间：取消原来的课，新建一节单次课程（课时不变）。
     * 原来的课记下改到的新课，留言板中留下「已改到 ○月○日」的记录；原来的留言保留在原来的课中。
     */
    async reschedule(
      user: User,
      lessonId: number,
      startsAt: Date,
      reason: string | null,
      now: Date,
    ) {
      const { lesson, relation } = await load(user, lessonId);
      assertRelationTeacher(user, relation);
      assertChangeable(lesson, now);
      await assertLessonSlotAvailable(db, relation, startsAt, now);

      // D1 不能在一个事务中使用前一条语句的结果，所以分两步：先建新课，再取消原来的课
      const created = await lessonRepository.create({ teacherStudentId: relation.id, startsAt });
      try {
        await cancelWithRecord(user, lesson, "reschedule", reason, now, created.id);
      } catch (error) {
        // 第二步失败时删除新课，恢复原状
        await lessonRepository.deleteByIds([created.id]);
        throw error;
      }
      return toLesson(created);
    },
  };
}
