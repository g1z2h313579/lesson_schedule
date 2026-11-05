import { CalendarClock, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useRegisteredMe } from "@/api/me";
import { useRelationsQuery } from "@/api/relations";
import { QueryError } from "@/components/query-error";
import { EmptyState } from "@/components/section";
import { UserAvatar } from "@/components/user-avatar";
import { useLanguage } from "@/hooks/use-language";
import { formatDate, formatRelativeDay, formatTimeRange } from "@/lib/format";
import { lessonStateOf } from "@/lib/lesson-state";
import { partnerOf, peopleLabel } from "@/lib/relation";

// 首页上方的「下一节课」卡片（主题色）：所有关系中最近的一节课，点击进入课程详情
// 管理员优先显示自己参与的课
export function NextLessonCard() {
  const { t } = useTranslation();
  const language = useLanguage();
  const me = useRegisteredMe();
  const relations = useRelationsQuery();

  if (relations.isPending) {
    return <div className="h-40 animate-pulse rounded-2xl bg-card" />;
  }
  if (relations.isError) {
    return <QueryError error={relations.error} onRetry={() => relations.refetch()} />;
  }

  const all = relations.data.relations;
  const mine = all.filter((relation) => partnerOf(relation, me.id) !== null);
  const next = (mine.length > 0 ? mine : all)
    .flatMap((relation) =>
      relation.stats.nextLesson ? [{ relation, lesson: relation.stats.nextLesson }] : [],
    )
    .sort(
      (a, b) => new Date(a.lesson.startsAt).getTime() - new Date(b.lesson.startsAt).getTime(),
    )[0];

  if (!next) {
    return (
      <EmptyState
        icon={<CalendarClock className="size-6 shrink-0" aria-hidden />}
        text={t("home.noNextLesson")}
      />
    );
  }

  const startsAt = new Date(next.lesson.startsAt);
  const ongoing = lessonStateOf(next.lesson) === "ongoing";
  const partner = partnerOf(next.relation, me.id);
  return (
    <Link
      to={`/lessons/${next.lesson.id}`}
      className="flex flex-col gap-1 rounded-2xl bg-primary p-5 text-primary-foreground transition-opacity active:opacity-90"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-brand-soft">{t("home.nextLesson")}</span>
        <span className="rounded-full bg-white/15 px-3 py-0.5 text-sm font-bold">
          {ongoing ? t("lesson.state.ongoing") : formatRelativeDay(startsAt, language)}
        </span>
      </span>
      <span className="text-2xl font-bold">{formatDate(startsAt, language)}</span>
      <span className="text-xl">
        {formatTimeRange(startsAt, next.lesson.durationMinutes, language)}
      </span>
      <span className="mt-3 flex items-center gap-3 border-t border-white/20 pt-3">
        {partner && (
          <UserAvatar
            name={partner.name}
            pictureUrl={partner.pictureUrl}
            className="size-9 text-base"
          />
        )}
        <span className="min-w-0 flex-1 truncate text-lg">{peopleLabel(next.relation, me.id)}</span>
        <ChevronRight className="size-5 shrink-0 opacity-80" aria-hidden />
      </span>
    </Link>
  );
}
