import type { CreateCreditRequestInput } from "@shared/schemas/credit-request";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { invalidateAppData } from "@/lib/query-client";
import { api, parseResponse } from "./client";

export type CreditRequestItem = InferResponseType<
  (typeof api.relations)[":id"]["credit-requests"]["$get"]
>["requests"][number];

// 课时申请记录：GET /api/relations/:id/credit-requests
export function useCreditRequestsQuery(relationId: number) {
  return useQuery({
    queryKey: ["credit-requests", relationId],
    queryFn: () =>
      parseResponse(
        api.relations[":id"]["credit-requests"].$get({ param: { id: String(relationId) } }),
      ),
  });
}

// 学生申请增加课时：POST /api/relations/:id/credit-requests
export function useCreateCreditRequestMutation(relationId: number) {
  return useMutation({
    mutationFn: (input: CreateCreditRequestInput) =>
      parseResponse(
        api.relations[":id"]["credit-requests"].$post({
          param: { id: String(relationId) },
          json: input,
        }),
      ),
    onSuccess: () => invalidateAppData(),
  });
}

// 处理课时申请：老师确认 / 拒绝，学生撤回
export function useDecideCreditRequestMutation() {
  return useMutation({
    mutationFn: async (
      input:
        | { id: number; action: "approve" }
        | { id: number; action: "withdraw" }
        | { id: number; action: "reject"; reason: string },
    ) => {
      const param = { id: String(input.id) };
      const endpoint = api["credit-requests"][":id"];
      if (input.action === "approve") return parseResponse(endpoint.approve.$post({ param }));
      if (input.action === "withdraw") return parseResponse(endpoint.withdraw.$post({ param }));
      return parseResponse(endpoint.reject.$post({ param, json: { reason: input.reason } }));
    },
    onSuccess: () => invalidateAppData(),
  });
}
