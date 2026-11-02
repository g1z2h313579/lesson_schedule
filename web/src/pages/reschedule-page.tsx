import { SCHEDULE_TIME_ZONE } from "@shared/lib/jst";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { useLessonQuery, useRescheduleLessonMutation } from "@/api/lessons";
import type { BoardCell } from "@/api/schedules";
import { BackButton } from "@/components/back-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { QueryError } from "@/components/query-error";
import { WeekSlotPicker } from "@/components/week-slot-picker";
import { useLanguage } from "@/hooks/use-language";
import { formatLessonTime } from "@/lib/format";

// 改时间（老师）：选择新的时段。原来的课取消，新建一节课（课时不变）
export function ReschedulePage() {
  const { t } = useTranslation();
  const language = useLanguage();
  const navigate = useNavigate();
  const lessonId = Number(useParams().id);
  const lesson = useLessonQuery(lessonId);
  const reschedule = useRescheduleLessonMutation(lessonId);
  const [target, setTarget] = useState<BoardCell | null>(null);

  if (lesson.isPending) return <p className="text-muted-foreground">{t("common.loading")}</p>;
  if (lesson.isError) return <QueryError error={lesson.error} onRetry={() => lesson.refetch()} />;

  const detail = lesson.data;
  const duration = detail.lesson.durationMinutes;
  const current = formatLessonTime(new Date(detail.lesson.startsAt), duration, language);

  return (
    <div className="flex flex-col gap-4">
      <BackButton fallback={`/lessons/${lessonId}`} />
      <h2 className="text-2xl font-bold">{t("lesson.reschedule")}</h2>
      <p className="text-lg">{t("lesson.currentTime", { time: current })}</p>
      {detail.permissions.canReschedule ? (
        <WeekSlotPicker relationId={detail.lesson.relationId} onPickFree={setTarget} />
      ) : (
        <p className="text-lg">{t("lesson.cannotReschedule")}</p>
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
