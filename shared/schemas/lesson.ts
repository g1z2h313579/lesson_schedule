import { z } from "zod";
import { LESSON_REASON_MAX_LENGTH } from "../constants/lesson";
import { MESSAGE_BODY_MAX_LENGTH, MESSAGE_IMAGE_MAX_COUNT } from "../constants/message";
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

// 取消的请求体（理由选填）
export const cancelLessonSchema = z.object({
  reason: optionalTextSchema(LESSON_REASON_MAX_LENGTH),
});

// 改时间的请求体：新的开始时间（UTC 毫秒）、理由（选填）
export const rescheduleLessonSchema = z.object({
  startsAt: z.number().int(),
  reason: optionalTextSchema(LESSON_REASON_MAX_LENGTH),
});

// 留言附带的图片：先逐张用 POST /api/lessons/:id/images 上传，得到 R2 中的路径
export const messageImageSchema = z.object({
  key: z.string().min(1).max(200),
  width: z.number().int().positive().max(20_000),
  height: z.number().int().positive().max(20_000),
});

// POST /api/lessons/:id/messages（发留言）的请求体：文字和图片至少要有一样
export const createMessageSchema = z
  .object({
    body: z
      .string()
      .trim()
      .max(MESSAGE_BODY_MAX_LENGTH)
      .optional()
      .transform((value) => value || null),
    images: z.array(messageImageSchema).max(MESSAGE_IMAGE_MAX_COUNT).default([]),
  })
  .refine((value) => value.body !== null || value.images.length > 0, "文字和图片至少要有一样");

export type CreateMessageInput = z.input<typeof createMessageSchema>;
export type CreateMessageValues = z.output<typeof createMessageSchema>;
