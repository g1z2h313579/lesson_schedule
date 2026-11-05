import {
  addDays,
  fromJst,
  parseJstDateString,
  scheduleHorizon,
  startOfJstWeek,
  toJstDateString,
  toJstParts,
  weeklyOccurrences,
} from "@shared/lib/jst";
import { isValidLessonStart, LESSON_START_HOURS } from "@shared/lib/lesson";
import type { WeeklySlot } from "@shared/schemas/schedule";
import { type Database, runBatch } from "../db/client";
import type { NewLesson, TeacherStudent, User } from "../db/schema";
import { ApiError } from "../lib/errors";
import { toLesson } from "../lib/serializers";
import { createLessonRepository } from "../repositories/lesson-repository";
import { createMessageRepository } from "../repositories/message-repository";
import { createRelationRepository } from "../repositories/relation-repository";
import { createWeeklyScheduleRepository } from "../repositories/weekly-schedule-repository";
import { getRemainingCredits } from "./credit-balance";
import type { Notifier } from "./notifier";
import { assertRelationMember, getViewableRelation } from "./relation-access";

// 排课画面中每个时段的状态：可选 / 这个关系的课 / 老师或学生已有别的课 / 已过去
export type SlotState = "free" | "mine" | "busy" | "past";

const slotKey = (slot: WeeklySlot) => `${slot.weekday}-${slot.startHour}`;

/**
 * 检查能否在 startsAt 上课：日本时间 8:00～21:00 的整点、在将来、老师和学生在这个时间都没有已安排的课。
 * 添加单次课程、改时间时使用。不能选时抛出 SLOT_UNAVAILABLE。
 */
export async function assertLessonSlotAvailable(
  db: Database,
  relation: TeacherStudent,
  startsAt: Date,
  now: Date,
): Promise<void> {
  if (!isValidLessonStart(startsAt) || startsAt <= now) {
    throw new ApiError(409, "SLOT_UNAVAILABLE", "不是可以上课的时间");
  }
  const busy = await createLessonRepository(db).listScheduledOfPeople(
    relation,
    startsAt,
    new Date(startsAt.getTime() + 1),
  );
  if (busy.length > 0) {
    throw new ApiError(409, "SLOT_UNAVAILABLE", "老师或学生在这个时间已有课");
  }
}

// 排课：每周课程的自动补齐、保存每周课程、添加单次课程、排课画面的数据
// 老师和学生都能排课，规则相同，任何一方排的课都有效
// 补齐和修改的算法见 docs/implementation-plan.md 第 5.2、5.3 节
export function createScheduleService(db: Database, notifier: Notifier) {
  const relationRepository = createRelationRepository(db);
  const weeklyScheduleRepository = createWeeklyScheduleRepository(db);
  const lessonRepository = createLessonRepository(db);
  const messageRepository = createMessageRepository(db);

  /**
   * 按每周规则补排课程，返回新排的节数。执行多次结果相同。
   * 排课范围：平时到本月底，每月最后一天到下个月底（日本时间）。
   * 跳过：已有课的时间（含已取消的课，所以取消过的时段不会被重新排上）、
   * 老师或学生在其他关系中已有课的时间；剩余课时用完就停止。
   */
  async function fillRelation(relation: TeacherStudent, now: Date): Promise<number> {
    const rules = await weeklyScheduleRepository.listByRelation(relation.id);
    if (rules.length === 0) return 0;
    let remaining = await getRemainingCredits(db, relation.id);
    if (remaining <= 0) return 0;

    const horizon = scheduleHorizon(now);
    const occurrences = weeklyOccurrences(rules, now, horizon);
    if (occurrences.length === 0) return 0;
    const [existing, busyLessons] = await Promise.all([
      lessonRepository.startTimesOfRelation(relation.id, now, horizon),
      lessonRepository.listScheduledOfPeople(relation, now, horizon),
    ]);
    const busy = new Set(busyLessons.map((lesson) => lesson.startsAt.getTime()));

    const values: NewLesson[] = [];
    for (const { rule, startsAt } of occurrences) {
      if (remaining <= 0) break;
      const time = startsAt.getTime();
      if (existing.has(time) || busy.has(time)) continue;
      values.push({ teacherStudentId: relation.id, weeklyScheduleId: rule.id, startsAt });
      remaining -= 1;
    }
    return (await lessonRepository.insertMany(values)).length;
  }

  return {
    fillRelation,

    /** 定时任务：对所有设置了每周课程的关系执行补齐，返回新排的节数（排了课的关系通知双方） */
    async fillAll(now: Date) {
      let created = 0;
      for (const relationId of await weeklyScheduleRepository.relationIdsWithRules()) {
        const relation = await relationRepository.findById(relationId);
        if (!relation) continue;
        const count = await fillRelation(relation, now);
        if (count > 0) await notifier.relationChanged(relation, null);
        created += count;
      }
      return created;
    },

    /**
     * 保存每周课程（整体替换）。只处理有变化的时段：
     * 去掉的时段中，还没开始的课没有留言的删除、有留言的改为已取消；新增的时段立即补排本月剩下的课。
     */
    async saveWeekly(user: User, relationId: number, slots: WeeklySlot[], now: Date) {
      const relation = await getViewableRelation(db, user, relationId);
      assertRelationMember(user, relation);

      // 不能与双方在其他关系中的每周课程冲突（老师的其他学生、学生的其他老师）
      const others = await weeklyScheduleRepository.listOtherSlotsOfPeople(relation);
      const otherKeys = new Set(others.map(slotKey));
      if (slots.some((slot) => otherKeys.has(slotKey(slot)))) {
        throw new ApiError(409, "SLOT_UNAVAILABLE", "与其他关系的每周课程时段冲突");
      }

      const current = await weeklyScheduleRepository.listByRelation(relation.id);
      const nextKeys = new Set(slots.map(slotKey));
      const currentKeys = new Set(current.map(slotKey));
      const removed = current.filter((rule) => !nextKeys.has(slotKey(rule)));
      const added = slots.filter((slot) => !currentKeys.has(slotKey(slot)));

      if (removed.length > 0) {
        const future = await lessonRepository.listFutureScheduledByRules(
          removed.map((rule) => rule.id),
          now,
        );
        const withMessages = await messageRepository.lessonIdsWithMessages(
          future.map((lesson) => lesson.id),
        );
        const toDelete = future.filter((lesson) => !withMessages.has(lesson.id));
        const toCancel = future.filter((lesson) => withMessages.has(lesson.id));
        await runBatch(db, [
          ...toCancel.flatMap((lesson) => [
            lessonRepository.cancel(lesson.id, {
              cancelledAt: now,
              cancelledById: user.id,
              cancelReason: null,
            }),
            messageRepository.create({ lessonId: lesson.id, senderId: user.id, type: "cancel" }),
          ]),
          ...(toDelete.length > 0
            ? [lessonRepository.deleteByIds(toDelete.map((lesson) => lesson.id))]
            : []),
          weeklyScheduleRepository.deleteByIds(removed.map((rule) => rule.id)),
        ]);
      }
      if (added.length > 0) {
        await weeklyScheduleRepository.insertMany(
          added.map((slot) => ({ teacherStudentId: relation.id, ...slot })),
        );
      }

      const createdLessons = await fillRelation(relation, now);
      await notifier.relationChanged(relation, user);
      const saved = await weeklyScheduleRepository.listByRelation(relation.id);
      return {
        slots: saved.map(({ weekday, startHour }) => ({ weekday, startHour })),
        createdLessons,
      };
    },

    /** 添加单次课程（占用 1 课时） */
    async addSingleLesson(user: User, relationId: number, startsAt: Date, now: Date) {
      const relation = await getViewableRelation(db, user, relationId);
      assertRelationMember(user, relation);
      await assertLessonSlotAvailable(db, relation, startsAt, now);
      if ((await getRemainingCredits(db, relation.id)) <= 0) {
        throw new ApiError(409, "INSUFFICIENT_CREDITS", "剩余课时不足");
      }
      const lesson = await lessonRepository.create({ teacherStudentId: relation.id, startsAt });
      await notifier.relationChanged(relation, user);
      return toLesson(lesson);
    },

    /**
     * 排课画面的数据（按日本时间）：
     * - weekly：这个关系的每周时段、双方在其他关系中占用的每周时段
     * - days：week 所在那一周（周一～周日）每天每个时段的状态
     */
    async getBoard(user: User, relationId: number, week: string, now: Date) {
      const relation = await getViewableRelation(db, user, relationId);
      assertRelationMember(user, relation);
      const day = parseJstDateString(week);
      if (!day) throw new ApiError(400, "VALIDATION_ERROR", "日期不正确");

      const weekStart = startOfJstWeek(day);
      const weekEnd = addDays(weekStart, 7);
      const [rules, otherSlots, lessonsOfPeople, remainingCredits] = await Promise.all([
        weeklyScheduleRepository.listByRelation(relation.id),
        weeklyScheduleRepository.listOtherSlotsOfPeople(relation),
        lessonRepository.listScheduledOfPeople(relation, weekStart, weekEnd),
        getRemainingCredits(db, relation.id),
      ]);
      const mine = new Map<number, number>();
      const busy = new Set<number>();
      for (const lesson of lessonsOfPeople) {
        if (lesson.relationId === relation.id) mine.set(lesson.startsAt.getTime(), lesson.id);
        else busy.add(lesson.startsAt.getTime());
      }

      const days = Array.from({ length: 7 }, (_, index) => {
        const date = addDays(weekStart, index);
        const { year, month, day: dayOfMonth } = toJstParts(date);
        return {
          date: toJstDateString(date),
          cells: LESSON_START_HOURS.map((hour) => {
            const startsAt = fromJst(year, month, dayOfMonth, hour);
            const time = startsAt.getTime();
            const lessonId = mine.get(time) ?? null;
            const state: SlotState =
              lessonId !== null
                ? "mine"
                : startsAt <= now
                  ? "past"
                  : busy.has(time)
                    ? "busy"
                    : "free";
            return { hour, startsAt, state, lessonId };
          }),
        };
      });

      return {
        remainingCredits,
        weekStart: toJstDateString(weekStart),
        weekly: {
          slots: rules.map(({ weekday, startHour }) => ({ weekday, startHour })),
          busy: otherSlots,
        },
        days,
      };
    },
  };
}
