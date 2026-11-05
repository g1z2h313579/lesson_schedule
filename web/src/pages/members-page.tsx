import { CalendarClock, ChevronRight, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useRegisteredMe } from "@/api/me";
import { type RelationSummary, useRelationsQuery } from "@/api/relations";
import { InviteButton } from "@/components/invite-button";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { EmptyState, ListGroup } from "@/components/section";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { useLanguage } from "@/hooks/use-language";
import { formatMonthDay, formatTime } from "@/lib/format";
import { partnerOf, peopleLabel } from "@/lib/relation";

// 老师 / 学生列表（管理员为全部关系），上方是邀请按钮
export function MembersPage() {
  const { t } = useTranslation();
  const me = useRegisteredMe();
  const relations = useRelationsQuery();
  const title = me.isAdmin
    ? t("nav.all")
    : me.role === "teacher"
      ? t("nav.students")
      : t("nav.teachers");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={title} />
      <InviteButton />
      {relations.isPending && <p className="text-muted-foreground">{t("common.loading")}</p>}
      {relations.isError && (
        <QueryError error={relations.error} onRetry={() => relations.refetch()} />
      )}
      {relations.data?.relations.length === 0 && (
        <EmptyState
          icon={<Users className="size-6 shrink-0" aria-hidden />}
          text={t(`members.empty.${me.role}`)}
        />
      )}
      {relations.data && relations.data.relations.length > 0 && (
        <ListGroup>
          {relations.data.relations.map((relation) => (
            <MemberRow key={relation.id} relation={relation} />
          ))}
        </ListGroup>
      )}
    </div>
  );
}

// 列表中的一项：头像、名字、下一节课、剩余课时；老师看到待处理的课时申请标记
function MemberRow({ relation }: { relation: RelationSummary }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const me = useRegisteredMe();
  const partner = partnerOf(relation, me.id);
  const next = relation.stats.nextLesson;
  const nextStartsAt = next && new Date(next.startsAt);
  const showPending = relation.hasPendingCreditRequest && relation.teacher.id === me.id;

  return (
    <li>
      <Link
        to={`/relations/${relation.id}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-muted"
      >
        <UserAvatar
          name={partner?.name ?? relation.teacher.name}
          pictureUrl={partner?.pictureUrl ?? relation.teacher.pictureUrl}
          className="size-14"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2">
            <span className="truncate text-lg font-bold">{peopleLabel(relation, me.id)}</span>
            {showPending && <Badge variant="warning">{t("members.pendingRequest")}</Badge>}
          </span>
          {/* 下一节课：手机屏幕窄，只显示月日和开始时刻 */}
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarClock className="size-4 shrink-0" aria-hidden />
            <span className="truncate">
              {nextStartsAt
                ? `${formatMonthDay(nextStartsAt, language)} ${formatTime(nextStartsAt, language)}`
                : t("members.noNext")}
            </span>
          </span>
          <span className="text-muted-foreground">
            {t("members.remaining", { count: relation.stats.remainingCredits })}
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}
