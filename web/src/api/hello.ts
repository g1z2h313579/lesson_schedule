import type { HelloQuery } from "@shared/schemas/hello";
import { useQuery } from "@tanstack/react-query";
import { api, parseResponse } from "./client";

// 示例接口：GET /api/hello
export function useHelloQuery(query: HelloQuery = {}) {
  return useQuery({
    queryKey: ["hello", query],
    queryFn: () => parseResponse(api.hello.$get({ query })),
  });
}
