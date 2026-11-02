import type { AppType } from "@server/app";
import type { ApiErrorBody, ApiErrorCode } from "@shared/types/api";
import { DetailedError, hc } from "hono/client";
import { getIdToken, isLiffMock } from "@/lib/liff";

// 每次请求都带上 LINE ID token，后端据此识别用户
function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const idToken = getIdToken();
  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }
  if (isLiffMock && import.meta.env.VITE_MOCK_USER_ID) {
    // 本地开发时指定模拟用户（后端 AUTH_MOCK=true 时生效）
    headers["X-Mock-User-Id"] = import.meta.env.VITE_MOCK_USER_ID;
  }
  return headers;
}

/**
 * 类型安全的 API 客户端（Hono RPC）。
 * 用法：await parseResponse(api.hello.$get({ query: { name: "World" } }))
 * 接口路径、参数、返回值的类型都自动来自后端代码。
 */
export const api = hc<AppType>("/", { headers: buildHeaders }).api;

export { parseResponse } from "hono/client";

/** 从 API 错误中取出错误码，用于显示对应语言的提示 */
export function getApiErrorCode(error: unknown): ApiErrorCode | "NETWORK_ERROR" {
  if (error instanceof DetailedError) {
    const body = (error.detail as { data?: Partial<ApiErrorBody> } | undefined)?.data;
    return body?.error?.code ?? "INTERNAL_ERROR";
  }
  return "NETWORK_ERROR";
}
