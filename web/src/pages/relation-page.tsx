import { CalendarPlus, CalendarX2, Repeat } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { useRegisteredMe } from "@/api/me";
import {
  type Profile,
  usePastLessonsQuery,
  useRelationQuery,
  useUpcomingLessonsQuery,
} from "@/api/relations";
import { CreditSection } from "@/components/credit-section";
import { LessonRow } from "@/components/lesson-row";
import { LinkifiedText } from "@/components/linkified-text";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { EmptyState, ListGroup, Panel, Section } from "@/components/section";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/user-avatar";
import { useLanguage } from "@/hooks/use-language";
import { formatWeekday } from "@/lib/format";
import { partnerOf } from "@/lib/relation";

// 老师详情（学生看到）/ 学生详情（老师看到）：对方资料、统计、下一节课、每周课程、课时申请、课程列表
export function RelationPage() {
  const { t } = useTranslation();
  const language = useLanguage();
  const navigate = useNavigate();
  const me = useRegisteredMe();
  const relationId = Number(useParams().id);
  const relation = useRelationQuery(relationId);

  if (relation.isPending || relation.isError) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="" back="/members" />
        {relation.isPending ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <QueryError error={relation.error} onRetry={() => relation.refetch()} />
        )}
      </div>
    );
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
    <div className="flex flex-col gap-5">
      <PageHeader title={t(`relation.title.${partner?.role ?? "all"}`)} back="/members" />

      <Panel className="flex flex-col gap-4">
        {(partner ? [partner] : [detail.teacher, detail.student]).map((person) => (
          <ProfileBlock key={person.id} person={person} />
        ))}
      </Panel>

      <div className="grid grid-cols-3 divide-x rounded-2xl bg-card py-3 text-center">
        <Stat
          label={t("relation.done")}
          value={t("relation.lessonCount", { count: stats.doneCount })}
        />
        <Stat
          label={t("relation.remaining")}
          value={t("relation.creditCount", { count: stats.remainingCredits })}
          highlight
        />
        <Stat
          label={t("relation.total")}
          value={t("relation.creditCount", { count: stats.totalCredits })}
        />
      </div>

      <Section title={t("relation.nextLesson")}>
        {stats.nextLesson ? (
          <ListGroup>
            <LessonRow lesson={stats.nextLesson} />
          </ListGroup>
        ) : (
          <EmptyState
            icon={<CalendarX2 className="size-6 shrink-0" aria-hidden />}
            text={t("relation.noNextLesson")}
          />
        )}
      </Section>

      <Section title={t("relation.weekly")}>
        <Panel className="flex flex-col gap-4">
          <p className="flex items-start gap-3 text-lg">
            <Repeat className="mt-1 size-5 shrink-0 text-primary" aria-hidden />
            {weekly}
          </p>
          {/* 老师和学生都能排课（管理员只能查看） */}
          {myRole !== null && (
            <Button size="xl" onClick={() => navigate(`/relations/${relationId}/schedule`)}>
              <CalendarPlus aria-hidden />
              {t("relation.arrange")}
            </Button>
          )}
        </Panel>
      </Section>

      <CreditSection relation={detail} myRole={myRole} />

      <LessonLists relationId={relationId} />
    </div>
  );
}

// 资料：头像、名字、身份、自我介绍
function ProfileBlock({ person }: { person: Profile }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <UserAvatar
          name={person.name}
          pictureUrl={person.pictureUrl}
          className="size-16 text-2xl"
        />
        <div className="flex min-w-0 flex-col">
          <h2 className="text-2xl font-bold [overflow-wrap:anywhere]">{person.name}</h2>
          {person.role && (
            <span className="text-muted-foreground">{t(`roles.${person.role}`)}</span>
          )}
        </div>
      </div>
      {person.introduction && (
        <LinkifiedText
          text={person.introduction}
          className="rounded-xl bg-muted px-4 py-3 text-base"
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={
          highlight
            ? "text-xl font-bold whitespace-nowrap text-primary"
            : "text-xl font-bold whitespace-nowrap"
        }
      >
        {value}
      </span>
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
    <Section title={t("relation.lessons")}>
      <Tabs defaultValue="upcoming" className="gap-3">
        <TabsList className="w-full">
          <TabsTrigger value="upcoming">{t("relation.upcoming")}</TabsTrigger>
          <TabsTrigger value="past">{t("relation.past")}</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="flex flex-col gap-2">
          {upcoming.isError && (
            <QueryError error={upcoming.error} onRetry={() => upcoming.refetch()} />
          )}
          {upcoming.data?.lessons.length === 0 && <EmptyState text={t("relation.noLessons")} />}
          {upcoming.data && upcoming.data.lessons.length > 0 && (
            <ListGroup>
              {upcoming.data.lessons.map((lesson) => (
                <LessonRow key={lesson.id} lesson={lesson} />
              ))}
            </ListGroup>
          )}
        </TabsContent>
        <TabsContent value="past" className="flex flex-col gap-3">
          {past.isError && <QueryError error={past.error} onRetry={() => past.refetch()} />}
          {past.isSuccess && pastLessons.length === 0 && (
            <EmptyState text={t("relation.noLessons")} />
          )}
          {pastLessons.length > 0 && (
            <ListGroup>
              {pastLessons.map((lesson) => (
                <LessonRow key={lesson.id} lesson={lesson} />
              ))}
            </ListGroup>
          )}
          {past.hasNextPage && (
            <Button
              variant="outline"
              size="xl"
              disabled={past.isFetchingNextPage}
              onClick={() => past.fetchNextPage()}
            >
              {t("relation.loadMore")}
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </Section>
  );
}
