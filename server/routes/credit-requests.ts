import { idParamSchema } from "@shared/schemas/common";
import { rejectCreditRequestSchema } from "@shared/schemas/credit-request";
import { Hono } from "hono";
import { validate } from "../lib/validator";
import { loadCurrentUser, requireAuth, requireRegistered } from "../middleware/auth";
import { createCreditService } from "../services/credit-service";
import type { AppEnv } from "../types";

// 课时申请的处理：老师确认 / 拒绝，学生撤回（申请本身在 /api/relations/:id/credit-requests）
export const creditRequestRoutes = new Hono<AppEnv>()
  .use(requireAuth, loadCurrentUser, requireRegistered)
  .post("/:id/approve", validate("param", idParamSchema), async (c) => {
    const result = await createCreditService(c.get("db"), c.get("notifier")).approve(
      c.get("currentUser"),
      c.req.valid("param").id,
      new Date(),
    );
    return c.json(result);
  })
  .post(
    "/:id/reject",
    validate("param", idParamSchema),
    validate("json", rejectCreditRequestSchema),
    async (c) => {
      const request = await createCreditService(c.get("db"), c.get("notifier")).reject(
        c.get("currentUser"),
        c.req.valid("param").id,
        c.req.valid("json").reason ?? null,
        new Date(),
      );
      return c.json({ request });
    },
  )
  .post("/:id/withdraw", validate("param", idParamSchema), async (c) => {
    const request = await createCreditService(c.get("db"), c.get("notifier")).withdraw(
      c.get("currentUser"),
      c.req.valid("param").id,
      new Date(),
    );
    return c.json({ request });
  });
