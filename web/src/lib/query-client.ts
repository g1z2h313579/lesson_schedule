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
