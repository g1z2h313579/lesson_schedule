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

/** 课程的时间：日语「11月5日(水) 13:00～13:50」、中文「11月5日 周三 13:00～13:50」 */
export function formatLessonTime(
  startsAt: Date,
  durationMinutes: number,
  language: LanguageCode,
  options: FormatOptions = {},
): string {
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  return `${formatDate(startsAt, language, options)} ${formatTime(startsAt, language, options)}～${formatTime(endsAt, language, options)}`;
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
