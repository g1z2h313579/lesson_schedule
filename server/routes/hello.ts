import { helloQuerySchema } from "@shared/schemas/hello";
import { Hono } from "hono";
import { validate } from "../lib/validator";
import type { AppEnv } from "../types";

// 示例接口：演示参数校验与 JSON 响应
export const helloRoutes = new Hono<AppEnv>().get("/", validate("query", helloQuerySchema), (c) => {
  const { name } = c.req.valid("query");
  return c.json({ message: `Hello, ${name}!` });
});
