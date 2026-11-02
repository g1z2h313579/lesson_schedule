import { z } from "zod";
import { LESSON_REASON_MAX_LENGTH } from "../constants/lesson";
import { MESSAGE_BODY_MAX_LENGTH } from "../constants/message";
import { optionalTextSchema } from "./common";

// 课程表一次最多查询的天数
export const LESSON_RANGE_MAX_DAYS = 62;

// GET /api/lessons 的查询参数：from ～ to（UTC 毫秒，不含 to）
export const lessonRangeQuerySchema = z
  .object({
    from: z.coerce.number().int(),
    to: z.coerce.number().int(),
  })
  .refine(
    ({ from, to }) => to > from && to - from <= LESSON_RANGE_MAX_DAYS * 24 * 60 * 60 * 1000,
    "时间范围不正确",
  );

// GET /api/relations/:id/lessons 的查询参数
// upcoming：还没结束的课（全部）；past：已结束的课，每次 20 条，before 为上一页最后一节课的开始时间
export const relationLessonsQuerySchema = z.object({
  scope: z.enum(["upcoming", "past"]),
  before: z.coerce.number().int().optional(),
});

// 请假、取消的请求体（理由选填）
export const cancelLessonSchema = z.object({
  reason: optionalTextSchema(LESSON_REASON_MAX_LENGTH),
});

// 改时间的请求体：新的开始时间（UTC 毫秒）、理由（选填）
export const rescheduleLessonSchema = z.object({
  startsAt: z.number().int(),
  reason: optionalTextSchema(LESSON_REASON_MAX_LENGTH),
});

// POST /api/lessons/:id/messages（发留言）的请求体
export const createMessageSchema = z.object({
  body: z.string().trim().min(1).max(MESSAGE_BODY_MAX_LENGTH),
});
