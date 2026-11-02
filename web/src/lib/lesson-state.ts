import type { LessonStatus } from "@shared/constants/lesson";
import { lessonEndsAt } from "@shared/lib/lesson";

// 课程在画面上的状态：即将上 / 上课中 / 已上 / 已取消
// 数据库中只有「已安排」「已取消」两种状态，其余按现在的时间判断
export type LessonState = "upcoming" | "ongoing" | "done" | "cancelled";

type LessonLike = {
  startsAt: string | Date;
  durationMinutes: number;
  status: LessonStatus;
};

export function lessonStateOf(lesson: LessonLike, now = new Date()): LessonState {
  if (lesson.status === "cancelled") return "cancelled";
  const startsAt = new Date(lesson.startsAt);
  if (lessonEndsAt(startsAt, lesson.durationMinutes) <= now) return "done";
  return startsAt <= now ? "ongoing" : "upcoming";
}
