import type { LessonStatus } from "@shared/constants/lesson";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { formatLessonTime } from "@/lib/format";
import { type LessonState, lessonStateOf } from "@/lib/lesson-state";
import { cn } from "@/lib/utils";

type LessonLike = {
  id: number;
  startsAt: string | Date;
  durationMinutes: number;
  status: LessonStatus;
};

// 课程的状态标签：上课中 / 已上 / 已取消（即将上的课不显示）
export function LessonStateBadge({ state }: { state: LessonState }) {
  const { t } = useTranslation();
  if (state === "upcoming") return null;
  return (
    <Badge
      variant={state === "ongoing" ? "default" : state === "cancelled" ? "outline" : "secondary"}
      className="text-sm"
    >
      {t(`lesson.state.${state}`)}
    </Badge>
  );
}

// 课程列表的一行：日期时间、状态、（可选）对方的名字。点击进入课程详情
export function LessonRow({ lesson, people }: { lesson: LessonLike; people?: string }) {
  const language = useLanguage();
  const state = lessonStateOf(lesson);

  return (
    <Link
      to={`/lessons/${lesson.id}`}
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors active:bg-muted",
        state === "cancelled" && "text-muted-foreground",
      )}
    >
      <span className="flex min-w-0 flex-col">
        <span className={cn("text-lg", state === "cancelled" && "line-through")}>
          {formatLessonTime(new Date(lesson.startsAt), lesson.durationMinutes, language)}
        </span>
        {people && <span className="truncate text-muted-foreground">{people}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <LessonStateBadge state={state} />
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
      </span>
    </Link>
  );
}
