import { idParamSchema } from "@shared/schemas/common";
import { Hono } from "hono";
import { validate } from "../lib/validator";
import { loadCurrentUser, requireAuth, requireRegistered } from "../middleware/auth";
import { createMessageService } from "../services/message-service";
import type { AppEnv } from "../types";

// 留言：删除自己发的留言（列表和发言在 /api/lessons/:id/messages）
export const messageRoutes = new Hono<AppEnv>()
  .use(requireAuth, loadCurrentUser, requireRegistered)
  .delete("/:id", validate("param", idParamSchema), async (c) => {
    await createMessageService(c.get("db")).remove(c.get("currentUser"), c.req.valid("param").id);
    return c.json({ ok: true as const });
  });
