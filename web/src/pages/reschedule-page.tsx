import { SCHEDULE_TIME_ZONE } from "@shared/lib/jst";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { useLessonQuery, useRescheduleLessonMutation } from "@/api/lessons";
import type { BoardCell } from "@/api/schedules";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { Panel } from "@/components/section";
import { WeekSlotPicker } from "@/components/week-slot-picker";
import { useLanguage } from "@/hooks/use-language";
import { formatLessonTime } from "@/lib/format";

// 改时间（老师和学生）：选择新的时段。原来的课取消，新建一节课（课时不变）
export function ReschedulePage() {
  const { t } = useTranslation();
  const language = useLanguage();
  const navigate = useNavigate();
  const lessonId = Number(useParams().id);
  const lesson = useLessonQuery(lessonId);
  const reschedule = useRescheduleLessonMutation(lessonId);
  const [target, setTarget] = useState<BoardCell | null>(null);

  const header = <PageHeader title={t("lesson.reschedule")} back={`/lessons/${lessonId}`} />;
  if (lesson.isPending || lesson.isError) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        {lesson.isPending ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <QueryError error={lesson.error} onRetry={() => lesson.refetch()} />
        )}
      </div>
    );
  }

  const detail = lesson.data;
  const duration = detail.lesson.durationMinutes;
  const current = formatLessonTime(new Date(detail.lesson.startsAt), duration, language);

  return (
    <div className="flex flex-col gap-5">
      {header}
      <Panel className="text-lg">{t("lesson.currentTime", { time: current })}</Panel>
      {detail.permissions.canReschedule ? (
        <WeekSlotPicker relationId={detail.lesson.relationId} onPickFree={setTarget} />
      ) : (
        <Panel className="text-lg">{t("lesson.cannotReschedule")}</Panel>
      )}
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        title={t("lesson.confirm.reschedule.title")}
        description={
          target
            ? t("lesson.confirm.reschedule.description", {
                from: current,
                to: formatLessonTime(new Date(target.startsAt), duration, language, {
                  timeZone: SCHEDULE_TIME_ZONE,
                }),
              })
            : ""
        }
        confirmLabel={t("lesson.reschedule")}
        reasonLabel={t("lesson.reason")}
        pending={reschedule.isPending}
        error={reschedule.error}
        onConfirm={(reason) =>
          target &&
          reschedule.mutate(
            { startsAt: new Date(target.startsAt), reason },
            {
              onSuccess: ({ lesson: created }) => {
                toast.success(t("lesson.done.reschedule"));
                navigate(`/lessons/${created.id}`, { replace: true });
              },
            },
          )
        }
      />
    </div>
  );
}
