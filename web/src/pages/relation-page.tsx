import { CalendarPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { useRegisteredMe } from "@/api/me";
import {
  type Profile,
  usePastLessonsQuery,
  useRelationQuery,
  useUpcomingLessonsQuery,
} from "@/api/relations";
import { BackButton } from "@/components/back-button";
import { CreditSection } from "@/components/credit-section";
import { LessonRow } from "@/components/lesson-row";
import { LinkifiedText } from "@/components/linkified-text";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/user-avatar";
import { useLanguage } from "@/hooks/use-language";
import { formatWeekday } from "@/lib/format";
import { partnerOf } from "@/lib/relation";

// 老师详情（学生看到）/ 学生详情（老师看到）：对方资料、统计、每周课程、课时申请、课程列表
export function RelationPage() {
  const { t } = useTranslation();
  const language = useLanguage();
  const navigate = useNavigate();
  const me = useRegisteredMe();
  const relationId = Number(useParams().id);
  const relation = useRelationQuery(relationId);

  if (relation.isPending) return <p className="text-muted-foreground">{t("common.loading")}</p>;
  if (relation.isError) {
    return <QueryError error={relation.error} onRetry={() => relation.refetch()} />;
  }

  const detail = relation.data.relation;
  const partner = partnerOf(detail, me.id);
  const myRole =
    detail.teacher.id === me.id ? "teacher" : detail.student.id === me.id ? "student" : null;
  const { stats } = detail;
  const weekly =
    detail.weeklySlots.length === 0
      ? t("relation.weeklyNone")
      : detail.weeklySlots
          .map((slot) => `${formatWeekday(slot.weekday, language)} ${slot.startHour}:00`)
          .join("、");

  return (
    <div className="flex flex-col gap-8">
      <BackButton fallback="/members" />

      <section className="flex flex-col gap-4">
        {(partner ? [partner] : [detail.teacher, detail.student]).map((person) => (
          <ProfileCard key={person.id} person={person} />
        ))}
      </section>

      <section className="grid grid-cols-3 gap-2 text-center">
        <Stat
          label={t("relation.done")}
          value={t("relation.lessonCount", { count: stats.doneCount })}
        />
        <Stat
          label={t("relation.remaining")}
          value={t("relation.creditCount", { count: stats.remainingCredits })}
        />
        <Stat
          label={t("relation.total")}
          value={t("relation.creditCount", { count: stats.totalCredits })}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-xl font-bold">{t("relation.nextLesson")}</h3>
        {stats.nextLesson ? (
          <LessonRow lesson={stats.nextLesson} />
        ) : (
          <p className="text-muted-foreground">{t("relation.noNextLesson")}</p>
        )}
        <p className="text-lg">
          {t("relation.weekly")}：{weekly}
        </p>
        {myRole === "teacher" && (
          <Button
            className="h-12 text-lg"
            onClick={() => navigate(`/relations/${relationId}/schedule`)}
          >
            <CalendarPlus className="size-5" aria-hidden />
            {t("relation.arrange")}
          </Button>
        )}
      </section>

      <CreditSection relation={detail} myRole={myRole} />

      <LessonLists relationId={relationId} />
    </div>
  );
}

// 对方的资料：头像、名字、身份、自我介绍
function ProfileCard({ person }: { person: Profile }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <UserAvatar name={person.name} pictureUrl={person.pictureUrl} className="size-16" />
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold">{person.name}</h2>
          {person.role && (
            <span className="text-muted-foreground">{t(`roles.${person.role}`)}</span>
          )}
        </div>
      </div>
      {person.introduction && <LinkifiedText text={person.introduction} className="text-lg" />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-muted p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-lg font-bold whitespace-nowrap">{value}</span>
    </div>
  );
}

// 课程列表：「即将上的课」「已上的课」两个标签，已上的课可以继续加载
function LessonLists({ relationId }: { relationId: number }) {
  const { t } = useTranslation();
  const upcoming = useUpcomingLessonsQuery(relationId);
  const past = usePastLessonsQuery(relationId);
  const pastLessons = past.data?.pages.flatMap((page) => page.lessons) ?? [];

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xl font-bold">{t("relation.lessons")}</h3>
      <Tabs defaultValue="upcoming" className="gap-3">
        <TabsList className="h-12 w-full">
          <TabsTrigger value="upcoming" className="text-base">
            {t("relation.upcoming")}
          </TabsTrigger>
          <TabsTrigger value="past" className="text-base">
            {t("relation.past")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="flex flex-col gap-2">
          {upcoming.isError && (
            <QueryError error={upcoming.error} onRetry={() => upcoming.refetch()} />
          )}
          {upcoming.data?.lessons.length === 0 && (
            <p className="text-muted-foreground">{t("relation.noLessons")}</p>
          )}
          {upcoming.data?.lessons.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} />
          ))}
        </TabsContent>
        <TabsContent value="past" className="flex flex-col gap-2">
          {past.isError && <QueryError error={past.error} onRetry={() => past.refetch()} />}
          {past.isSuccess && pastLessons.length === 0 && (
            <p className="text-muted-foreground">{t("relation.noLessons")}</p>
          )}
          {pastLessons.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} />
          ))}
          {past.hasNextPage && (
            <Button
              variant="outline"
              className="h-12 text-lg"
              disabled={past.isFetchingNextPage}
              onClick={() => past.fetchNextPage()}
            >
              {t("relation.loadMore")}
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
