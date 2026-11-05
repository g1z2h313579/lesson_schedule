import { Check, Minus } from "lucide-react";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

// 格子的显示状态：可选 / 已选（这个关系的课）/ 老师或学生已有别的课 / 已过去
export type SlotView = "free" | "selected" | "busy" | "past";

type Props = {
  columns: { key: string; label: string; sublabel?: string }[];
  hours: number[];
  viewOf: (columnKey: string, hour: number) => SlotView;
  onCellClick: (columnKey: string, hour: number) => void;
  // 已选的格子能否点击（单次课程中点已有的课进入课程详情；改时间时不能点）
  selectedClickable?: boolean;
};

// 排课用的时段格子：左边一列是时间（只显示一次），右边 7 列是星期或日期
// 手机屏幕窄，格子不写文字，选中的打勾，不能选的显示为灰色
export function SlotGrid({ columns, hours, viewOf, onCellClick, selectedClickable = true }: Props) {
  return (
    <div className="grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))] gap-1">
      <span />
      {columns.map((column) => (
        <span key={column.key} className="text-center leading-tight">
          <span className="block font-bold">{column.label}</span>
          {column.sublabel && (
            <span className="block text-xs text-muted-foreground">{column.sublabel}</span>
          )}
        </span>
      ))}
      {hours.map((hour) => (
        <Fragment key={hour}>
          <span className="flex items-center justify-end pr-1 text-sm tabular-nums">{hour}:00</span>
          {columns.map((column) => {
            const view = viewOf(column.key, hour);
            const disabled =
              view === "busy" || view === "past" || (view === "selected" && !selectedClickable);
            return (
              <button
                key={column.key}
                type="button"
                disabled={disabled}
                aria-pressed={view === "selected"}
                aria-label={`${column.label}${column.sublabel ?? ""} ${hour}:00`}
                onClick={() => onCellClick(column.key, hour)}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-md border-2 transition-colors",
                  view === "free" && "border-border bg-background active:bg-muted",
                  view === "selected" && "border-primary bg-primary text-primary-foreground",
                  view === "busy" && "border-transparent bg-muted text-muted-foreground",
                  view === "past" && "border-transparent bg-muted/40",
                )}
              >
                {view === "selected" && <Check className="size-5" aria-hidden />}
                {view === "busy" && <Minus className="size-4" aria-hidden />}
              </button>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
