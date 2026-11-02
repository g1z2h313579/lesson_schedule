import { useQuery } from "@tanstack/react-query";
import { api, parseResponse } from "./client";

// 当前登录用户：GET /api/me
export function useMeQuery() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => parseResponse(api.me.$get()),
  });
}
