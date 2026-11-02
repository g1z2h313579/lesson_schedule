import { LINE_ACCESS_TOKEN_HEADER } from "@shared/constants/headers";
import { useQuery } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/liff";
import { api, parseResponse } from "./client";

// 当前登录用户：GET /api/me
// 附带 access token，后端据此同步 LINE 昵称和头像（只有这个接口需要）
export function useMeQuery() {
  return useQuery({
    queryKey: ["me"],
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
