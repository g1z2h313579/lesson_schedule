import type { LessonStatus } from "@shared/constants/lesson";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { formatDate, formatTimeRange } from "@/lib/format";
import { type LessonState, lessonStateOf } from "@/lib/lesson-state";
import { cn } from "@/lib/utils";

type LessonLike = {
  id: number;
  startsAt: string | Date;
  durationMinutes: number;
  status: LessonStatus;
};

// 各状态的标签颜色：即将上课（蓝）/ 上课中（主题色）/ 已上（绿）/ 已取消（灰）
const STATE_BADGE = {
  upcoming: "info",
  ongoing: "default",
  done: "success",
  cancelled: "muted",
} as const;

// 各状态在列表左侧显示的竖线颜色
const STATE_BAR = {
  upcoming: "bg-ring",
  ongoing: "bg-primary",
  done: "bg-success-foreground/40",
  cancelled: "bg-border",
} as const;

// 课程的状态标签
export function LessonStateBadge({ state }: { state: LessonState }) {
  const { t } = useTranslation();
  return <Badge variant={STATE_BADGE[state]}>{t(`lesson.state.${state}`)}</Badge>;
}

type Props = {
  lesson: LessonLike;
  // 第二行显示的人名（不传时第二行显示时间段）
  people?: string;
  // true：同一天的课（课程表中），第一行显示时间段；false：第一行显示日期
  sameDay?: boolean;
};

// 课程列表的一项（放在 ListGroup 中）：时间、对方的名字、状态。点击进入课程详情
export function LessonRow({ lesson, people, sameDay = false }: Props) {
  const language = useLanguage();
  const state = lessonStateOf(lesson);
  const startsAt = new Date(lesson.startsAt);
  const cancelled = state === "cancelled";
  const timeRange = formatTimeRange(startsAt, lesson.durationMinutes, language);

  return (
    <li>
      <Link
        to={`/lessons/${lesson.id}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-muted"
      >
        <span className={cn("w-1 self-stretch rounded-full", STATE_BAR[state])} aria-hidden />
        <span className={cn("flex min-w-0 flex-1 flex-col", cancelled && "text-muted-foreground")}>
          <span className={cn("truncate text-lg font-bold", cancelled && "line-through")}>
            {sameDay ? timeRange : formatDate(startsAt, language)}
          </span>
          <span className="truncate text-muted-foreground">{people ?? timeRange}</span>
        </span>
        {/* 列表中「即将上课」只用左边的竖线表示，标签太多会显得杂乱 */}
        {state !== "upcoming" && <LessonStateBadge state={state} />}
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}
