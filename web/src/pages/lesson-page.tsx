import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { useCancelLessonMutation, useLessonQuery } from "@/api/lessons";
import { useRegisteredMe } from "@/api/me";
import { BackButton } from "@/components/back-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LessonStateBadge } from "@/components/lesson-row";
import { MessageBoard } from "@/components/message-board";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useLanguage } from "@/hooks/use-language";
import { formatLessonTime } from "@/lib/format";
import { lessonStateOf } from "@/lib/lesson-state";
import { partnerOf } from "@/lib/relation";

// 课程详情：上课时间、对方、状态、操作按钮（请假 / 取消 / 改时间），下方是留言板
export function LessonPage() {
  const { t } = useTranslation();
  const language = useLanguage();
  const navigate = useNavigate();
  const me = useRegisteredMe();
  const lessonId = Number(useParams().id);
  const lesson = useLessonQuery(lessonId);
  const cancel = useCancelLessonMutation(lessonId);
  const [confirm, setConfirm] = useState<"leave" | "cancel" | null>(null);

  if (lesson.isPending) return <p className="text-muted-foreground">{t("common.loading")}</p>;
  if (lesson.isError) return <QueryError error={lesson.error} onRetry={() => lesson.refetch()} />;

  const detail = lesson.data;
  const { permissions } = detail;
  const startsAt = new Date(detail.lesson.startsAt);
  const state = lessonStateOf(detail.lesson);
  const partner = partnerOf(detail, me.id);
  const people = partner ? [partner] : [detail.teacher, detail.student];

  return (
    <div className="flex flex-col gap-6">
      <BackButton fallback={`/relations/${detail.lesson.relationId}`} />

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">
            {formatLessonTime(startsAt, detail.lesson.durationMinutes, language)}
          </h2>
          <LessonStateBadge state={state} />
        </div>
        {detail.rescheduledTo && (
          <Link
            to={`/lessons/${detail.rescheduledTo.id}`}
            className="rounded-lg bg-muted px-4 py-3 text-lg underline"
          >
            {t("lesson.rescheduledTo", {
              time: formatLessonTime(
                new Date(detail.rescheduledTo.startsAt),
                detail.lesson.durationMinutes,
                language,
              ),
            })}
          </Link>
        )}
        {detail.lesson.status === "cancelled" && detail.lesson.cancelReason && (
          <p className="text-muted-foreground">
            {t("lesson.reason")}：{detail.lesson.cancelReason}
          </p>
        )}
        <Link
          to={`/relations/${detail.lesson.relationId}`}
          className="flex flex-col gap-2 rounded-lg border p-3 active:bg-muted"
        >
          {people.map((person) => (
            <span key={person.id} className="flex items-center gap-3">
              <UserAvatar name={person.name} pictureUrl={person.pictureUrl} />
              <span className="text-lg">
                {person.name}
                <span className="ml-2 text-muted-foreground">
                  {person.role && t(`roles.${person.role}`)}
                </span>
              </span>
            </span>
          ))}
        </Link>
      </section>

      {(permissions.canLeave || permissions.canCancel || permissions.canReschedule) && (
        <section className="flex flex-col gap-3">
          {permissions.canLeave && (
            <Button variant="outline" className="h-12 text-lg" onClick={() => setConfirm("leave")}>
              {t("lesson.leave")}
            </Button>
          )}
          {permissions.canReschedule && (
            <Button
              variant="outline"
              className="h-12 text-lg"
              onClick={() => navigate(`/lessons/${lessonId}/reschedule`)}
            >
              {t("lesson.reschedule")}
            </Button>
          )}
          {permissions.canCancel && (
            <Button variant="outline" className="h-12 text-lg" onClick={() => setConfirm("cancel")}>
              {t("lesson.cancel")}
            </Button>
          )}
        </section>
      )}

      <MessageBoard detail={detail} />

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm ? t(`lesson.confirm.${confirm}.title`) : ""}
        description={confirm ? t(`lesson.confirm.${confirm}.description`) : ""}
        confirmLabel={confirm ? t(`lesson.${confirm}`) : ""}
        destructive
        reasonLabel={t("lesson.reason")}
        pending={cancel.isPending}
        error={cancel.error}
        onConfirm={(reason) =>
          confirm &&
          cancel.mutate(
            { action: confirm, reason },
            {
              onSuccess: () => {
                setConfirm(null);
                toast.success(t(`lesson.done.${confirm}`));
              },
            },
          )
        }
      />
    </div>
  );
}
