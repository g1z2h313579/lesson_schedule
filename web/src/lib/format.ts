import type { LanguageCode } from "@/i18n";

// 日期时间的显示格式：按界面语言（日语 / 中文）和时区显示，时区默认为手机的时区
// 例：日语「11月5日(水) 13:00～13:50」、中文「11月5日 周三 13:00～13:50」
// 排课画面按日本时间显示时，传入 { timeZone: SCHEDULE_TIME_ZONE }

type FormatOptions = {
  timeZone?: string;
};

function intlLocale(language: LanguageCode): string {
  return language === "zh" ? "zh-CN" : "ja-JP";
}

/** 日期 + 星期：日语「11月5日(水)」、中文「11月5日 周三」 */
export function formatDate(
  date: Date,
  language: LanguageCode,
  options: FormatOptions = {},
): string {
  const locale = intlLocale(language);
  const { timeZone } = options;
  const monthDay = new Intl.DateTimeFormat(locale, { month: "long", day: "numeric", timeZone });
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone });
  return language === "zh"
    ? `${monthDay.format(date)} ${weekday.format(date)}`
    : `${monthDay.format(date)}(${weekday.format(date)})`;
}

/** 月日（不含星期）：「11月2日」 */
export function formatMonthDay(
  date: Date,
  language: LanguageCode,
  options: FormatOptions = {},
): string {
  return new Intl.DateTimeFormat(intlLocale(language), {
    month: "long",
    day: "numeric",
    timeZone: options.timeZone,
  }).format(date);
}

/** 时刻：「13:00」「8:00」（24 小时制） */
export function formatTime(
  date: Date,
  language: LanguageCode,
  options: FormatOptions = {},
): string {
  return new Intl.DateTimeFormat(intlLocale(language), {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: options.timeZone,
  }).format(date);
}

/** 课程的时间段：「13:00～13:50」 */
export function formatTimeRange(
  startsAt: Date,
  durationMinutes: number,
  language: LanguageCode,
  options: FormatOptions = {},
): string {
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  return `${formatTime(startsAt, language, options)}～${formatTime(endsAt, language, options)}`;
}

/** 课程的时间：日语「11月5日(水) 13:00～13:50」、中文「11月5日 周三 13:00～13:50」 */
export function formatLessonTime(
  startsAt: Date,
  durationMinutes: number,
  language: LanguageCode,
  options: FormatOptions = {},
): string {
  return `${formatDate(startsAt, language, options)} ${formatTimeRange(startsAt, durationMinutes, language, options)}`;
}

/** 时区的说明：「Asia/Tokyo (GMT+9:00)」（不指定时为手机的时区） */
export function formatTimeZone(timeZone?: string): string {
  const zone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offset =
    new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  // 「GMT+09:00」→「GMT+9:00」
  return `${zone} (${offset.replace(/([+-])0(\d)/, "$1$2")})`;
}

/** 年月：「2026年11月」 */
export function formatYearMonth(
  date: Date,
  language: LanguageCode,
  options: FormatOptions = {},
): string {
  return new Intl.DateTimeFormat(intlLocale(language), {
    year: "numeric",
    month: "long",
    timeZone: options.timeZone,
  }).format(date);
}

/**
 * 星期的名称（weekday：1 = 周一 … 7 = 周日）。
 * short：日语「月」、中文「周一」；narrow：日语「月」、中文「一」（格子较窄的表头使用）
 */
export function formatWeekday(
  weekday: number,
  language: LanguageCode,
  width: "short" | "narrow" = "short",
): string {
  // 2026-11-02 是周一，以它为基准取得星期的名称
  const date = new Date(Date.UTC(2026, 10, 1 + weekday, 3));
  return new Intl.DateTimeFormat(intlLocale(language), {
    weekday: width,
    timeZone: "UTC",
  }).format(date);
}

/** 离今天几天：「今天」「明天」「3 天后」「昨天」（按手机的时区计算日期） */
export function formatRelativeDay(date: Date, language: LanguageCode): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(date) - startOfDay(new Date())) / 86_400_000);
  return new Intl.RelativeTimeFormat(intlLocale(language), { numeric: "auto" }).format(days, "day");
}

/** 手机时区的日期「YYYY-MM-DD」（课程表中按日期分组用） */
export function localDateKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
