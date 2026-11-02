import type { ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ApiError, toErrorBody } from "../lib/errors";

// 全局错误处理：所有错误都转换为统一的 { error: { code, message } } 格式
export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof ApiError) {
    return c.json(toErrorBody(err.code, err.message, err.details), err.status);
  }
  if (err instanceof HTTPException) {
    const code =
      err.status === 401 ? "UNAUTHORIZED" : err.status === 403 ? "FORBIDDEN" : "INTERNAL_ERROR";
    return c.json(toErrorBody(code, err.message), err.status);
  }

  // 未预料的错误：记录日志（可在 Workers Logs 中查看），不把细节返回给前端
  console.error("[unhandled error]", err);
  return c.json(toErrorBody("INTERNAL_ERROR", "服务器内部错误"), 500);
};

export const notFoundHandler: NotFoundHandler = (c) => {
  return c.json(toErrorBody("NOT_FOUND", `接口不存在：${c.req.method} ${c.req.path}`), 404);
};
