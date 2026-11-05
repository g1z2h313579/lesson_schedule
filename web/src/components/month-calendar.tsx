import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { formatDate, formatWeekday, formatYearMonth, localDateKey } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  // 显示的月份（该月任意一天，按手机的时区）
  month: Date;
  // 选中的日期（YYYY-MM-DD）
  selected: string;
  // 有课的日期（YYYY-MM-DD），日期下方显示圆点
  marked: Set<string>;
  onSelect: (dateKey: string) => void;
  onMonthChange: (month: Date) => void;
};

// 月历（周一开始，放在白色卡片中）。选中的日期为主题色的圆，今天的数字为主题色
export function MonthCalendar({ month, selected, marked, onSelect, onMonthChange }: Props) {
  const { t } = useTranslation();
  const language = useLanguage();
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = new Date(year, monthIndex, 1);
  // 1 日前面空几格（周一开始）
  const leading = (first.getDay() + 6) % 7;
  const days = Array.from(
    { length: new Date(year, monthIndex + 1, 0).getDate() },
    (_, index) => new Date(year, monthIndex, index + 1),
  );
  const todayKey = localDateKey(new Date());

  return (
    <section className="flex flex-col gap-2 rounded-2xl bg-card px-3 pt-2 pb-3">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon-lg"
          className="size-11 rounded-full"
          aria-label={t("calendar.prevMonth")}
          onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
        >
          <ChevronLeft className="size-6" />
        </Button>
        <h2 className="text-lg font-bold">{formatYearMonth(first, language)}</h2>
        <Button
          variant="ghost"
          size="icon-lg"
          className="size-11 rounded-full"
          aria-label={t("calendar.nextMonth")}
          onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
        >
          <ChevronRight className="size-6" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {[1, 2, 3, 4, 5, 6, 7].map((weekday) => (
          <span key={weekday} className="pb-1 text-sm text-muted-foreground">
            {formatWeekday(weekday, language, "narrow")}
          </span>
        ))}
        {/* 1 日之前的空白（用一个跨多列的格子占位） */}
        {leading > 0 && <span style={{ gridColumn: `span ${leading}` }} />}
        {days.map((date) => {
          const key = localDateKey(date);
          const isSelected = key === selected;
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isSelected}
              aria-label={formatDate(date, language)}
              onClick={() => onSelect(key)}
              className="flex flex-col items-center gap-0.5 py-0.5"
            >
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-full text-lg tabular-nums transition-colors",
                  isSelected
                    ? "bg-primary font-bold text-primary-foreground"
                    : isToday
                      ? "font-bold text-primary"
                      : "active:bg-muted",
                )}
              >
                {date.getDate()}
              </span>
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  marked.has(key) ? "bg-ring" : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
