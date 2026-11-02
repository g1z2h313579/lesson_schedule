import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { invalidateAppData } from "@/lib/query-client";
import { api, parseResponse } from "./client";

export type CalendarLesson = InferResponseType<typeof api.lessons.$get>["lessons"][number];
export type LessonDetail = InferResponseType<(typeof api.lessons)[":id"]["$get"]>;
export type MessageItem = InferResponseType<
  (typeof api.lessons)[":id"]["messages"]["$get"]
>["messages"][number];

// 课程表：GET /api/lessons?from&to（from ～ to 之间开始的课）
export function useLessonsInRangeQuery(from: Date, to: Date) {
  return useQuery({
    queryKey: ["lessons", from.getTime(), to.getTime()],
    queryFn: () =>
      parseResponse(
        api.lessons.$get({
          query: { from: String(from.getTime()), to: String(to.getTime()) },
        }),
      ),
    // 切换月份时，新数据到达之前先显示原来的
    placeholderData: keepPreviousData,
  });
}

// 课程详情：GET /api/lessons/:id
export function useLessonQuery(id: number) {
  return useQuery({
    queryKey: ["lesson", id],
    queryFn: () => parseResponse(api.lessons[":id"].$get({ param: { id: String(id) } })),
  });
}

// 请假（学生）、取消（老师）
export function useCancelLessonMutation(lessonId: number) {
  return useMutation({
    mutationFn: ({ action, reason }: { action: "leave" | "cancel"; reason: string }) => {
      const param = { id: String(lessonId) };
      const json = { reason };
      return parseResponse(
        action === "leave"
          ? api.lessons[":id"].leave.$post({ param, json })
          : api.lessons[":id"].cancel.$post({ param, json }),
      );
    },
    onSuccess: () => invalidateAppData(),
  });
}

// 改时间（老师）：POST /api/lessons/:id/reschedule
export function useRescheduleLessonMutation(lessonId: number) {
  return useMutation({
    mutationFn: ({ startsAt, reason }: { startsAt: Date; reason: string }) =>
      parseResponse(
        api.lessons[":id"].reschedule.$post({
          param: { id: String(lessonId) },
          json: { startsAt: startsAt.getTime(), reason },
        }),
      ),
    onSuccess: () => invalidateAppData(),
  });
}

// 留言列表：GET /api/lessons/:id/messages（打开期间每 30 秒刷新一次）
export function useMessagesQuery(lessonId: number) {
  return useQuery({
    queryKey: ["messages", lessonId],
    queryFn: () =>
      parseResponse(api.lessons[":id"].messages.$get({ param: { id: String(lessonId) } })),
    refetchInterval: 30_000,
  });
}

// 发留言：POST /api/lessons/:id/messages
export function usePostMessageMutation(lessonId: number) {
  return useMutation({
    mutationFn: (body: string) =>
      parseResponse(
        api.lessons[":id"].messages.$post({ param: { id: String(lessonId) }, json: { body } }),
      ),
    onSuccess: () => invalidateAppData(),
  });
}

// 删除自己的留言：DELETE /api/messages/:id
export function useDeleteMessageMutation() {
  return useMutation({
    mutationFn: (messageId: number) =>
      parseResponse(api.messages[":id"].$delete({ param: { id: String(messageId) } })),
    onSuccess: () => invalidateAppData(),
  });
}
