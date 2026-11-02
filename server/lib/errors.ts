import type { ApiErrorBody, ApiErrorCode } from "@shared/types/api";
import type { ContentfulStatusCode } from "hono/utils/http-status";

// 业务错误：在任何地方抛出，都会由全局错误处理转换为统一格式的响应
export class ApiError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(
    status: ContentfulStatusCode,
    code: ApiErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function toErrorBody(code: ApiErrorCode, message: string, details?: unknown): ApiErrorBody {
  return { error: { code, message, ...(details === undefined ? {} : { details }) } };
}
