// 日本时间（Asia/Tokyo）的计算：每周课程的时段、「每月最后一天」都按日本时间计算
// 日本固定为 UTC+9，没有夏令时，所以用固定的 9 小时换算即可，不需要时区库

export const SCHEDULE_TIME_ZONE = "Asia/Tokyo";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// 日本时间的各部分
export type JstParts = {
  year: number;
  // 1～12
  month: number;
  day: number;
  hour: number;
  minute: number;
  // 星期几：1 = 周一 … 7 = 周日
  weekday: number;
};

// 每周的一个时段（星期几 + 日本时间的几点）
export type WeeklySlot = {
  weekday: number;
  startHour: number;
};

/** 转为日本时间的年、月、日、时、分、星期 */
export function toJstParts(date: Date): JstParts {
  // 先加上 9 小时，再按 UTC 读取各部分，就是日本时间
  const shifted = new Date(date.getTime() + JST_OFFSET_MS);
  const dayOfWeek = shifted.getUTCDay();
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: dayOfWeek === 0 ? 7 : dayOfWeek,
  };
}

/** 日本时间的某年某月某日某时，转为 Date（月份为 1～12，超出范围时自动进位，例如 13 月为次年 1 月） */
export function fromJst(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - JST_OFFSET_MS);
}

/** date 所在日本时间月份的 1 日 0:00；monthOffset 为 1 时是下个月 1 日 0:00，以此类推 */
export function startOfJstMonth(date: Date, monthOffset = 0): Date {
  const { year, month } = toJstParts(date);
  return fromJst(year, month + monthOffset, 1);
}

/** 是否是日本时间每月的最后一天 */
export function isLastDayOfJstMonth(date: Date): boolean {
  return toJstParts(new Date(date.getTime() + DAY_MS)).day === 1;
}

/**
 * 自动排课的范围结束时间（不含）：
 * - 平时：排到本月底（返回下个月 1 日 0:00）
 * - 每月最后一天：排到下个月底（返回下下个月 1 日 0:00）
 */
export function scheduleHorizon(now: Date): Date {
  return startOfJstMonth(now, isLastDayOfJstMonth(now) ? 2 : 1);
}

/**
 * 每周时段在 from（不含）～ to（不含）之间对应的所有开始时间，按时间升序。
 * 返回值中带有对应的时段（rule），方便记下课程是由哪条规则生成的。
 */
export function weeklyOccurrences<T extends WeeklySlot>(
  rules: readonly T[],
  from: Date,
  to: Date,
): { rule: T; startsAt: Date }[] {
  const result: { rule: T; startsAt: Date }[] = [];
  const first = toJstParts(from);
  // 从 from 所在日的日本时间 0:00 开始，逐日检查（日本没有夏令时，每天固定 24 小时）
  for (
    let dayStart = fromJst(first.year, first.month, first.day);
    dayStart < to;
    dayStart = new Date(dayStart.getTime() + DAY_MS)
  ) {
    const { year, month, day, weekday } = toJstParts(dayStart);
    for (const rule of rules) {
      if (rule.weekday !== weekday) continue;
      const startsAt = fromJst(year, month, day, rule.startHour);
      if (startsAt > from && startsAt < to) {
        result.push({ rule, startsAt });
      }
    }
  }
  return result.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** 日本时间的日期「YYYY-MM-DD」 */
export function toJstDateString(date: Date): string {
  const { year, month, day } = toJstParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 「YYYY-MM-DD」（日本时间）当天的 0:00；不是有效日期时返回 null */
export function parseJstDateString(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = fromJst(Number(match[1]), Number(match[2]), Number(match[3]));
  // 2 月 30 日等不存在的日期会被进位成别的日期，换算回来不一致时视为无效
  return toJstDateString(date) === value ? date : null;
}

/** date 所在周的周一 0:00（日本时间） */
export function startOfJstWeek(date: Date): Date {
  const { year, month, day, weekday } = toJstParts(date);
  return fromJst(year, month, day - (weekday - 1));
}

/** 加上若干天（日本没有夏令时，每天固定 24 小时） */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}
