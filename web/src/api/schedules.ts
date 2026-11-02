import type { WeeklySlot } from "@shared/schemas/schedule";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { invalidateAppData } from "@/lib/query-client";
import { api, parseResponse } from "./client";

export type ScheduleBoard = InferResponseType<
  (typeof api.relations)[":id"]["schedule-board"]["$get"]
>["board"];
export type BoardCell = ScheduleBoard["days"][number]["cells"][number];

// 排课画面的数据：GET /api/relations/:id/schedule-board?week=YYYY-MM-DD（日本时间）
export function useScheduleBoardQuery(relationId: number, week: string) {
  return useQuery({
    queryKey: ["schedule-board", relationId, week],
    queryFn: () =>
      parseResponse(
        api.relations[":id"]["schedule-board"].$get({
          param: { id: String(relationId) },
          query: { week },
        }),
      ),
    // 切换上一周、下一周时，新数据到达之前先显示原来的，画面不会闪
    placeholderData: keepPreviousData,
  });
}

// 保存每周课程：PUT /api/relations/:id/weekly-schedules
export function useSaveWeeklySchedulesMutation(relationId: number) {
  return useMutation({
    mutationFn: (slots: WeeklySlot[]) =>
      parseResponse(
        api.relations[":id"]["weekly-schedules"].$put({
          param: { id: String(relationId) },
          json: { slots },
        }),
      ),
    onSuccess: () => invalidateAppData(),
  });
}

// 添加单次课程：POST /api/relations/:id/lessons
export function useAddLessonMutation(relationId: number) {
  return useMutation({
    mutationFn: (startsAt: Date) =>
      parseResponse(
        api.relations[":id"].lessons.$post({
          param: { id: String(relationId) },
          json: { startsAt: startsAt.getTime() },
        }),
      ),
    onSuccess: () => invalidateAppData(),
  });
}
