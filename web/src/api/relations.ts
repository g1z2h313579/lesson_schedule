import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { api, parseResponse } from "./client";

// 师生关系列表的一项（含双方资料和统计）
export type RelationSummary = InferResponseType<typeof api.relations.$get>["relations"][number];
// 师生关系详情
export type RelationDetail = InferResponseType<(typeof api.relations)[":id"]["$get"]>["relation"];
// 用户的公开资料
export type Profile = RelationSummary["teacher"];
// 课程（列表中的一项）
export type LessonItem = InferResponseType<
  (typeof api.relations)[":id"]["lessons"]["$get"]
>["lessons"][number];

// 师生关系列表：GET /api/relations
export function useRelationsQuery() {
  return useQuery({
    queryKey: ["relations"],
    queryFn: () => parseResponse(api.relations.$get()),
  });
}

// 师生关系详情：GET /api/relations/:id
export function useRelationQuery(id: number) {
  return useQuery({
    queryKey: ["relation", id],
    queryFn: () => parseResponse(api.relations[":id"].$get({ param: { id: String(id) } })),
  });
}

// 即将上的课：GET /api/relations/:id/lessons?scope=upcoming
export function useUpcomingLessonsQuery(id: number) {
  return useQuery({
    queryKey: ["relation-lessons", id, "upcoming"],
    queryFn: () =>
      parseResponse(
        api.relations[":id"].lessons.$get({
          param: { id: String(id) },
          query: { scope: "upcoming" },
        }),
      ),
  });
}

// 已上的课（每次 20 条，可以继续加载）：GET /api/relations/:id/lessons?scope=past
export function usePastLessonsQuery(id: number) {
  return useInfiniteQuery({
    queryKey: ["relation-lessons", id, "past"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      parseResponse(
        api.relations[":id"].lessons.$get({
          param: { id: String(id) },
          query: pageParam === undefined ? { scope: "past" } : { scope: "past", before: pageParam },
        }),
      ),
    // 下一页从这一页最后一节课的开始时间之前开始
    getNextPageParam: (page) => {
      const last = page.lessons.at(-1);
      return page.hasMore && last ? String(new Date(last.startsAt).getTime()) : undefined;
    },
  });
}
