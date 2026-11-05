import { useMutation, useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { invalidateAppData } from "@/lib/query-client";
import { api, parseResponse } from "./client";

export type Invitation = InferResponseType<
  (typeof api.invitations)[":code"]["$get"],
  200
>["invitation"];

// 生成邀请码：POST /api/invitations
export function useCreateInvitationMutation() {
  return useMutation({
    mutationFn: () => parseResponse(api.invitations.$post()),
  });
}

// 查看邀请：GET /api/invitations/:code（邀请人资料、当前用户能否接受）
export function useInvitationQuery(code: string) {
  return useQuery({
    queryKey: ["invitation", code],
    queryFn: () => parseResponse(api.invitations[":code"].$get({ param: { code } })),
  });
}

// 接受邀请：POST /api/invitations/:code/accept
export function useAcceptInvitationMutation(code: string) {
  return useMutation({
    mutationFn: () => parseResponse(api.invitations[":code"].accept.$post({ param: { code } })),
    onSuccess: () => invalidateAppData(),
  });
}
