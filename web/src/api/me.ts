import { LINE_ACCESS_TOKEN_HEADER } from "@shared/constants/headers";
import type { UserRole } from "@shared/constants/user";
import type { RegistrationInput, UpdateProfileInput } from "@shared/schemas/me";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { getAccessToken } from "@/lib/liff";
import { api, parseResponse } from "./client";

// 当前登录用户（GET /api/me 返回的 user）
export type Me = InferResponseType<typeof api.me.$get>["user"];

// 已完成首次设置的当前用户（身份和名字一定有值）
export type RegisteredMe = Me & { role: UserRole; name: string };

const ME_QUERY_KEY = ["me"];

// 当前登录用户：GET /api/me
// 附带 access token，后端据此同步 LINE 昵称和头像（只有这个接口需要）
export function useMeQuery() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: () => {
      const accessToken = getAccessToken();
      return parseResponse(
        api.me.$get(undefined, {
          headers: accessToken ? { [LINE_ACCESS_TOKEN_HEADER]: accessToken } : {},
        }),
      );
    },
  });
}

/**
 * 在 RequireRegistered 之下的页面中使用：返回已完成首次设置的当前用户。
 * RequireRegistered 保证了此时数据已加载、且已完成首次设置。
 */
export function useRegisteredMe(): RegisteredMe {
  const user = useMeQuery().data?.user;
  if (!user?.registered || user.role === null || user.name === null) {
    throw new Error("useRegisteredMe 只能在 RequireRegistered 之下使用");
  }
  return { ...user, role: user.role, name: user.name };
}

// 首次设置：POST /api/me/registration
// 返回格式与 GET /api/me 相同，成功后直接更新缓存（页面随之跳转到首次设置之后的页面）
export function useRegisterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegistrationInput) =>
      parseResponse(api.me.registration.$post({ json: input })),
    onSuccess: (data) => queryClient.setQueryData(ME_QUERY_KEY, data),
  });
}

// 修改名字、自我介绍：PATCH /api/me
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => parseResponse(api.me.$patch({ json: input })),
    onSuccess: (data) => queryClient.setQueryData(ME_QUERY_KEY, data),
  });
}
