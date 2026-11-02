// API 错误码：前端根据错误码显示对应语言的提示文字
export const API_ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFIG_ERROR",
  "INTERNAL_ERROR",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

// API 出错时统一返回的响应体
export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    // 面向开发者的说明（不直接展示给用户）
    message: string;
    details?: unknown;
  };
};
