import { QueryClient } from "@tanstack/react-query";
import { DetailedError } from "hono/client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30 秒内重复访问同一数据时直接用缓存
      staleTime: 30_000,
      // 切回页面时不自动重新请求，避免老年用户看到页面闪动
      refetchOnWindowFocus: false,
      // 4xx（参数错误、未登录等）重试也没用，只对网络错误和 5xx 重试一次
      retry: (failureCount, error) => {
        if (error instanceof DetailedError && Number(error.statusCode) < 500) return false;
        return failureCount < 1;
      },
    },
  },
});

/**
 * 操作成功后让相关数据重新加载。
 * 数据量很小，简单起见除当前用户（me）以外全部重新加载，不逐个指定，避免漏掉。
 */
export function invalidateAppData(): Promise<void> {
  return queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== "me" });
}
