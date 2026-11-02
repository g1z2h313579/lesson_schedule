import { z } from "zod";
import { LESSON_START_HOUR_MAX, LESSON_START_HOUR_MIN } from "../constants/lesson";

// 每周的一个时段：星期几（1 = 周一 … 7 = 周日）+ 日本时间的几点
export const weeklySlotSchema = z.object({
  weekday: z.number().int().min(1).max(7),
  startHour: z.number().int().min(LESSON_START_HOUR_MIN).max(LESSON_START_HOUR_MAX),
});

// PUT /api/relations/:id/weekly-schedules（保存每周课程，整体替换）的请求体
export const saveWeeklySchedulesSchema = z.object({
  slots: z
    .array(weeklySlotSchema)
    .max(7 * (LESSON_START_HOUR_MAX - LESSON_START_HOUR_MIN + 1))
    .refine(
      (slots) => new Set(slots.map((s) => `${s.weekday}-${s.startHour}`)).size === slots.length,
      "时段重复",
    ),
});

// GET /api/relations/:id/schedule-board 的查询参数：要显示的那一周中的任意一天（日本时间，YYYY-MM-DD）
export const scheduleBoardQuerySchema = z.object({
  week: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// POST /api/relations/:id/lessons（添加单次课程）的请求体：开始时间（UTC 毫秒）
export const createLessonSchema = z.object({
  startsAt: z.number().int(),
});

export type WeeklySlot = z.infer<typeof weeklySlotSchema>;
