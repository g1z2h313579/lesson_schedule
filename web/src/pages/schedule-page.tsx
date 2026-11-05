import { LESSON_DURATION_MINUTES } from "@shared/constants/lesson";
import { SCHEDULE_TIME_ZONE, startOfJstWeek, toJstDateString } from "@shared/lib/jst";
import { LESSON_START_HOURS } from "@shared/lib/lesson";
import type { WeeklySlot } from "@shared/schemas/schedule";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { useRegisteredMe } from "@/api/me";
import { useRelationQuery } from "@/api/relations";
import {
  type BoardCell,
  useAddLessonMutation,
  useSaveWeeklySchedulesMutation,
  useScheduleBoardQuery,
} from "@/api/schedules";
import { BackButton } from "@/components/back-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { QueryError } from "@/components/query-error";
import { SlotGrid, type SlotView } from "@/components/slot-grid";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeekSlotPicker } from "@/components/week-slot-picker";
import { useLanguage } from "@/hooks/use-language";
import { formatLessonTime, formatTimeZone, formatWeekday } from "@/lib/format";
import { partnerOf } from "@/lib/relation";

const slotKey = (slot: WeeklySlot) => `${slot.weekday}-${slot.startHour}`;
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

// 排课（这个关系中的老师和学生都能打开，操作相同）：「每周课程」「单次课程」两个标签，时间按日本时间
export function SchedulePage() {
  const { t } = useTranslation();
  const me = useRegisteredMe();
  const relationId = Number(useParams().id);
  const relation = useRelationQuery(relationId);

  if (relation.isPending) return <p className="text-muted-foreground">{t("common.loading")}</p>;
  if (relation.isError) {
    return <QueryError error={relation.error} onRetry={() => relation.refetch()} />;
  }
  // 对方（自己不在这个关系中时为 null：管理员只能查看，不能排课）
  const partner = partnerOf(relation.data.relation, me.id);

  return (
    <div className="flex flex-col gap-4">
      <BackButton fallback={`/relations/${relationId}`} />
      {partner === null ? (
        <p className="text-lg">{t("schedule.membersOnly")}</p>
      ) : (
        <>
          <h2 className="text-2xl font-bold">{t("schedule.title", { name: partner.name })}</h2>
          <Tabs defaultValue="weekly" className="gap-4">
            <TabsList className="h-12 w-full">
              <TabsTrigger value="weekly" className="text-base">
                {t("schedule.weekly")}
              </TabsTrigger>
              <TabsTrigger value="single" className="text-base">
                {t("schedule.single")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="weekly">
              <WeeklyEditor relationId={relationId} />
            </TabsContent>
            <TabsContent value="single">
              <SingleEditor relationId={relationId} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

// 每周课程：点格子选中 / 取消，选好后保存（保存后马上排好本月剩下的课）
function WeeklyEditor({ relationId }: { relationId: number }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const thisWeek = toJstDateString(startOfJstWeek(new Date()));
  const board = useScheduleBoardQuery(relationId, thisWeek);
  const save = useSaveWeeklySchedulesMutation(relationId);
  // 编辑中的时段（null 表示还没改过，使用已保存的时段）
  const [editing, setEditing] = useState<Set<string> | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (board.isPending) return <p className="text-muted-foreground">{t("common.loading")}</p>;
  if (board.isError) return <QueryError error={board.error} onRetry={() => board.refetch()} />;

  const { weekly } = board.data.board;
  const savedKeys = new Set(weekly.slots.map(slotKey));
  const selected = editing ?? savedKeys;
  const busyKeys = new Set(weekly.busy.map(slotKey));
  const changed =
    selected.size !== savedKeys.size || [...selected].some((key) => !savedKeys.has(key));
  const selectedSlots = WEEKDAYS.flatMap((weekday) =>
    LESSON_START_HOURS.filter((hour) => selected.has(`${weekday}-${hour}`)).map((startHour) => ({
      weekday,
      startHour,
    })),
  );
  const summary =
    selectedSlots.length === 0
      ? t("schedule.weeklyNone")
      : selectedSlots
          .map((slot) => `${formatWeekday(slot.weekday, language)} ${slot.startHour}:00`)
          .join("、");

  const viewOf = (weekday: string, hour: number): SlotView => {
    const key = `${weekday}-${hour}`;
    if (selected.has(key)) return "selected";
    return busyKeys.has(key) ? "busy" : "free";
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">{t("schedule.weeklyHint")}</p>
      <SlotGrid
        columns={WEEKDAYS.map((weekday) => ({
          key: String(weekday),
          label: formatWeekday(weekday, language, "narrow"),
        }))}
        hours={LESSON_START_HOURS}
        viewOf={viewOf}
        onCellClick={(weekday, hour) => {
          const next = new Set(selected);
          const key = `${weekday}-${hour}`;
          if (next.has(key)) next.delete(key);
          else next.add(key);
          setEditing(next);
        }}
      />
      <p className="text-sm text-muted-foreground">
        {t("schedule.timeZone", { zone: formatTimeZone(SCHEDULE_TIME_ZONE) })}
      </p>
      <div className="flex flex-col gap-2 rounded-xl border p-3">
        <p className="text-lg">
          {t("schedule.weeklySummary", { count: selectedSlots.length })}：{summary}
        </p>
        <Button className="h-12 text-lg" disabled={!changed} onClick={() => setConfirmOpen(true)}>
          {t("schedule.save")}
        </Button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("schedule.confirmWeekly.title")}
        description={
          <>
            {summary}
            <br />
            {t("schedule.confirmWeekly.description")}
          </>
        }
        confirmLabel={t("schedule.save")}
        pending={save.isPending}
        error={save.error}
        onConfirm={() =>
          save.mutate(selectedSlots, {
            onSuccess: (result) => {
              setConfirmOpen(false);
              setEditing(null);
              toast.success(t("schedule.weeklySaved", { count: result.createdLessons }));
            },
          })
        }
      />
    </div>
  );
}

// 单次课程：一周一周地显示，点可选的时段加一节课；点已有的课进入课程详情
function SingleEditor({ relationId }: { relationId: number }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const navigate = useNavigate();
  const add = useAddLessonMutation(relationId);
  const [target, setTarget] = useState<BoardCell | null>(null);

  return (
    <>
      <WeekSlotPicker
        relationId={relationId}
        // 剩余课时为 0 时不能再加课
        isFreeDisabled={(board) => board.remainingCredits <= 0}
        renderHeader={(board) => (
          <div className="flex flex-col gap-1">
            <p className="text-lg">{t("schedule.remaining", { count: board.remainingCredits })}</p>
            {board.remainingCredits <= 0 && (
              <p className="text-destructive">{t("schedule.noCredits")}</p>
            )}
          </div>
        )}
        onPickFree={setTarget}
        onPickMine={(cell) => cell.lessonId !== null && navigate(`/lessons/${cell.lessonId}`)}
      />
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        title={t("schedule.confirmSingle.title")}
        description={
          target
            ? formatLessonTime(new Date(target.startsAt), LESSON_DURATION_MINUTES, language, {
                timeZone: SCHEDULE_TIME_ZONE,
              })
            : ""
        }
        confirmLabel={t("schedule.addLesson")}
        pending={add.isPending}
        error={add.error}
        onConfirm={() =>
          target &&
          add.mutate(new Date(target.startsAt), {
            onSuccess: () => {
              setTarget(null);
              toast.success(t("schedule.lessonAdded"));
            },
          })
        }
      />
    </>
  );
}
