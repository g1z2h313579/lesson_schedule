import {
  LESSON_DURATION_MINUTES,
  LESSON_START_HOUR_MAX,
  LESSON_START_HOUR_MIN,
} from "../constants/lesson";
import { toJstParts } from "./jst";

/** 课程的结束时间 */
export function lessonEndsAt(startsAt: Date, durationMinutes = LESSON_DURATION_MINUTES): Date {
  return new Date(startsAt.getTime() + durationMinutes * 60_000);
}

/** 是否是可以上课的开始时间：日本时间的整点，且在 8:00～21:00 之间 */
export function isValidLessonStart(startsAt: Date): boolean {
  const { hour, minute } = toJstParts(startsAt);
  return (
    startsAt.getTime() % 60_000 === 0 &&
    minute === 0 &&
    hour >= LESSON_START_HOUR_MIN &&
    hour <= LESSON_START_HOUR_MAX
  );
}

/** 可选的开始时间（日本时间的几点）：[8, 9, …, 21] */
export const LESSON_START_HOURS = Array.from(
  { length: LESSON_START_HOUR_MAX - LESSON_START_HOUR_MIN + 1 },
  (_, index) => LESSON_START_HOUR_MIN + index,
);
