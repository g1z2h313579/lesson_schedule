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

// 月历（周一开始）。格子做得大，方便点按
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
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon-lg"
          aria-label={t("calendar.prevMonth")}
          onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
        >
          <ChevronLeft className="size-6" />
        </Button>
        <h3 className="text-xl font-bold">{formatYearMonth(first, language)}</h3>
        <Button
          variant="outline"
          size="icon-lg"
          aria-label={t("calendar.nextMonth")}
          onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
        >
          <ChevronRight className="size-6" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm text-muted-foreground">
        {[1, 2, 3, 4, 5, 6, 7].map((weekday) => (
          <span key={weekday}>{formatWeekday(weekday, language, "narrow")}</span>
        ))}
        {/* 1 日之前的空白（用一个跨多列的格子占位） */}
        {leading > 0 && <span style={{ gridColumn: `span ${leading}` }} />}
        {days.map((date) => {
          const key = localDateKey(date);
          const isSelected = key === selected;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isSelected}
              aria-label={formatDate(date, language)}
              onClick={() => onSelect(key)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-lg text-foreground transition-colors",
                isSelected ? "bg-primary text-primary-foreground" : "active:bg-muted",
                key === todayKey && !isSelected && "ring-2 ring-primary ring-inset",
              )}
            >
              {date.getDate()}
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  marked.has(key)
                    ? isSelected
                      ? "bg-primary-foreground"
                      : "bg-primary"
                    : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
