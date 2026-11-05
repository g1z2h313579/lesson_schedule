import {
  addDays,
  parseJstDateString,
  SCHEDULE_TIME_ZONE,
  startOfJstWeek,
  toJstDateString,
} from "@shared/lib/jst";
import { LESSON_START_HOURS } from "@shared/lib/lesson";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { type BoardCell, type ScheduleBoard, useScheduleBoardQuery } from "@/api/schedules";
import { QueryError } from "@/components/query-error";
import { Panel } from "@/components/section";
import { SlotGrid, type SlotView } from "@/components/slot-grid";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { formatMonthDay, formatTimeZone, formatWeekday } from "@/lib/format";

type Props = {
  relationId: number;
  // 点可选的时段
  onPickFree: (cell: BoardCell) => void;
  // 点这个关系已有的课（不传时已有的课不能点）
  onPickMine?: (cell: BoardCell) => void;
  // 可选的时段是否也不能点（例如剩余课时为 0 时不能加课）
  isFreeDisabled?: (board: ScheduleBoard) => boolean;
  // 时段表上方显示的内容（剩余课时等）
  renderHeader?: (board: ScheduleBoard) => ReactNode;
};

// 「单次课程」用的一周时段表（日本时间）：顶部切换上一周 / 下一周，点格子选择时段
// 添加单次课程、改时间共用
export function WeekSlotPicker({
  relationId,
  onPickFree,
  onPickMine,
  isFreeDisabled,
  renderHeader,
}: Props) {
  const { t } = useTranslation();
  const language = useLanguage();
  const thisWeek = toJstDateString(startOfJstWeek(new Date()));
  const [week, setWeek] = useState(thisWeek);
  const board = useScheduleBoardQuery(relationId, week);

  if (board.isPending) return <p className="text-muted-foreground">{t("common.loading")}</p>;
  if (board.isError) return <QueryError error={board.error} onRetry={() => board.refetch()} />;

  const data = board.data.board;
  const freeDisabled = isFreeDisabled?.(data) ?? false;
  const weekStart = parseJstDateString(data.weekStart) ?? new Date();
  const timeZone = { timeZone: SCHEDULE_TIME_ZONE };
  const cellsByDate = new Map(data.days.map((day) => [day.date, day.cells]));
  const findCell = (date: string, hour: number) =>
    cellsByDate.get(date)?.find((cell) => cell.hour === hour);

  const viewOf = (date: string, hour: number): SlotView => {
    const cell = findCell(date, hour);
    if (!cell) return "past";
    if (cell.state === "mine") return "selected";
    if (cell.state === "free" && freeDisabled) return "busy";
    return cell.state;
  };

  return (
    <div className="flex flex-col gap-4">
      {renderHeader?.(data)}
      <Panel className="flex flex-col gap-3 px-3 pt-2">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon-lg"
            className="size-11 rounded-full"
            aria-label={t("schedule.prevWeek")}
            disabled={data.weekStart <= thisWeek}
            onClick={() => setWeek(toJstDateString(addDays(weekStart, -7)))}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <span className="text-center text-lg font-bold">
            {formatMonthDay(weekStart, language, timeZone)}～
            {formatMonthDay(addDays(weekStart, 6), language, timeZone)}
          </span>
          <Button
            variant="ghost"
            size="icon-lg"
            className="size-11 rounded-full"
            aria-label={t("schedule.nextWeek")}
            onClick={() => setWeek(toJstDateString(addDays(weekStart, 7)))}
          >
            <ChevronRight className="size-6" />
          </Button>
        </div>
        <SlotGrid
          columns={data.days.map((day, index) => {
            const [, month, dayOfMonth] = day.date.split("-").map(Number);
            return {
              key: day.date,
              label: formatWeekday(index + 1, language, "narrow"),
              sublabel: `${month}/${dayOfMonth}`,
            };
          })}
          hours={LESSON_START_HOURS}
          viewOf={viewOf}
          selectedClickable={onPickMine !== undefined}
          onCellClick={(date, hour) => {
            const cell = findCell(date, hour);
            if (!cell) return;
            if (cell.state === "mine") onPickMine?.(cell);
            else if (cell.state === "free" && !freeDisabled) onPickFree(cell);
          }}
        />
        <p className="text-sm text-muted-foreground">
          {t("schedule.timeZone", { zone: formatTimeZone(SCHEDULE_TIME_ZONE) })}
        </p>
      </Panel>
    </div>
  );
}
