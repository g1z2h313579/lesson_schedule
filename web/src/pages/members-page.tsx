import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useRegisteredMe } from "@/api/me";
import { type RelationSummary, useRelationsQuery } from "@/api/relations";
import { InviteButton } from "@/components/invite-button";
import { QueryError } from "@/components/query-error";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { useLanguage } from "@/hooks/use-language";
import { formatLessonTime } from "@/lib/format";
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
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      <InviteButton />
      {relations.isPending && <p className="text-muted-foreground">{t("common.loading")}</p>}
      {relations.isError && (
        <QueryError error={relations.error} onRetry={() => relations.refetch()} />
      )}
      {relations.data?.relations.length === 0 && (
        <p className="text-lg text-muted-foreground">{t(`members.empty.${me.role}`)}</p>
      )}
      <ul className="flex flex-col gap-3">
        {relations.data?.relations.map((relation) => (
          <li key={relation.id}>
            <MemberCard relation={relation} />
          </li>
        ))}
      </ul>
    </div>
  );
}

// 列表中的一项：头像、名字、下一节课、剩余课时；老师看到待处理的课时申请标记
function MemberCard({ relation }: { relation: RelationSummary }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const me = useRegisteredMe();
  const partner = partnerOf(relation, me.id);
  const next = relation.stats.nextLesson;
  const showPending = relation.hasPendingCreditRequest && relation.teacher.id === me.id;

  return (
    <Link
      to={`/relations/${relation.id}`}
      className="flex items-center gap-4 rounded-xl border p-4 transition-colors active:bg-muted"
    >
      <UserAvatar
        name={partner?.name ?? relation.teacher.name}
        pictureUrl={partner?.pictureUrl ?? relation.teacher.pictureUrl}
        className="size-14"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-xl font-bold [overflow-wrap:anywhere]">
            {peopleLabel(relation, me.id)}
          </span>
          {showPending && <Badge className="text-sm">{t("members.pendingRequest")}</Badge>}
        </span>
        <span className="text-muted-foreground">
          {next
            ? t("members.next", {
                time: formatLessonTime(new Date(next.startsAt), next.durationMinutes, language),
              })
            : t("members.noNext")}
        </span>
        <span className="text-muted-foreground">
          {t("members.remaining", { count: relation.stats.remainingCredits })}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
