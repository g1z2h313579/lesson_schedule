import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useLessonsInRangeQuery } from "@/api/lessons";
import { useRegisteredMe } from "@/api/me";
import { useRelationsQuery } from "@/api/relations";
import { LessonRow } from "@/components/lesson-row";
import { MonthCalendar } from "@/components/month-calendar";
import { NextLessonCard } from "@/components/next-lesson-card";
import { QueryError } from "@/components/query-error";
import { useLanguage } from "@/hooks/use-language";
import { formatDate, localDateKey } from "@/lib/format";
import { peopleLabel } from "@/lib/relation";

// 首页（课程表）：下一节课、待处理的课时申请提示、月历和选中日期的课（按手机的时区显示）
export function HomePage() {
  const { t } = useTranslation();
  const language = useLanguage();
  const me = useRegisteredMe();
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => localDateKey(new Date()));
  const from = new Date(month.getFullYear(), month.getMonth(), 1);
  const to = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const lessons = useLessonsInRangeQuery(from, to);
  const relations = useRelationsQuery();

  const allLessons = lessons.data?.lessons ?? [];
  const marked = new Set(
    allLessons
      .filter((lesson) => lesson.status === "scheduled")
      .map((lesson) => localDateKey(new Date(lesson.startsAt))),
  );
  const dayLessons = allLessons.filter(
    (lesson) => localDateKey(new Date(lesson.startsAt)) === selected,
  );
  // 老师：有学生在等待确认的课时申请
  const pendingCount =
    relations.data?.relations.filter(
      (relation) => relation.hasPendingCreditRequest && relation.teacher.id === me.id,
    ).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <NextLessonCard />
      {pendingCount > 0 && (
        <Link to="/members" className="rounded-xl border-2 border-primary p-4 text-lg font-bold">
          {t("home.pendingRequests", { count: pendingCount })}
        </Link>
      )}
      <MonthCalendar
        month={month}
        selected={selected}
        marked={marked}
        onSelect={setSelected}
        onMonthChange={(next) => {
          setMonth(next);
          // 回到本月时选中今天，其他月份选中 1 日
          const today = new Date();
          setSelected(
            localDateKey(
              next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth()
                ? today
                : next,
            ),
          );
        }}
      />
      <section className="flex flex-col gap-3">
        <h3 className="text-xl font-bold">
          {formatDate(new Date(`${selected}T00:00:00`), language)}
        </h3>
        {lessons.isError && <QueryError error={lessons.error} onRetry={() => lessons.refetch()} />}
        {lessons.isSuccess && dayLessons.length === 0 && (
          <p className="text-muted-foreground">{t("home.noLessonsOnDay")}</p>
        )}
        {dayLessons.map((lesson) => (
          <LessonRow key={lesson.id} lesson={lesson} people={peopleLabel(lesson, me.id)} />
        ))}
      </section>
    </div>
  );
}
