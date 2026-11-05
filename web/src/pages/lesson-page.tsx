import {
  ArrowRight,
  CalendarClock,
  ChevronRight,
  CircleSlash,
  MessageSquareText,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { useCancelLessonMutation, useLessonQuery } from "@/api/lessons";
import { useRegisteredMe } from "@/api/me";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LessonStateBadge } from "@/components/lesson-row";
import { MessageBoard } from "@/components/message-board";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { Panel } from "@/components/section";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useLanguage } from "@/hooks/use-language";
import { formatDate, formatLessonTime, formatTimeRange } from "@/lib/format";
import { lessonStateOf } from "@/lib/lesson-state";
import { partnerOf } from "@/lib/relation";

// 课程详情：上课时间、状态、对方、操作按钮（改时间 / 取消，老师和学生相同），下方是留言板
export function LessonPage() {
  const { t } = useTranslation();
  const language = useLanguage();
  const navigate = useNavigate();
  const me = useRegisteredMe();
  const lessonId = Number(useParams().id);
  const lesson = useLessonQuery(lessonId);
  const cancel = useCancelLessonMutation(lessonId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (lesson.isPending || lesson.isError) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title={t("lesson.title")} back="/" />
        {lesson.isPending ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <QueryError error={lesson.error} onRetry={() => lesson.refetch()} />
        )}
      </div>
    );
  }

  const detail = lesson.data;
  const { permissions } = detail;
  const startsAt = new Date(detail.lesson.startsAt);
  const state = lessonStateOf(detail.lesson);
  const partner = partnerOf(detail, me.id);
  const people = partner ? [partner] : [detail.teacher, detail.student];

  return (
    <div className="flex flex-1 flex-col gap-5">
      <PageHeader title={t("lesson.title")} back={`/relations/${detail.lesson.relationId}`} />

      <Panel className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <h2 className="text-2xl font-bold">{formatDate(startsAt, language)}</h2>
            <span className="text-xl text-muted-foreground">
              {formatTimeRange(startsAt, detail.lesson.durationMinutes, language)}
            </span>
          </div>
          <LessonStateBadge state={state} />
        </div>

        {detail.rescheduledTo && (
          <Link
            to={`/lessons/${detail.rescheduledTo.id}`}
            className="flex items-center gap-3 rounded-xl bg-info px-4 py-3 text-info-foreground active:opacity-80"
          >
            <CalendarClock className="size-5 shrink-0" aria-hidden />
            <span className="flex-1">
              {t("lesson.rescheduledTo", {
                time: formatLessonTime(
                  new Date(detail.rescheduledTo.startsAt),
                  detail.lesson.durationMinutes,
                  language,
                ),
              })}
            </span>
            <ArrowRight className="size-5 shrink-0" aria-hidden />
          </Link>
        )}
        {detail.lesson.status === "cancelled" && detail.lesson.cancelReason && (
          <p className="flex items-start gap-3 rounded-xl bg-muted px-4 py-3">
            <MessageSquareText
              className="mt-0.5 size-5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span>
              {t("lesson.reason")}：{detail.lesson.cancelReason}
            </span>
          </p>
        )}

        <Link
          to={`/relations/${detail.lesson.relationId}`}
          className="-mx-4 flex flex-col gap-3 border-t px-4 pt-4 active:bg-muted"
        >
          {people.map((person) => (
            <span key={person.id} className="flex items-center gap-3">
              <UserAvatar name={person.name} pictureUrl={person.pictureUrl} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-lg font-bold">{person.name}</span>
                <span className="text-muted-foreground">
                  {person.role && t(`roles.${person.role}`)}
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            </span>
          ))}
        </Link>

        {(permissions.canCancel || permissions.canReschedule) && (
          <div className="grid grid-cols-2 gap-3">
            {permissions.canReschedule && (
              <Button
                variant="soft"
                size="xl"
                className="px-2"
                onClick={() => navigate(`/lessons/${lessonId}/reschedule`)}
              >
                <CalendarClock aria-hidden />
                {t("lesson.rescheduleShort")}
              </Button>
            )}
            {permissions.canCancel && (
              <Button
                variant="destructive"
                size="xl"
                className="px-2"
                onClick={() => setConfirmOpen(true)}
              >
                <CircleSlash aria-hidden />
                {t("lesson.cancelShort")}
              </Button>
            )}
          </div>
        )}
      </Panel>

      <MessageBoard detail={detail} />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("lesson.confirm.cancel.title")}
        description={t("lesson.confirm.cancel.description")}
        confirmLabel={t("lesson.cancel")}
        destructive
        reasonLabel={t("lesson.reason")}
        pending={cancel.isPending}
        error={cancel.error}
        onConfirm={(reason) =>
          cancel.mutate(reason, {
            onSuccess: () => {
              setConfirmOpen(false);
              toast.success(t("lesson.done.cancel"));
            },
          })
        }
      />
    </div>
  );
}
