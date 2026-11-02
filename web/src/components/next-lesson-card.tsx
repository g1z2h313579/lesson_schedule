import { CalendarClock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useRegisteredMe } from "@/api/me";
import { useRelationsQuery } from "@/api/relations";
import { QueryError } from "@/components/query-error";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { formatLessonTime, formatRelativeDay } from "@/lib/format";
import { lessonStateOf } from "@/lib/lesson-state";
import { partnerOf, peopleLabel } from "@/lib/relation";

// 首页上方的「下一节课」卡片：所有关系中最近的一节课，点击进入课程详情
// 管理员优先显示自己参与的课
export function NextLessonCard() {
  const { t } = useTranslation();
  const language = useLanguage();
  const me = useRegisteredMe();
  const relations = useRelationsQuery();

  if (relations.isPending) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
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
      <Card>
        <CardContent className="flex items-center gap-3 text-lg text-muted-foreground">
          <CalendarClock className="size-6 shrink-0" aria-hidden />
          {t("home.noNextLesson")}
        </CardContent>
      </Card>
    );
  }

  const startsAt = new Date(next.lesson.startsAt);
  const ongoing = lessonStateOf(next.lesson) === "ongoing";
  return (
    <Link to={`/lessons/${next.lesson.id}`}>
      <Card className="transition-colors active:bg-muted">
        <CardContent className="flex flex-col gap-1">
          <span className="text-muted-foreground">
            {t("home.nextLesson")}（
            {ongoing ? t("lesson.state.ongoing") : formatRelativeDay(startsAt, language)}）
          </span>
          <span className="text-2xl font-bold">
            {formatLessonTime(startsAt, next.lesson.durationMinutes, language)}
          </span>
          <span className="text-lg">{peopleLabel(next.relation, me.id)}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
