import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import { z } from "zod";
import { ApiError } from "./errors";

// 请求参数校验：校验失败时抛出 ApiError，由全局错误处理统一返回 400
// 用法：.get("/", validate("query", someSchema), (c) => { const q = c.req.valid("query") })
export const validate = <T extends z.ZodType, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
) =>
  zValidator(target, schema, (result) => {
    if (!result.success) {
      throw new ApiError(400, "VALIDATION_ERROR", "请求参数不正确", z.flattenError(result.error));
    }
  });
