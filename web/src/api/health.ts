import { useQuery } from "@tanstack/react-query";
import { api, parseResponse } from "./client";

// 健康检查：GET /api/health
export function useHealthQuery() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => parseResponse(api.health.$get()),
  });
}
